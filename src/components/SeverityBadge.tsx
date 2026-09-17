import type { Severity } from "@/lib/ai/types";

export const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string }> = {
  yuqori: { label: "Yuqori", color: "#E5534B", bg: "#FCEBEA" },
  orta: { label: "O'rta", color: "#B36B00", bg: "#FDF3E4" },
  past: { label: "Past", color: "#0F6E5C", bg: "#EAF5F2" },
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
