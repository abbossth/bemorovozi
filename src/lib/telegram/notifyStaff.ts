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

  const recipients =
    feedback.severity === "yuqori" ? staffList : staffList.filter((s) => s.telegramNotificationMode === "realtime");
  if (recipients.length === 0) return;

  const bot = getStaffBot();
  const feedbackId = String(feedback._id);
  const baseText = buildNotificationText({
    departmentName: department.name,
    severity: feedback.severity,
    transcript: feedback.transcript,
    trackingCode: feedback.trackingCode,
    createdAt: feedback.createdAt ?? new Date(),
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
