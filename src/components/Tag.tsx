import type { ReactNode } from "react";
import { TONE, type Tone } from "@/lib/ui/tones";

/** Small pill in one of the shared tones (used for "Taklif", "Rahbariyatga", …). */
export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  const { fg, bg } = TONE[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-xs font-bold"
      style={{ color: fg, background: bg }}
    >
      {children}
    </span>
  );
}
