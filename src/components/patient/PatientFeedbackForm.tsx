"use client";

import { useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { VoiceCallScreen } from "@/components/patient/VoiceCallScreen";

// A near-silent WAV, used only to "unlock" audio playback on iOS Safari/Chrome
// (both WebKit) — they refuse programmatic .play() unless it's tied to a real
// user gesture. Playing this on the same tap that opens the voice call grants
// that gesture to the <audio> element; every later AI reply is played on that
// same element, including ones queued well after the tap (STT/AI/TTS round trips).
const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

type Props = {
  hospitalId: string;
  departmentId: string;
  departmentName: string;
  floorLabel?: string;
};

export function PatientFeedbackForm({ hospitalId, departmentId, departmentName, floorLabel }: Props) {
  const [stage, setStage] = useState<"form" | "sent">("form");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);

  const [dictating, setDictating] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const dictationRecorderRef = useRef<MediaRecorder | null>(null);
  const dictationChunksRef = useRef<Blob[]>([]);
  const dictationBaseRef = useRef("");
  const dictationSeqRef = useRef(0);
  const dictationInFlightRef = useRef(false);
  const dictationStoppingRef = useRef(false);

  async function submitTranscript(transcript: string, channel: "text" | "voice") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId, departmentId, channel, transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik yuz berdi");
      setTrackingCode(data.trackingCode);
      setStage("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  function handleTextSubmit() {
    if (message.trim().length < 3) return;
    submitTranscript(message.trim(), "text");
  }

  function reset() {
    setStage("form");
    setMessage("");
    setMode("text");
    setError(null);
  }

  // The STT endpoint only accepts one complete clip per request (no streaming
  // support), so "live" dictation is approximated by re-transcribing the whole
  // growing recording every couple of seconds and replacing the preview with
  // the fresher, more complete result — rather than a single request at the end.
  const DICTATION_TICK_MS = 2200;

  async function transcribeBlob(blob: Blob): Promise<string> {
    const form = new FormData();
    form.append("audio", blob, "voice.webm");
    const res = await fetch("/api/voice/stt", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Ovozni tanib bo'lmadi");
    return data.text as string;
  }

  function applyDictationText(text: string, seq: number) {
    if (seq < dictationSeqRef.current) return; // a fresher result already landed
    const base = dictationBaseRef.current;
    setMessage(base ? `${base} ${text}` : text);
  }

  async function transcribeInterim() {
    if (dictationInFlightRef.current || dictationChunksRef.current.length === 0) return;
    dictationInFlightRef.current = true;
    const seq = ++dictationSeqRef.current;
    try {
      const blob = new Blob(dictationChunksRef.current, { type: "audio/webm" });
      const text = await transcribeBlob(blob);
      if (text) applyDictationText(text, seq);
    } catch {
      // interim failures stay silent — the final stop-transcription is authoritative
    } finally {
      dictationInFlightRef.current = false;
    }
  }

  async function toggleDictation() {
    if (dictating) {
      dictationStoppingRef.current = true;
      dictationRecorderRef.current?.stop();
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      dictationChunksRef.current = [];
      dictationBaseRef.current = message.trim();
      dictationSeqRef.current = 0;
      dictationStoppingRef.current = false;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) dictationChunksRef.current.push(e.data);
        if (!dictationStoppingRef.current) transcribeInterim();
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setDictating(false);
        setTranscribing(true);
        try {
          const blob = new Blob(dictationChunksRef.current, { type: "audio/webm" });
          const seq = ++dictationSeqRef.current;
          const text = await transcribeBlob(blob);
          if (text) applyDictationText(text, seq);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
        } finally {
          setTranscribing(false);
        }
      };
      dictationRecorderRef.current = recorder;
      recorder.start(DICTATION_TICK_MS);
      setDictating(true);
    } catch {
      setError("Mikrofonga ruxsat berilmadi");
    }
  }

  function openVoiceCall() {
    // Must run synchronously inside this tap handler — this is what grants the
    // shared <audio> element permission to play() later on iOS, after async
    // STT/AI/TTS round trips that happen well outside any user gesture.
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = SILENT_WAV;
    audioRef.current.play().catch(() => {});
    setVoiceReady(true);
    setError(null);
    setMode("voice");
  }

  if (stage === "sent") {
    return (
      <div className="flex w-full max-w-[390px] flex-col items-center gap-4 px-6 py-10 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-teal-tint">
          <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="#0F6E5C" strokeWidth={2}>
            <path d="M6 12.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Rahmat!</h1>
        <p className="max-w-[280px] text-[15px] leading-relaxed text-gray-500">
          Xabaringiz qabul qilindi va tegishli bo&apos;limga yuborildi.
        </p>
        <div className="mt-2 flex w-full flex-col gap-1 rounded-2xl bg-teal-tint p-5">
          <span className="text-[13px] text-gray-600">Kuzatish kodingiz</span>
          <span className="font-heading text-[28px] font-extrabold text-teal">{trackingCode}</span>
          <span className="mt-1 text-xs text-gray-500">
            Ushbu kod orqali holatni istalgan vaqt tekshirishingiz mumkin.
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="mt-5 w-full rounded-2xl border border-gray-200 bg-white py-3.5 font-heading text-[15px] font-bold text-ink transition hover:bg-gray-50"
        >
          Yana xabar yuborish
        </button>
      </div>
    );
  }

  if (mode === "voice" && voiceReady) {
    return (
      <VoiceCallScreen
        departmentName={departmentName}
        floorLabel={floorLabel}
        audioElRef={audioRef}
        submitting={submitting}
        submitError={error}
        onSubmit={(transcript) => submitTranscript(transcript, "voice")}
        onExit={() => setMode("text")}
      />
    );
  }

  return (
    <div className="flex w-full max-w-[390px] flex-col px-6 py-8">
      <div className="mb-5 flex justify-center">
        <LogoMark size={34} />
      </div>

      <div className="mb-6 flex flex-col items-center gap-1.5 text-center">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-ink">Fikringizni bildiring</h1>
        <p className="text-[13px] text-gray-400">To&apos;liq anonim. Ism so&apos;ralmaydi.</p>
        <span className="mt-2 rounded-full bg-teal-tint px-3 py-1.5 text-xs font-semibold text-teal">
          {departmentName}
          {floorLabel ? ` · ${floorLabel}` : ""}
        </span>
      </div>

      {error && <p className="mb-3 rounded-xl bg-coral-tint px-3.5 py-2.5 text-[13px] text-coral">{error}</p>}

      <div className="flex flex-grow flex-col justify-center gap-4">
        <div className="flex flex-col gap-2 rounded-3xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus-within:border-teal">
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nima haqida xabar bermoqchisiz?"
            rows={5}
            className="w-full resize-none bg-transparent px-1.5 pt-1 text-[15px] leading-relaxed text-ink outline-none placeholder:text-gray-400"
          />
          <div className="flex items-center justify-between px-1 pb-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleDictation}
                disabled={transcribing}
                aria-label={dictating ? "Yozishni to'xtatish" : "Ovozdan matnga o'girish"}
                className="flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-50"
                style={{
                  color: dictating ? "#E5534B" : "#9CA3AF",
                  background: dictating ? "#FCEBEA" : "transparent",
                }}
              >
                {transcribing ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" />
                ) : (
                  <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth={1.8}>
                    {dictating ? (
                      <rect x="7" y="7" width="10" height="10" rx="2" />
                    ) : (
                      <>
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={openVoiceCall}
                aria-label="AI bilan ovozli suhbat"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-90"
                style={{ background: "linear-gradient(160deg, #5B8DEF 0%, #3D6BE0 100%)" }}
              >
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 12v.5M8 9v6M12 6v12M16 9v6M20 12v.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={message.trim().length < 3 || submitting}
              aria-label="Yuborish"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-teal text-white transition disabled:bg-gray-200 disabled:text-gray-400"
            >
              {submitting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs leading-relaxed text-gray-400">
          Yozing, ovozdan matnga o&apos;girish uchun mikrofonga bosing, yoki AI bilan ovozli suhbatlashing — sun&apos;iy
          intellekt xabaringizni avtomatik tahlil qilib, tegishli bo&apos;limga yo&apos;naltiradi.
        </p>
      </div>

      <p className="mt-6 text-center text-[11px] text-gray-300">
        Hech qanday shaxsiy ma&apos;lumot so&apos;ralmaydi yoki saqlanmaydi.
      </p>
    </div>
  );
}
