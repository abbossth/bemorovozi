"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Card, ChatMessage, ConversationView as View } from "@/lib/conversation/types";

type Props = {
  view: View;
  /** what the patient just sent, shown optimistically while the assistant is thinking */
  pendingText: string | null;
  busy: boolean;
  error: string | null;
  expired: boolean;
  onConfirm: () => void;
  onContinue: () => void;
  onRestart: () => void;
  /** text composer in text mode, mic/orb in voice mode — the chat itself is identical */
  footer: ReactNode;
};

const TYPE_LABEL = { shikoyat: "Shikoyat", taklif: "Taklif" } as const;

function ConfirmationCard({ card }: { card: Card }) {
  const rows: [string, string][] = [
    ["Turi", card.type ? TYPE_LABEL[card.type] : "Aniqlanmagan"],
    ["Bo'lim", card.department ?? "Aniqlanmagan"],
    ["Xona/palata", card.room ?? "Aniqlanmagan"],
    ["Xodim", card.staff ?? "Aytilmagan"],
    ["Vaqt", card.when ?? "Aniqlanmagan"],
  ];
  return (
    <div className="mt-2 rounded-xl border border-teal/25 bg-white p-3 text-[13px]" data-testid="confirmation-card">
      {card.routeToManagement && (
        <span className="mb-2 inline-block rounded-full bg-amber-tint px-2.5 py-0.5 text-[11px] font-bold text-amber">
          Rahbariyatga yo&apos;naltiriladi
        </span>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-gray-500">{label}:</dt>
            <dd className="font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 border-t border-gray-100 pt-2.5 leading-relaxed text-ink">
        <span className="text-gray-500">Qisqa tavsif: </span>
        {card.summary}
      </p>
    </div>
  );
}

function Bubble({ message, children }: { message: ChatMessage; children?: ReactNode }) {
  const mine = message.role === "patient";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
          mine ? "rounded-br-md bg-teal text-white" : "rounded-bl-md bg-[#F3F6F5] text-ink"
        }`}
      >
        {message.text}
        {children}
      </div>
    </div>
  );
}

export function ConversationView({
  view,
  pendingText,
  busy,
  error,
  expired,
  onConfirm,
  onContinue,
  onRestart,
  footer,
}: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [view.messages.length, pendingText, busy, view.stage]);

  // The card that is currently awaiting an answer: the latest one, only while confirming.
  let activeCardIndex = -1;
  if (view.stage === "confirming") {
    for (let i = view.messages.length - 1; i >= 0; i--) {
      if (view.messages[i].card) {
        activeCardIndex = i;
        break;
      }
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4" aria-live="polite">
        {view.messages.map((message, i) => (
          <Bubble key={`${view.epoch}-${i}`} message={message}>
            {message.card && <ConfirmationCard card={message.card} />}
            {i === activeCardIndex && (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={busy}
                  className="w-full rounded-xl bg-teal px-3 py-3 font-heading text-[14px] font-bold text-white disabled:opacity-60"
                >
                  {busy ? "Yuborilmoqda..." : "Ha, to'g'ri — yubor"}
                </button>
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={busy}
                  className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3 py-3 font-heading text-[14px] font-bold text-ink disabled:opacity-60"
                >
                  Yo&apos;q, davom etaman
                </button>
                <button
                  type="button"
                  onClick={onRestart}
                  disabled={busy}
                  className="w-full rounded-xl px-3 py-2.5 font-heading text-[13px] font-bold text-gray-500 disabled:opacity-60"
                >
                  Yangidan boshlash
                </button>
              </div>
            )}
          </Bubble>
        ))}

        {pendingText && <Bubble message={{ role: "patient", text: pendingText }} />}

        {busy && pendingText && (
          <div className="flex justify-start" aria-label="Yordamchi yozmoqda">
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-[#F3F6F5] px-3.5 py-3.5">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500"
                  style={{ animationDelay: `${d * 160}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="mx-4 mb-2 rounded-xl bg-coral-tint px-3.5 py-2.5 text-[13px] text-coral" role="alert">
          {error}
          {expired && (
            <>
              {" "}
              <button type="button" onClick={() => window.location.reload()} className="font-bold underline">
                Sahifani yangilash
              </button>
            </>
          )}
        </p>
      )}

      <div className="border-t border-gray-100 px-3 pb-3 pt-3">{footer}</div>
    </div>
  );
}
