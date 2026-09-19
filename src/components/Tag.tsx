import type { ReactNode } from "react";
import { TONE, type Tone } from "@/lib/ui/tones";
import { CLUSTER_WINDOW_DAYS } from "@/lib/clusters";

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

/**
 * "Tizimli muammo · N": the same problem reported N times lately. Deliberately unlike the other pills —
 * outlined, with a "repeat" icon and heavier type — so it stands out in the list at a glance.
 */
export function SystemicTag({ count }: { count: number }) {
  const { fg, bg } = TONE.warning;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border-[1.5px] py-[1px] pl-1.5 pr-2.5 text-xs font-extrabold"
      style={{ color: fg, background: bg, borderColor: fg }}
      title={`So'nggi ${CLUSTER_WINDOW_DAYS} kunda ${count} marta takrorlangan`}
      data-testid="systemic-tag"
    >
      <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
        <path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Tizimli muammo · {count}
    </span>
  );
}
