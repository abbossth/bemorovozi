"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { VoiceOrb, type OrbPhase, type VoiceOrbHandle } from "@/components/patient/VoiceOrb";
import { SpeechDetector, rmsToDb } from "@/lib/voice/vad";
import { createMicMeter, sampleAmbientDb, type MicMeter } from "@/lib/voice/micMeter";
import { blobToWav, needsWavConversion } from "@/lib/voice/wav";
import type { ChatMessage, Stage } from "@/lib/conversation/types";

// Voice is only a thin layer over the ONE conversation engine:
//   patient speech → STT → text → onUtterance(text)   (same call the text box makes)
//   every new assistant message (text) → TTS → played aloud
// There is no dialogue logic in here — it only listens, speaks, and reports transcripts.

type Phase = "connecting" | "listening" | "thinking" | "speaking" | "idle" | "denied" | "stuck";

type Props = {
  audioElRef: RefObject<HTMLAudioElement | null>;
  messages: ChatMessage[];
  /** changes on "Yangidan boshlash" so the greeting is spoken again */
  epoch: number;
  stage: Stage;
  /** the engine is working (e.g. submitting) */
  busy: boolean;
  /** Resolves true when the engine accepted the text and produced a reply. */
  onUtterance: (text: string) => Promise<boolean>;
  onSwitchToText: () => void;
};

const MAX_CONSECUTIVE_ERRORS = 3;
// Recordings whose transcript has no words (pure noise) before we give up and offer text instead.
const MAX_EMPTY_TRANSCRIPTS = 3;

// Speech vs. background noise is decided by SpeechDetector (adaptive noise floor,
// see src/lib/voice/vad.ts) — not by a fixed loudness threshold.
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

export function VoiceControls({ audioElRef, messages, epoch, stage, busy, onUtterance, onSwitchToText }: Props) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [ready, setReady] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [noSpeechHint, setNoSpeechHint] = useState(false);
  const [vadDebug, setVadDebug] = useState<string | null>(null);

  const activeRef = useRef(true);
  // Bumped on every mount/unmount. React StrictMode (dev) mounts, unmounts and re-mounts
  // effects, which would otherwise leave TWO startCall() runs alive at once.
  const generationRef = useRef(0);
  const orbApiRef = useRef<VoiceOrbHandle | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micMeterRef = useRef<MicMeter | null>(null);
  const detectorRef = useRef<SpeechDetector | null>(null);
  const ttsSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const emptyTranscriptsRef = useRef(0);

  // Playback bookkeeping: a new assistant message always wins over one still playing.
  const playIdRef = useRef(0);
  const speakResolveRef = useRef<(() => void) | null>(null);
  const spokenKeyRef = useRef<string | null>(null);

  // Latest props for use inside long-lived async callbacks.
  const stageRef = useRef(stage);
  const busyRef = useRef(busy);
  const onUtteranceRef = useRef(onUtterance);
  useEffect(() => {
    stageRef.current = stage;
    busyRef.current = busy;
    onUtteranceRef.current = onUtterance;
  });

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

  // Speak every NEW assistant message (greeting, questions, the confirmation prompt, refusals…).
  useEffect(() => {
    if (!ready) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const key = `${epoch}:${messages.length}`;
    if (spokenKeyRef.current === key) return;
    spokenKeyRef.current = key;
    void playAssistant(last.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, messages, epoch]);

  function teardown() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    discardRecorder();
    micMeterRef.current?.disconnect();
    micMeterRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopSpeaking();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    ttsSourceRef.current = null;
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
      setMicError("Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki yozib yuboring.");
      setPhase("denied");
      return;
    }

    await calibrateNoiseFloor();
    if (superseded()) return;
    setReady(true); // → the speak-every-new-assistant-message effect greets the patient
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
      onLevel(Math.sqrt(sum / data.length));
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
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => handleRecordingStopped(chunks, recorder.mimeType);
    recorderRef.current = recorder;
    recorder.start();
  }

  function discardRecorder() {
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
    recorderRef.current = null;
  }

  // Throws away everything recorded so far (room noise before the patient spoke)
  // and starts a fresh recording, without triggering the "recording finished" flow.
  function rollRecorder(stream: MediaStream) {
    discardRecorder();
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

  function endMeter() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    applyOrbScale(0);
    micMeterRef.current?.disconnect();
    micMeterRef.current = null;
    setVadDebug(null);
  }

  function startListening() {
    const stream = streamRef.current;
    if (!stream || !activeRef.current) return;
    // Never two listening sessions at once.
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    discardRecorder();
    micMeterRef.current?.disconnect();

    stoppingRef.current = false;
    setNoSpeechHint(false);
    setPhase("listening");

    beginRecorder(stream);

    const ctx = ensureAudioContext();
    if (!ctx) return; // no Web Audio: the patient ends the turn by tapping the orb

    const detector = detectorRef.current ?? (detectorRef.current = new SpeechDetector());
    detector.reset();
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
      // Only speech moves the orb — background noise doesn't make it react.
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

  function stopListening() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    endMeter();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  // Stops listening WITHOUT sending anything (a new assistant message is about to be spoken).
  function abortListening() {
    stoppingRef.current = true;
    endMeter();
    discardRecorder();
  }

  // Nobody spoke for a long time: drop the recording and offer retry / typing instead of hanging.
  function giveUpListening() {
    if (stoppingRef.current) return;
    abortListening();
    setMicError(null);
    setPhase("stuck");
  }

  async function handleRecordingStopped(chunks: Blob[], mimeType: string) {
    if (!activeRef.current) return;
    setPhase("thinking");
    try {
      // Label the recording with what the browser really produced (Chrome: webm, Safari: mp4). Anything
      // the STT provider can't read (Safari's mp4) is converted to WAV here first.
      let audio = new Blob(chunks, { type: mimeType || chunks[0]?.type || "audio/webm" });
      let fileName = audio.type.includes("ogg") ? "voice.ogg" : "voice.webm";
      if (needsWavConversion(audio.type)) {
        audio = await blobToWav(audio);
        fileName = "voice.wav";
      }
      const form = new FormData();
      form.append("audio", audio, fileName);
      const sttRes = await fetch("/api/voice/stt", { method: "POST", body: form });
      const sttData = await sttRes.json();
      if (!sttRes.ok) throw new Error(sttData.error ?? "Ovozni tanib bo'lmadi");
      if (!activeRef.current) return;

      // Noise that slipped through comes back as an empty (or wordless) transcript —
      // don't feed that to the engine as if the patient had said something.
      const heard = String(sttData.text ?? "").trim();
      if (!/\p{L}/u.test(heard)) {
        emptyTranscriptsRef.current += 1;
        if (emptyTranscriptsRef.current >= MAX_EMPTY_TRANSCRIPTS) setPhase("stuck");
        else startListening();
        return;
      }
      emptyTranscriptsRef.current = 0;
      consecutiveErrorsRef.current = 0;
      setMicError(null);

      // The transcript becomes an ordinary chat message. If the engine accepts it, the new
      // assistant message arrives via props and the effect above speaks it, then we listen again.
      const ok = await onUtteranceRef.current(heard);
      if (!activeRef.current) return;
      if (!ok) {
        consecutiveErrorsRef.current += 1; // the engine refused or failed; the parent shows why
        resumeAfterError();
      }
    } catch (e) {
      consecutiveErrorsRef.current += 1;
      setMicError(e instanceof Error ? e.message : "Xatolik yuz berdi");
      if (!activeRef.current) return;
      resumeAfterError(/429|rate.?limit/i.test(e instanceof Error ? e.message : "") ? 4000 : 400);
    }
  }

  function resumeAfterError(backoffMs = 600) {
    if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
      setPhase("stuck");
      return;
    }
    setTimeout(() => {
      if (activeRef.current && stageRef.current !== "done") startListening();
    }, backoffMs);
  }

  function stopSpeaking() {
    audioElRef.current?.pause();
    const resolve = speakResolveRef.current;
    speakResolveRef.current = null;
    resolve?.();
  }

  async function playAssistant(text: string) {
    const id = ++playIdRef.current;
    abortListening();
    stopSpeaking();
    await speak(text);
    // A newer message (or an interruption) took over while this one was playing.
    if (!activeRef.current || id !== playIdRef.current) return;
    if (stageRef.current === "gathering" && !busyRef.current) startListening();
    else setPhase("idle"); // card is showing: the patient answers with the buttons (or taps the orb to add more)
  }

  function speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      const audioEl = audioElRef.current;
      if (!audioEl) {
        resolve();
        return;
      }
      speakResolveRef.current = resolve;
      setPhase("speaking");
      fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => {
          // Interrupted (or replaced by a newer message) while the audio was being generated.
          if (!activeRef.current || speakResolveRef.current !== resolve) return;
          if (!buf) {
            // TTS is down: the reply is already on screen as text, so carry on silently.
            speakResolveRef.current = null;
            resolve();
            return;
          }
          audioEl.src = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));

          const ctx = ensureAudioContext();
          if (ctx) {
            if (!ttsSourceRef.current) {
              ttsSourceRef.current = ctx.createMediaElementSource(audioEl);
              ttsSourceRef.current.connect(ctx.destination);
            }
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            ttsSourceRef.current.connect(analyser);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            meterLoop(analyser, applyOrbScale);
          }

          const onEnded = () => {
            audioEl.removeEventListener("ended", onEnded);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            applyOrbScale(0);
            if (speakResolveRef.current === resolve) speakResolveRef.current = null;
            resolve();
          };
          audioEl.addEventListener("ended", onEnded);
          audioEl.play().catch(onEnded);
        })
        .catch(() => {
          if (speakResolveRef.current === resolve) speakResolveRef.current = null;
          resolve();
        });
    });
  }

  function handleOrbTap() {
    if (phase === "listening") {
      stopListening();
    } else if (phase === "speaking") {
      // Interrupt the assistant and let the patient talk.
      ++playIdRef.current;
      stopSpeaking();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      applyOrbScale(0);
      if (stageRef.current !== "done") startListening();
    } else if (phase === "idle") {
      startListening();
    }
  }

  function handleRetry() {
    consecutiveErrorsRef.current = 0;
    emptyTranscriptsRef.current = 0;
    setMicError(null);
    startListening();
  }

  const shown: Phase = busy && phase !== "speaking" && phase !== "denied" && phase !== "stuck" ? "thinking" : phase;

  const label: Record<Phase, string> = {
    connecting: "Ulanmoqda...",
    listening: "Tinglayapman...",
    thinking: "O'ylanmoqda...",
    speaking: "Gapirmoqda...",
    idle: "Javobingizni kutyapman",
    denied: "Mikrofon kerak",
    stuck: "Ovoz aniqlanmadi",
  };
  const hint: Record<Phase, string> = {
    connecting: "",
    listening: noSpeechHint ? "Sizni eshitmayapman. Mikrofonga yaqinroq gapiring" : "Tugatish uchun bosing yoki jim turing",
    thinking: "",
    speaking: "To'xtatib gapirish uchun bosing",
    idle: stage === "confirming" ? "Tugmani tanlang yoki qo'shish uchun bosing" : "Gapirish uchun bosing",
    denied: "Yozib yuborishingiz mumkin",
    stuck: "Atrof shovqinli bo'lishi mumkin",
  };

  const orbPhase: OrbPhase =
    shown === "listening"
      ? "listening"
      : shown === "thinking"
      ? "thinking"
      : shown === "speaking"
      ? "speaking"
      : shown === "denied" || shown === "stuck"
      ? "error"
      : "idle";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleOrbTap}
          disabled={shown === "thinking" || shown === "connecting" || shown === "denied" || shown === "stuck"}
          aria-label={shown === "listening" ? "Tugatish uchun bosing" : "Ovozli suhbat"}
          className="relative flex h-[76px] w-[76px] flex-shrink-0 items-center justify-center rounded-full disabled:cursor-default"
        >
          <VoiceOrb ref={orbApiRef} phase={orbPhase} size={76} />
        </button>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-bold text-ink">{label[shown]}</span>
          {micError && shown !== "stuck" ? (
            <span className="text-xs leading-relaxed text-coral">{micError}</span>
          ) : (
            <span className="text-xs leading-relaxed text-gray-500">{hint[shown]}</span>
          )}
          {vadDebug && shown === "listening" && <span className="font-mono text-[11px] text-gray-400">{vadDebug}</span>}
        </div>
      </div>

      {(shown === "stuck" || shown === "denied") && (
        <div className="flex gap-2">
          {shown === "stuck" && (
            <button
              type="button"
              onClick={handleRetry}
              className="flex-1 rounded-xl bg-teal py-2.5 font-heading text-sm font-bold text-white"
            >
              Qayta urinish
            </button>
          )}
          <button
            type="button"
            onClick={onSwitchToText}
            className="flex-1 rounded-xl border-[1.5px] border-gray-200 bg-white py-2.5 font-heading text-sm font-bold text-ink"
          >
            Yozib yuborish
          </button>
        </div>
      )}
    </div>
  );
}
