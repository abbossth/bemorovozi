import type { Severity } from "@/lib/ai/types";
import { TONE } from "@/lib/ui/tones";

export const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string }> = {
  yuqori: { label: "Yuqori", color: TONE.danger.fg, bg: TONE.danger.bg },
  orta: { label: "O'rta", color: TONE.warning.fg, bg: TONE.warning.bg },
  past: { label: "Past", color: TONE.success.fg, bg: TONE.success.bg },
};

export function SeverityBadge({ severity, suffix }: { severity: Severity; suffix?: string }) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-bold"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}
