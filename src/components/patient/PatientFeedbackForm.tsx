"use client";

import { useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";

type VoiceTurn = { role: "ai" | "patient"; text: string };

// A near-silent WAV, used only to "unlock" audio playback on iOS Safari/Chrome
// (both WebKit) — they refuse programmatic .play() unless it's tied to a real
// user gesture. Playing this on the same tap that starts/stops recording
// grants that gesture to the <audio> element; the actual AI reply is played
// on that same element later, once STT+AI+TTS round trips have finished.
const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

type Props = {
  hospitalId: string;
  departmentId: string;
  departmentName: string;
  floorLabel?: string;
};

const INITIAL_VOICE_TURN: VoiceTurn = {
  role: "ai",
  text: "Salom! Nima haqida gapirmoqchisiz? Gapiring, men tinglayapman.",
};

export function PatientFeedbackForm({ hospitalId, departmentId, departmentName, floorLabel }: Props) {
  const [stage, setStage] = useState<"form" | "sent">("form");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState("");

  const [voiceTurns, setVoiceTurns] = useState<VoiceTurn[]>([INITIAL_VOICE_TURN]);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function submitTranscript(transcript: string, channel: "text" | "voice") {
    setSubmitting(true);
    setError(null);
    const submitStart = performance.now();
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId, departmentId, channel, transcript }),
      });
      const data = await res.json();
      console.log(`[timing] client.submitFeedback.${channel} ${Math.round(performance.now() - submitStart)}ms`);
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
    setVoiceTurns([INITIAL_VOICE_TURN]);
    setVoiceDone(false);
    setError(null);
  }

  async function handleMicTap() {
    // Must run synchronously inside the tap handler — this is what grants the
    // element permission to play() later on iOS, after the async STT/AI/TTS chain.
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = SILENT_WAV;
    audioRef.current.play().catch(() => {});

    if (voiceDone) {
      const transcript = voiceTurns.map((t) => `${t.role === "ai" ? "Yordamchi" : "Bemor"}: ${t.text}`).join("\n");
      await submitTranscript(transcript, "voice");
      return;
    }
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setVoiceBusy(true);
        setError(null);
        // Diagnostic-only timing (see BOSQICH 1 profiling pass) — logs the
        // client-perceived duration of each network round trip in this chain.
        const recordingStoppedAt = performance.now();
        try {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          const form = new FormData();
          form.append("audio", audioBlob, "voice.webm");
          const sttStart = performance.now();
          const sttRes = await fetch("/api/voice/stt", { method: "POST", body: form });
          const sttData = await sttRes.json();
          console.log(`[timing] client.stt ${Math.round(performance.now() - sttStart)}ms`);
          if (!sttRes.ok) throw new Error(sttData.error ?? "Ovozni tanib bo'lmadi");

          const nextHistory: VoiceTurn[] = [...voiceTurns, { role: "patient", text: sttData.text }];
          setVoiceTurns(nextHistory);

          const turnStart = performance.now();
          const turnRes = await fetch("/api/voice/turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ history: nextHistory }),
          });
          const turnData = await turnRes.json();
          console.log(`[timing] client.turn ${Math.round(performance.now() - turnStart)}ms`);
          if (!turnRes.ok) throw new Error(turnData.error ?? "Yordamchi javob bera olmadi");

          setVoiceTurns([...nextHistory, { role: "ai", text: turnData.reply }]);
          setVoiceDone(Boolean(turnData.done));
          console.log(
            `[timing] client.sttPlusTurn.total ${Math.round(performance.now() - recordingStoppedAt)}ms (recording-stop to reply-visible)`
          );

          // Best-effort playback — voice mode still works via the chat transcript if TTS isn't configured.
          const ttsStart = performance.now();
          fetch("/api/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: turnData.reply }),
          })
            .then((r) => (r.ok ? r.arrayBuffer() : null))
            .then((buf) => {
              console.log(`[timing] client.tts ${Math.round(performance.now() - ttsStart)}ms`);
              if (!buf || !audioRef.current) return;
              const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
              audioRef.current.src = url;
              audioRef.current.play().catch(() => {});
            })
            .catch(() => {});
        } catch (e) {
          setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
        } finally {
          setVoiceBusy(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Mikrofonga ruxsat berilmadi");
    }
  }

  if (stage === "sent") {
    return (
      <div className="flex w-full max-w-[390px] flex-col items-center gap-4 px-6 py-8 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-teal-tint">
          <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="#0F6E5C" strokeWidth={2}>
            <path d="M6 12.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Rahmat!</h1>
        <p className="max-w-[280px] text-[15px] leading-relaxed text-gray-500">
          Xabaringiz qabul qilindi va tegishli bo&apos;limga yuborildi.
        </p>
        <div className="mt-2 flex w-full flex-col gap-1 rounded-xl bg-teal-tint p-5">
          <span className="text-[13px] text-gray-600">Kuzatish kodingiz</span>
          <span className="font-heading text-[28px] font-extrabold text-teal">{trackingCode}</span>
          <span className="mt-1 text-xs text-gray-500">
            Ushbu kod orqali holatni istalgan vaqt tekshirishingiz mumkin.
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="mt-5 w-full rounded-xl border-[1.5px] border-gray-200 bg-white py-3.5 font-heading text-[15px] font-bold text-ink"
        >
          Yana xabar yuborish
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[390px] flex-col px-6 py-8">
      <div className="mb-4 flex justify-center">
        <LogoMark size={34} />
      </div>

      <div className="mb-4 flex flex-col items-center gap-1.5 text-center">
        <h1 className="font-heading text-[22px] font-extrabold text-ink">Fikringizni bildiring</h1>
        <p className="text-[13px] text-gray-500">To&apos;liq anonim. Ism so&apos;ralmaydi.</p>
        <span className="mt-2 rounded-full bg-teal-tint px-3 py-1.5 text-xs font-semibold text-teal">
          {departmentName}
          {floorLabel ? ` · ${floorLabel}` : ""}
        </span>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-[#F7F9F8] p-1">
        <button
          type="button"
          onClick={() => setMode("text")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 font-heading text-[13px] font-bold"
          style={{ background: mode === "text" ? "#FFFFFF" : "transparent", color: mode === "text" ? "#0F6E5C" : "#6B7280" }}
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Yozib yuborish
        </button>
        <button
          type="button"
          onClick={() => setMode("voice")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 font-heading text-[13px] font-bold"
          style={{ background: mode === "voice" ? "#FFFFFF" : "transparent", color: mode === "voice" ? "#0F6E5C" : "#6B7280" }}
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ovozli suhbat
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-coral-tint px-3 py-2 text-[13px] text-coral">{error}</p>}

      {mode === "text" ? (
        <>
          <div className="flex flex-grow flex-col gap-2">
            <label htmlFor="message" className="text-[13px] font-semibold text-ink">
              Xabaringiz
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nima haqida xabar bermoqchisiz?"
              className="min-h-[140px] w-full resize-none rounded-xl border border-gray-200 p-4 text-[15px] leading-relaxed text-ink outline-none focus:border-teal"
            />
            <p className="text-xs leading-relaxed text-gray-500">
              Sun&apos;iy intellekt xabaringizni avtomatik tahlil qilib, tegishli bo&apos;limga yo&apos;naltiradi.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={message.trim().length < 3 || submitting}
              className="w-full rounded-xl bg-teal py-4 font-heading text-base font-bold text-white disabled:opacity-50"
            >
              {submitting ? "Yuborilmoqda..." : "Yuborish"}
            </button>
            <p className="text-center text-[11px] text-gray-400">
              Hech qanday shaxsiy ma&apos;lumot so&apos;ralmaydi yoki saqlanmaydi.
            </p>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-grow flex-col gap-3.5">
          <p className="text-center text-xs leading-relaxed text-gray-500">
            AI yordamchi sizni tinglaydi va muammoingizni tegishli bo&apos;limga yo&apos;naltiradi.
          </p>
          <div className="flex flex-grow flex-col gap-2.5 overflow-y-auto px-0.5 py-1">
            {voiceTurns.map((turn, i) => (
              <div key={i} className="flex" style={{ justifyContent: turn.role === "ai" ? "flex-start" : "flex-end" }}>
                <div
                  className="max-w-[78%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed"
                  style={{
                    background: turn.role === "ai" ? "#F7F9F8" : "#0F6E5C",
                    color: turn.role === "ai" ? "#16181D" : "#FFFFFF",
                  }}
                >
                  {turn.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2.5 pt-1.5">
            <button
              type="button"
              onClick={handleMicTap}
              disabled={voiceBusy || submitting}
              aria-label="Gapirish uchun bosing"
              className={`flex h-[68px] w-[68px] items-center justify-center rounded-full bg-teal disabled:opacity-60 ${
                !recording && !voiceBusy ? "animate-mic-pulse" : ""
              }`}
            >
              <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="#FFFFFF" strokeWidth={2}>
                {recording ? <rect x="7" y="7" width="10" height="10" rx="2" /> : (
                  <>
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
              </svg>
            </button>
            <span className="text-xs font-semibold text-gray-500">
              {voiceBusy
                ? "Tahlil qilinmoqda..."
                : recording
                ? "Tugatish uchun bosing"
                : voiceDone
                ? "Xabarni yuborish uchun bosing"
                : "Gapirish uchun bosing"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
