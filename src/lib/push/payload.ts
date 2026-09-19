import { SEVERITY_LABEL } from "@/lib/telegram/format";
import type { Severity } from "@/lib/ai/types";

// Pure (no server imports): shared by the server (web push) and the dashboard tab itself
// (which shows the very same notification locally when a new item appears while it is in the background).

export type PushPayload = {
  title: string;
  body: string;
  /** same tag = the newer notification replaces the older one instead of stacking */
  tag: string;
  /** where the click should land */
  url: string;
  /** stays on screen until dismissed (high severity) */
  urgent: boolean;
};

export type NotifiableFeedback = {
  _id: unknown;
  hospitalId?: unknown;
  severity: Severity;
  aiSummary?: string;
  transcript: string;
  kind?: string;
  routedToManagement?: boolean;
};

/** Sent by "Test bildirishnoma yuborish" — the same text over push and locally. */
export const TEST_PAYLOAD: PushPayload = {
  title: "🔔 BemorOvozi: test",
  body: "Bildirishnomalar ishlayapti. Yangi xabarlar shu yerda ko'rinadi.",
  tag: "push-test",
  url: "/dashboard",
  urgent: false,
};

export function buildFeedbackPayload(feedback: NotifiableFeedback, department: { name: string }): PushPayload {
  const label = feedback.kind === "taklif" ? "💡 Taklif" : SEVERITY_LABEL[feedback.severity];
  const prefix = feedback.routedToManagement ? "🏛 Rahbariyatga · " : "";
  const text = (feedback.aiSummary?.trim() || feedback.transcript).replace(/\s+/g, " ");
  return {
    title: `${prefix}${label} · ${department.name}`,
    body: text.length > 180 ? `${text.slice(0, 177)}…` : text,
    tag: `feedback-${String(feedback._id)}`,
    url: `/dashboard?feedback=${String(feedback._id)}`,
    urgent: feedback.severity === "yuqori",
  };
}
