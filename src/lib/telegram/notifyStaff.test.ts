import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMessage = vi.fn(async (chatId: number) => ({ chat: { id: chatId }, message_id: 1 }));
let staffList: { _id: string; role: string; telegramChatId: number; telegramNotificationMode: string }[] = [];

vi.mock("@/models/Staff", () => ({ default: { find: vi.fn(async () => staffList) } }));
vi.mock("@/models/TelegramNotification", () => ({ default: { create: vi.fn(async () => ({})) } }));
vi.mock("./staffBot", () => ({
  getStaffBot: () => ({ api: { sendMessage } }),
  buildFeedbackKeyboard: () => ({}),
  buildNotificationText: () => "text",
}));

import { notifyStaffForFeedback } from "./notifyStaff";

const admin = { _id: "a", role: "admin", telegramChatId: 1, telegramNotificationMode: "digest" };
const nurseHead = { _id: "n", role: "staff", telegramChatId: 2, telegramNotificationMode: "realtime" };
const clerk = { _id: "c", role: "staff", telegramChatId: 3, telegramNotificationMode: "digest" };

const feedback = (over: Record<string, unknown> = {}) => ({
  _id: "f1",
  hospitalId: "h1",
  severity: "orta" as const,
  transcript: "x",
  trackingCode: "BO-1",
  ...over,
});
const notified = () => sendMessage.mock.calls.map((c) => c[0]).sort();

beforeEach(() => {
  process.env.TELEGRAM_STAFF_BOT_TOKEN = "token";
  sendMessage.mockClear();
  staffList = [admin, nurseHead, clerk];
});

describe("notifyStaffForFeedback routing", () => {
  it("regular medium feedback: realtime staff only (unchanged behaviour)", async () => {
    await notifyStaffForFeedback(feedback(), { name: "Kardiologiya" });
    expect(notified()).toEqual([2]);
  });

  it("staff-conduct complaint goes to management (admins) immediately, even in digest mode", async () => {
    await notifyStaffForFeedback(feedback({ routedToManagement: true }), { name: "Kardiologiya" });
    expect(notified()).toEqual([1]);
  });

  it("falls back to everyone linked when no admin is linked, so it is never lost", async () => {
    staffList = [nurseHead, clerk];
    await notifyStaffForFeedback(feedback({ routedToManagement: true }), { name: "Kardiologiya" });
    expect(notified()).toEqual([2, 3]);
  });

  it("high severity still reaches everyone, management-routed or not", async () => {
    await notifyStaffForFeedback(feedback({ routedToManagement: true, severity: "yuqori" }), { name: "K" });
    expect(notified()).toEqual([1, 2, 3]);
  });
});
