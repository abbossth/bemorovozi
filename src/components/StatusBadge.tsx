export type Status = "yangi" | "korib_chiqilmoqda" | "hal_qilindi";

export const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  yangi: { label: "Yangi", color: "#4B5563", bg: "#F3F4F6" },
  korib_chiqilmoqda: { label: "Ko'rib chiqilmoqda", color: "#B36B00", bg: "#FDF3E4" },
  hal_qilindi: { label: "Hal qilindi", color: "#0F6E5C", bg: "#EAF5F2" },
};

export const NEXT_STATUS: Partial<Record<Status, Status>> = {
  yangi: "korib_chiqilmoqda",
  korib_chiqilmoqda: "hal_qilindi",
};

export const NEXT_STATUS_LABEL: Partial<Record<Status, string>> = {
  yangi: "Ko'rib chiqilmoqda deb belgilash",
  korib_chiqilmoqda: "Hal qilindi deb belgilash",
};

export function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-[3px] text-xs font-semibold"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
    </span>
  );
}
