import Staff from "@/models/Staff";
import TelegramNotification from "@/models/TelegramNotification";
import { getStaffBot, buildFeedbackKeyboard, buildNotificationText } from "./staffBot";
import type { Severity } from "@/lib/ai/types";

type NotifiableFeedback = {
  _id: unknown;
  hospitalId: unknown;
  severity: Severity;
  transcript: string;
  trackingCode: string;
  createdAt?: Date;
  kind?: string;
  roomOrWard?: string;
  staffName?: string;
  occurredAt?: string;
  routedToManagement?: boolean;
};

/**
 * Notifies connected staff about a new Feedback document. "Yuqori" severity is
 * always sent immediately to every linked staff member in the hospital — this
 * is a safety-critical alert and does not respect the digest preference.
 * Lower severities are sent immediately only to staff who opted into
 * "realtime"; staff on "digest" pick these up via the periodic digest cron
 * instead (src/app/api/telegram/staff/digest/route.ts).
 *
 * Note: the current data model has no per-department staff assignment — staff
 * belong to a hospital, and the dashboard already shows all of that hospital's
 * feedback to all of its staff. This reuses that same hospital-wide scope
 * rather than inventing new department-assignment infrastructure.
 */
export async function notifyStaffForFeedback(feedback: NotifiableFeedback, department: { name: string }) {
  if (!process.env.TELEGRAM_STAFF_BOT_TOKEN) return; // bot not configured — skip quietly

  const staffList = await Staff.find({
    hospitalId: feedback.hospitalId,
    telegramChatId: { $exists: true, $ne: null },
  });
  if (staffList.length === 0) return;

  const highSeverity = feedback.severity === "yuqori";
  let recipients: typeof staffList;
  if (feedback.routedToManagement) {
    // Staff-conduct complaints skip the department: management (admins) is told immediately,
    // whatever their digest preference. If nobody with the admin role is linked yet, don't lose
    // it — fall back to everyone linked. High severity still reaches everyone, as always.
    const management = staffList.filter((s) => s.role === "admin");
    const targets = management.length > 0 ? management : staffList;
    recipients = highSeverity ? staffList : targets;
  } else {
    recipients = highSeverity ? staffList : staffList.filter((s) => s.telegramNotificationMode === "realtime");
  }
  if (recipients.length === 0) return;

  const bot = getStaffBot();
  const feedbackId = String(feedback._id);
  const baseText = buildNotificationText({
    departmentName: department.name,
    severity: feedback.severity,
    transcript: feedback.transcript,
    trackingCode: feedback.trackingCode,
    createdAt: feedback.createdAt ?? new Date(),
    routedToManagement: feedback.routedToManagement,
    kind: feedback.kind,
    roomOrWard: feedback.roomOrWard,
    staffName: feedback.staffName,
    occurredAt: feedback.occurredAt,
  });
  const keyboard = buildFeedbackKeyboard(feedbackId);

  await Promise.all(
    recipients.map(async (staff) => {
      try {
        const sent = await bot.api.sendMessage(staff.telegramChatId!, baseText, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
        await TelegramNotification.create({
          feedbackId,
          staffId: staff._id,
          chatId: sent.chat.id,
          messageId: sent.message_id,
          baseText,
        });
      } catch (error) {
        console.error(`[notifyStaff] Failed to notify staff ${staff._id}:`, error);
      }
    })
  );
}

const LEAD_SOURCE_LABEL: Record<string, string> = {
  demo: "Demo so'rash",
  narxlar_b2b: "Narxlar (B2B)",
  narxlar_b2g: "Narxlar (B2G)",
  pilot: "Pilot dastur",
};

type NotifiableLead = {
  source: string;
  organizationName: string;
  contactName: string;
  phone: string;
  email?: string;
  message?: string;
  plan?: string;
};

/**
 * Notifies every linked staff member about a new marketing lead (demo request,
 * pricing page contact form). Leads aren't scoped to a hospital — the current
 * deployment is single-tenant, so every connected staff account is, in
 * practice, the platform operator who should see sales inquiries.
 */
export async function notifyStaffForLead(lead: NotifiableLead) {
  if (!process.env.TELEGRAM_STAFF_BOT_TOKEN) return;

  const staffList = await Staff.find({ telegramChatId: { $exists: true, $ne: null } });
  if (staffList.length === 0) return;

  const bot = getStaffBot();
  const text =
    `📩 <b>Yangi lid</b> — ${LEAD_SOURCE_LABEL[lead.source] ?? lead.source}\n\n` +
    `🏥 ${lead.organizationName}\n` +
    `👤 ${lead.contactName}\n` +
    `📞 ${lead.phone}\n` +
    (lead.email ? `✉️ ${lead.email}\n` : "") +
    (lead.plan ? `📦 Tarif: ${lead.plan}\n` : "") +
    (lead.message ? `\n${lead.message}` : "");

  await Promise.all(
    staffList.map(async (staff) => {
      try {
        await bot.api.sendMessage(staff.telegramChatId!, text, { parse_mode: "HTML" });
      } catch (error) {
        console.error(`[notifyStaff] Failed to notify staff ${staff._id} about lead:`, error);
      }
    })
  );
}
