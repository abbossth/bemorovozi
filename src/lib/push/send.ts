import webpush from "web-push";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";
import Staff from "@/models/Staff";
import { buildFeedbackPayload, type NotifiableFeedback, type PushPayload } from "./payload";

type Subscription = {
  _id: unknown;
  staffId: unknown;
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
  );
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

/** Sends to each subscription; expired ones (404/410) are removed so they aren't retried forever. */
export async function sendPush(subscriptions: Subscription[], payload: PushPayload) {
  if (subscriptions.length === 0) return { sent: 0, removed: 0 };
  configure();

  const body = JSON.stringify(payload);
  const expired: unknown[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, { TTL: 60 * 60 * 24, urgency: payload.urgent ? "high" : "normal" });
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(sub._id);
        else console.error(`[push] Failed to send to ${sub.endpoint.slice(0, 48)}…:`, error);
      }
    })
  );

  if (expired.length > 0) await PushSubscription.deleteMany({ _id: { $in: expired } });
  return { sent, removed: expired.length };
}

export { buildFeedbackPayload, type PushPayload } from "./payload";

/**
 * Who gets a push for a new feedback. Same spirit as the Telegram routing: a staff-conduct
 * complaint goes to management (admins) — falling back to everyone subscribed so it is never lost —
 * and high severity always reaches everyone. Everything else goes to every subscribed staff member.
 */
export function selectRecipients<T extends { staffId: unknown }>(
  subscriptions: T[],
  roleOf: (staffId: unknown) => string | undefined,
  feedback: Pick<NotifiableFeedback, "severity" | "routedToManagement">
): T[] {
  if (feedback.routedToManagement && feedback.severity !== "yuqori") {
    const admins = subscriptions.filter((s) => roleOf(s.staffId) === "admin");
    return admins.length > 0 ? admins : subscriptions;
  }
  return subscriptions;
}

/** Pushes a new feedback to the admin panel's subscribed browsers/phones. Best-effort. */
export async function pushForFeedback(feedback: NotifiableFeedback, department: { name: string }) {
  if (!isPushConfigured()) return;
  await connectDB();

  const subscriptions = await PushSubscription.find({ hospitalId: feedback.hospitalId }).lean();
  if (subscriptions.length === 0) return;

  const staff = await Staff.find({ _id: { $in: subscriptions.map((s) => s.staffId) } })
    .select("role")
    .lean();
  const roles = new Map(staff.map((s) => [String(s._id), s.role as string]));

  const recipients = selectRecipients(subscriptions, (id) => roles.get(String(id)), feedback);
  await sendPush(recipients, buildFeedbackPayload(feedback, department));
}
