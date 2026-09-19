"use client";

import { useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { ConversationView } from "@/components/patient/ConversationView";
import { TextComposer } from "@/components/patient/TextComposer";
import { VoiceControls } from "@/components/patient/VoiceControls";
import { useConversation } from "@/components/patient/useConversation";
import type { ConversationView as View } from "@/lib/conversation/types";

// A near-silent WAV, used only to "unlock" audio playback on iOS Safari/Chrome
// (both WebKit) — they refuse programmatic .play() unless it's tied to a real
// user gesture. Playing this on the same tap that opens voice mode grants
// that gesture to the <audio> element; every later assistant reply is played on that
// same element, including ones queued well after the tap (AI/TTS round trips).
const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

type Props = {
  departmentName: string;
  floorLabel?: string;
  initialToken: string;
  initialView: View;
};

/**
 * The patient's whole experience: one chat, two ways to talk into it. Text and voice share
 * the same conversation (same engine, same transcript, same confirmation card) — switching
 * mode never restarts or forks anything.
 */
export function PatientFeedbackForm({ departmentName, floorLabel, initialToken, initialView }: Props) {
  const conv = useConversation({ token: initialToken, view: initialView });
  const [mode, setMode] = useState<"text" | "voice">("text");
  const usedVoiceRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function openVoice() {
    // Must run synchronously inside this tap handler — this is what grants the
    // shared <audio> element permission to play() later on iOS.
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = SILENT_WAV;
    audioRef.current.play().catch(() => {});
    setMode("voice");
  }

  async function sendFromVoice(text: string) {
    usedVoiceRef.current = true;
    return conv.send(text);
  }

  if (conv.trackingCode) {
    return (
      <div className="flex w-full flex-col items-center gap-4 px-6 py-10 text-center">
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
          <span className="font-heading text-[28px] font-extrabold text-teal">{conv.trackingCode}</span>
          <span className="mt-1 text-xs text-gray-500">Ushbu kod orqali holatni istalgan vaqt tekshirishingiz mumkin.</span>
        </div>
        <button
          type="button"
          onClick={async () => {
            usedVoiceRef.current = false;
            setMode("text");
            await conv.restart();
          }}
          className="mt-5 w-full rounded-2xl border border-gray-200 bg-white py-3.5 font-heading text-[15px] font-bold text-ink transition hover:bg-gray-50"
        >
          Yana xabar yuborish
        </button>
      </div>
    );
  }

  const confirming = conv.view.stage === "confirming";

  return (
    <div className="flex h-[min(700px,calc(100dvh-3rem))] w-full flex-col overflow-hidden rounded-[28px]">
      <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <LogoMark size={26} />
          <span className="truncate rounded-full bg-teal-tint px-2.5 py-1 text-[11px] font-semibold text-teal">
            {departmentName}
            {floorLabel ? ` · ${floorLabel}` : ""}
          </span>
        </div>
        <div role="tablist" aria-label="Suhbat usuli" className="flex flex-shrink-0 rounded-full bg-[#F1F3F2] p-0.5 text-xs font-bold">
          {(
            [
              ["text", "Yozish"],
              ["voice", "Ovoz"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => (value === "voice" ? openVoice() : setMode("text"))}
              className={`rounded-full px-3 py-1.5 transition ${
                mode === value ? "bg-white text-teal shadow-sm" : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <ConversationView
        view={conv.view}
        pendingText={conv.pendingText}
        busy={conv.busy}
        error={conv.error}
        expired={conv.expired}
        onConfirm={() => conv.confirm(usedVoiceRef.current ? "voice" : "text")}
        onContinue={() => conv.continueTalking()}
        onRestart={() => conv.restart()}
        footer={
          <div className="flex flex-col gap-2">
            {mode === "text" ? (
              <TextComposer
                disabled={conv.busy}
                placeholder={confirming ? "Yoki shu yerga qo'shimcha yozing..." : "Xabaringizni yozing..."}
                onSend={conv.send}
              />
            ) : (
              <VoiceControls
                audioElRef={audioRef}
                messages={conv.view.messages}
                epoch={conv.view.epoch}
                stage={conv.view.stage}
                busy={conv.busy}
                onUtterance={sendFromVoice}
                onSwitchToText={() => setMode("text")}
              />
            )}
            <p className="text-center text-[11px] text-gray-500">To&apos;liq anonim — ism so&apos;ralmaydi.</p>
          </div>
        }
      />
    </div>
  );
}
