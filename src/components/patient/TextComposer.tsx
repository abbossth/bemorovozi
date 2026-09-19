"use client";

import { useState } from "react";

type Props = {
  disabled: boolean;
  placeholder: string;
  /** Resolves true when the message was accepted; on false the text is put back so nothing is lost. */
  onSend: (text: string) => Promise<boolean>;
};

export function TextComposer({ disabled, placeholder, onSend }: Props) {
  const [text, setText] = useState("");

  async function submit() {
    const value = text.trim();
    if (!value || disabled) return;
    setText("");
    const ok = await onSend(value);
    if (!ok) setText(value);
  }

  return (
    <div className="flex items-end gap-2 rounded-3xl border border-gray-200 bg-white p-2 pl-3.5 focus-within:border-teal">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        rows={2}
        maxLength={1500}
        placeholder={placeholder}
        aria-label="Xabaringiz"
        className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-snug text-ink outline-none placeholder:text-gray-500"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={disabled || text.trim().length === 0}
        aria-label="Yuborish"
        className="mb-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal text-white transition disabled:bg-gray-200 disabled:text-gray-500"
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
