import type { Severity } from "@/lib/ai/types";

/** Telegram messages are sent with parse_mode HTML — anything patient- or AI-written must be escaped. */
export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  yuqori: "🔴 Yuqori",
  orta: "🟠 O'rta",
  past: "🟢 Past",
};

export const STATUS_LABEL: Record<string, string> = {
  yangi: "Yangi",
  korib_chiqilmoqda: "Ko'rib chiqilmoqda",
  hal_qilindi: "Hal qilindi",
};
