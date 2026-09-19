"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { VoiceOrb, type OrbPhase, type VoiceOrbHandle } from "@/components/patient/VoiceOrb";
import { SpeechDetector, rmsToDb } from "@/lib/voice/vad";
import { createMicMeter, sampleAmbientDb, type MicMeter } from "@/lib/voice/micMeter";

type VoiceTurn = { role: "ai" | "patient"; text: string };

type CallState = "connecting" | "listening" | "thinking" | "speaking" | "confirm" | "denied" | "stuck";

const MAX_CONSECUTIVE_ERRORS = 3;
// Recordings whose transcript has no words (pure noise) before we give up and offer text instead.
const MAX_EMPTY_TRANSCRIPTS = 3;

type Props = {
  departmentName: string;
  floorLabel?: string;
  audioElRef: RefObject<HTMLAudioElement | null>;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (transcript: string) => void;
  onExit: () => void;
};

const INITIAL_VOICE_TURN: VoiceTurn = {
  role: "ai",
  text: "Salom! Nima haqida gapirmoqchisiz?",
};

// Speech vs. background noise is decided by SpeechDetector (adaptive noise floor,
// see src/lib/voice/vad.ts) — not by a fixed loudness threshold, which in a noisy
// room never let the turn end and in a quiet one cut the patient off.
const CALIBRATION_MS = 500;
const MAX_UTTERANCE_MS = 25000;
// While nobody has spoken yet, keep only this much recent audio so long stretches
// of room noise are never uploaded to STT along with the actual answer.
const PREROLL_MS = 1500;
const NO_SPEECH_HINT_MS = 7000;
const NO_SPEECH_GIVEUP_MS = 30000;

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function VoiceCallScreen({ departmentName, floorLabel, audioElRef, submitting, submitError, onSubmit, onExit }: Props) {
  const [callState, setCallState] = useState<CallState>("connecting");
  const [voiceTurns, setVoiceTurns] = useState<VoiceTurn[]>([INITIAL_VOICE_TURN]);
  const [micError, setMicError] = useState<string | null>(null);
  const [noSpeechHint, setNoSpeechHint] = useState(false);
  const [vadDebug, setVadDebug] = useState<string | null>(null);

  const activeRef = useRef(true);
  // Bumped on every mount/unmount. React StrictMode (dev) mounts, unmounts and re-mounts
  // effects, which would otherwise leave TWO startCall() runs alive at once — two mic
  // streams, two greetings, two listening loops fighting over the same refs.
  const generationRef = useRef(0);
  const orbApiRef = useRef<VoiceOrbHandle | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micMeterRef = useRef<MicMeter | null>(null);
  const detectorRef = useRef<SpeechDetector | null>(null);
  const emptyTranscriptsRef = useRef(0);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);

  useEffect(() => {
    activeRef.current = true;
    const generation = ++generationRef.current;
    startCall(generation);
    return () => {
      // A counter, not a DOM ref — reading the latest value here is the point.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generationRef.current++;
      activeRef.current = false;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function teardown() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* already stopped */
      }
    }
    micMeterRef.current?.disconnect();
    micMeterRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioElRef.current?.pause();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  function ensureAudioContext(): AudioContext | null {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    const ctx = new Ctor();
    audioCtxRef.current = ctx;
    return ctx;
  }

  async function startCall(generation: number) {
    const superseded = () => generation !== generationRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (superseded()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
    } catch {
      if (superseded()) return;
      setMicError("Mikrofonga ruxsat berilmadi. Iltimos, brauzer sozlamalaridan ruxsat bering.");
      setCallState("denied");
      return;
    }

    await calibrateNoiseFloor();
    if (superseded()) return;

    await speak(INITIAL_VOICE_TURN.text);
    if (superseded()) return;
    startListening();
  }

  // Listens to the room for a moment before the assistant speaks, so the detector
  // starts out knowing how noisy this particular place is.
  async function calibrateNoiseFloor() {
    const stream = streamRef.current;
    const ctx = ensureAudioContext();
    if (!stream || !ctx) return;
    try {
      if (ctx.state === "suspended") await ctx.resume();
      const meter = createMicMeter(ctx, stream);
      const samples = await sampleAmbientDb(meter, CALIBRATION_MS, () => !activeRef.current);
      meter.disconnect();
      if (!detectorRef.current) detectorRef.current = new SpeechDetector();
      detectorRef.current.calibrate(samples);
    } catch {
      /* detector keeps its default floor and adapts on its own */
    }
  }

  // Drives the orb from the assistant's own voice while it speaks (mic input uses micLoop).
  function meterLoop(analyser: AnalyserNode, onLevel: (rms: number) => void) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!activeRef.current) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      onLevel(rms);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function applyOrbScale(rms: number) {
    orbApiRef.current?.setLevel(rms);
  }

  function beginRecorder(stream: MediaStream) {
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    chunksRef.current = chunks;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => handleRecordingStopped(chunks);
    recorderRef.current = recorder;
    recorder.start();
  }

  // Throws away everything recorded so far (room noise before the patient spoke)
  // and starts a fresh recording, without triggering the "recording finished" flow.
  function rollRecorder(stream: MediaStream) {
    const old = recorderRef.current;
    if (old && old.state !== "inactive") {
      old.onstop = null;
      old.ondataavailable = null;
      try {
        old.stop();
      } catch {
        /* already stopped */
      }
    }
    beginRecorder(stream);
  }

  function micLoop(meter: MicMeter, onFrame: (rms: number, db: number) => void) {
    const tick = () => {
      if (!activeRef.current || stoppingRef.current) return;
      const rms = meter.readRms();
      onFrame(rms, rmsToDb(rms));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function startListening() {
    const stream = streamRef.current;
    if (!stream || !activeRef.current) return;
    stoppingRef.current = false;
    setNoSpeechHint(false);
    setCallState("listening");

    beginRecorder(stream);

    const ctx = ensureAudioContext();
    if (!ctx) return; // no Web Audio: the patient ends the turn by tapping the orb

    const detector = detectorRef.current ?? (detectorRef.current = new SpeechDetector());
    detector.reset();
    micMeterRef.current?.disconnect();
    const meter = createMicMeter(ctx, stream);
    micMeterRef.current = meter;

    const debug = new URLSearchParams(window.location.search).has("vadDebug");
    const listenStart = performance.now();
    let lastRoll = listenStart;
    let speechStartedAt = 0;
    let hintShown = false;
    let lastDebugAt = 0;

    micLoop(meter, (rms, db) => {
      const now = performance.now();
      const frame = detector.update(db, now);
      // Only speech moves the orb — background noise no longer makes it react.
      applyOrbScale(frame.voiced ? rms : 0);

      if (debug && now - lastDebugAt > 150) {
        lastDebugAt = now;
        setVadDebug(
          `db ${db.toFixed(0)} · shovqin ${frame.noiseFloorDb.toFixed(0)} · ${frame.speaking ? "GAP" : frame.voiced ? "gap?" : "-"}`
        );
      }

      if (frame.event === "speech_start") {
        speechStartedAt = now;
        if (hintShown) {
          hintShown = false;
          setNoSpeechHint(false);
        }
      } else if (frame.event === "noise_burst" || frame.event === "noise_cancel") {
        speechStartedAt = 0;
      } else if (frame.event === "speech_end") {
        stopListening();
        return;
      }

      if (speechStartedAt) {
        if (now - speechStartedAt > MAX_UTTERANCE_MS) stopListening();
        return;
      }

      // Nobody speaking yet: never end the turn on silence, just don't hoard noise.
      if (!detector.pending && now - lastRoll > PREROLL_MS) {
        rollRecorder(stream);
        lastRoll = now;
      }
      const waited = now - listenStart;
      if (!hintShown && waited > NO_SPEECH_HINT_MS) {
        hintShown = true;
        setNoSpeechHint(true);
      }
      if (waited > NO_SPEECH_GIVEUP_MS) giveUpListening();
    });
  }

  function endMeter() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    applyOrbScale(0);
    micMeterRef.current?.disconnect();
    micMeterRef.current = null;
    setVadDebug(null);
  }

  function stopListening() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    endMeter();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  // Nobody spoke for a long time: drop the recording and offer retry / typing instead of hanging.
  function giveUpListening() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    endMeter();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }
    setMicError(null);
    setCallState("stuck");
  }

  async function handleRecordingStopped(chunks: Blob[]) {
    if (!activeRef.current) return;
    setCallState("thinking");
    try {
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", audioBlob, "voice.webm");
      const sttRes = await fetch("/api/voice/stt", { method: "POST", body: form });
      const sttData = await sttRes.json();
      if (!sttRes.ok) throw new Error(sttData.error ?? "Ovozni tanib bo'lmadi");
      if (!activeRef.current) return;

      // Noise that slipped through comes back as an empty (or wordless) transcript —
      // don't feed that to the assistant as if the patient had said something.
      const heard = String(sttData.text ?? "").trim();
      if (!/\p{L}/u.test(heard)) {
        emptyTranscriptsRef.current += 1;
        if (emptyTranscriptsRef.current >= MAX_EMPTY_TRANSCRIPTS) {
          setCallState("stuck");
        } else {
          startListening();
        }
        return;
      }
      emptyTranscriptsRef.current = 0;

      const nextHistory: VoiceTurn[] = [...voiceTurns, { role: "patient", text: heard }];
      setVoiceTurns(nextHistory);

      const turnRes = await fetch("/api/voice/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextHistory }),
      });
      const turnData = await turnRes.json();
      if (!turnRes.ok) throw new Error(turnData.error ?? "Yordamchi javob bera olmadi");
      if (!activeRef.current) return;

      const finalHistory: VoiceTurn[] = [...nextHistory, { role: "ai", text: turnData.reply }];
      setVoiceTurns(finalHistory);

      consecutiveErrorsRef.current = 0;
      setMicError(null);
      await speak(turnData.reply);
      if (!activeRef.current) return;

      if (turnData.done) {
        setCallState("confirm");
      } else {
        startListening();
      }
    } catch (e) {
      consecutiveErrorsRef.current += 1;
      const message = e instanceof Error ? e.message : "Xatolik yuz berdi";
      setMicError(message);
      if (!activeRef.current) return;
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        setCallState("stuck");
      } else {
        // A rate limit means retrying instantly would just extend the outage —
        // give the provider a moment before the next turn tries again.
        const backoffMs = /429|rate.?limit/i.test(message) ? 4000 : 400;
        setTimeout(() => {
          if (activeRef.current) startListening();
        }, backoffMs);
      }
    }
  }

  function speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      const audioEl = audioElRef.current;
      if (!audioEl) {
        resolve();
        return;
      }
      setCallState("speaking");
      fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => {
          if (!activeRef.current || !buf) {
            resolve();
            return;
          }
          const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
          audioEl.src = url;

          const ctx = ensureAudioContext();
          if (ctx) {
            if (!ttsSourceRef.current) {
              ttsSourceRef.current = ctx.createMediaElementSource(audioEl);
              ttsSourceRef.current.connect(ctx.destination);
            }
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            ttsSourceRef.current.connect(analyser);
            ttsAnalyserRef.current = analyser;
            meterLoop(analyser, applyOrbScale);
          }

          const onEnded = () => {
            audioEl.removeEventListener("ended", onEnded);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            applyOrbScale(0);
            resolve();
          };
          audioEl.addEventListener("ended", onEnded);
          audioEl.play().catch(() => {
            onEnded();
          });
        })
        .catch(() => resolve());
    });
  }

  function interruptSpeaking() {
    audioElRef.current?.pause();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    applyOrbScale(0);
    startListening();
  }

  function handleOrbTap() {
    if (callState === "listening") stopListening();
    else if (callState === "speaking") interruptSpeaking();
  }

  function handleConfirmSend() {
    const transcript = voiceTurns.map((t) => `${t.role === "ai" ? "Yordamchi" : "Bemor"}: ${t.text}`).join("\n");
    onSubmit(transcript);
  }

  function handleContinueTalking() {
    startListening();
  }

  function handleRetry() {
    consecutiveErrorsRef.current = 0;
    emptyTranscriptsRef.current = 0;
    setMicError(null);
    startListening();
  }

  const lastPatientTurn = [...voiceTurns].reverse().find((t) => t.role === "patient");
  const lastAiTurn = [...voiceTurns].reverse().find((t) => t.role === "ai");

  const stateLabel: Record<CallState, string> = {
    connecting: "Ulanmoqda...",
    listening: "Tinglayapman...",
    thinking: "O'ylanmoqda...",
    speaking: "Gapirmoqda...",
    confirm: "Muammo aniqlandi",
    denied: "Mikrofon kerak",
    stuck: "Ovoz aniqlanmadi",
  };

  const orbPhase: OrbPhase =
    callState === "listening"
      ? "listening"
      : callState === "thinking"
      ? "thinking"
      : callState === "speaking"
      ? "speaking"
      : callState === "denied" || callState === "stuck"
      ? "error"
      : "idle";

  return (
    <div className="flex min-h-[520px] w-full flex-col px-6 py-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-teal-tint px-3 py-1.5 text-xs font-semibold text-teal">
          {departmentName}
          {floorLabel ? ` · ${floorLabel}` : ""}
        </span>
        <button
          type="button"
          onClick={onExit}
          aria-label="Ovozli suhbatni yopish"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F3F2] text-gray-500 transition hover:bg-gray-200"
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {callState !== "confirm" ? (
        <div className="flex flex-grow flex-col items-center justify-center gap-5">
          <button
            type="button"
            onClick={handleOrbTap}
            disabled={callState === "thinking" || callState === "connecting" || callState === "denied" || callState === "stuck"}
            aria-label={callState === "listening" ? "Tugatish uchun bosing" : "Ovozli suhbat"}
            className="relative flex h-[160px] w-[160px] items-center justify-center rounded-full disabled:cursor-default"
          >
            <VoiceOrb ref={orbApiRef} phase={orbPhase} size={160} />
            {callState === "denied" && (
              <svg
                viewBox="0 0 24 24"
                width={40}
                height={40}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={2}
                className="pointer-events-none absolute inset-0 m-auto drop-shadow-md"
              >
                <path d="M9 2h6v11a3 3 0 0 1-6 0V2z" strokeLinecap="round" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16" strokeLinecap="round" />
              </svg>
            )}
            {callState === "stuck" && (
              <svg
                viewBox="0 0 24 24"
                width={36}
                height={36}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={2}
                className="pointer-events-none absolute inset-0 m-auto drop-shadow-md"
              >
                <path d="M12 8v5M12 16.5h.01" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
          </button>

          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-sm font-bold text-ink">{stateLabel[callState]}</span>
            {micError && callState !== "stuck" ? (
              <span className="max-w-[260px] text-xs leading-relaxed text-coral">{micError}</span>
            ) : (
              <span className="text-xs text-gray-500">
                {callState === "listening"
                  ? noSpeechHint
                    ? "Sizni eshitmayapman. Mikrofonga yaqinroq gapiring"
                    : "Tugatish uchun bosing yoki jim turing"
                  : callState === "speaking"
                  ? "To'xtatib gapirish uchun bosing"
                  : callState === "denied"
                  ? "Sahifani yangilab qayta urinib ko'ring"
                  : callState === "stuck"
                  ? "Ovozingiz aniqlanmadi. Atrof shovqinli bo'lishi mumkin"
                  : ""}
              </span>
            )}
          </div>

          {vadDebug && callState === "listening" && (
            <span className="font-mono text-[11px] text-gray-400">{vadDebug}</span>
          )}

          {callState === "stuck" && (
            <div className="flex w-full max-w-[260px] flex-col gap-2.5">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full rounded-xl bg-teal py-3 font-heading text-sm font-bold text-white"
              >
                Qayta urinish
              </button>
              <button
                type="button"
                onClick={onExit}
                className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white py-3 font-heading text-sm font-bold text-ink"
              >
                Yozib yuborish
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-grow flex-col justify-center gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-tint">
              <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#0F6E5C" strokeWidth={2}>
                <path d="M6 12.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="font-heading text-lg font-extrabold text-ink">Muammo aniqlandi</h2>
            <p className="text-xs text-gray-500">Yuborishdan oldin tekshirib chiqing</p>
          </div>

          <div className="flex flex-col gap-2">
            {lastPatientTurn && (
              <div className="ml-auto max-w-[85%] rounded-2xl bg-teal px-3.5 py-2.5 text-sm leading-relaxed text-white">
                {lastPatientTurn.text}
              </div>
            )}
            {lastAiTurn && (
              <div className="mr-auto max-w-[85%] rounded-2xl bg-[#F7F9F8] px-3.5 py-2.5 text-sm leading-relaxed text-ink">
                {lastAiTurn.text}
              </div>
            )}
          </div>

          {submitError && <p className="rounded-lg bg-coral-tint px-3 py-2 text-[13px] text-coral">{submitError}</p>}

          <div className="mt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleConfirmSend}
              disabled={submitting}
              className="w-full rounded-xl bg-teal py-3.5 font-heading text-[15px] font-bold text-white disabled:opacity-60"
            >
              {submitting ? "Yuborilmoqda..." : "Ha, yuborish"}
            </button>
            <button
              type="button"
              onClick={handleContinueTalking}
              disabled={submitting}
              className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white py-3.5 font-heading text-[15px] font-bold text-ink disabled:opacity-60"
            >
              Yo&apos;q, davom etaman
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
