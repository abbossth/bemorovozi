import type { Severity } from "@/lib/ai/types";

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
