import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.fn();
const deleteMany = vi.fn(async () => ({}));

vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: (...a: unknown[]) => sendNotification(...a) } }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/PushSubscription", () => ({ default: { deleteMany: (...a: unknown[]) => deleteMany(...(a as [])) } }));
vi.mock("@/models/Staff", () => ({ default: {} }));

import { buildFeedbackPayload, selectRecipients, sendPush } from "./send";

const sub = (id: string, staffId: string) => ({ _id: id, staffId, endpoint: `https://push.example/${id}`, keys: { p256dh: "p", auth: "a" } });
const roles: Record<string, string> = { boss: "admin", nurse: "staff" };
const roleOf = (id: unknown) => roles[String(id)];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
  process.env.VAPID_PRIVATE_KEY = "priv";
  process.env.VAPID_SUBJECT = "https://example.com";
});

describe("selectRecipients", () => {
  const all = [sub("1", "boss"), sub("2", "nurse")];

  it("normal feedback goes to every subscribed staff member", () => {
    expect(selectRecipients(all, roleOf, { severity: "orta" })).toHaveLength(2);
  });

  it("a management-routed complaint goes to admins only", () => {
    const got = selectRecipients(all, roleOf, { severity: "orta", routedToManagement: true });
    expect(got.map((s) => s.staffId)).toEqual(["boss"]);
  });

  it("falls back to everyone when no admin is subscribed, so it is never lost", () => {
    const got = selectRecipients([sub("2", "nurse")], roleOf, { severity: "orta", routedToManagement: true });
    expect(got).toHaveLength(1);
  });

  it("high severity still reaches everyone", () => {
    expect(selectRecipients(all, roleOf, { severity: "yuqori", routedToManagement: true })).toHaveLength(2);
  });
});

describe("buildFeedbackPayload", () => {
  const base = { _id: "abc", hospitalId: "h", severity: "yuqori" as const, transcript: "asl matn", aiSummary: "Qisqa xulosa." };

  it("puts severity + department in the title, the AI summary in the body, and links to the item", () => {
    const p = buildFeedbackPayload(base, { name: "Kardiologiya" });
    expect(p.title).toBe("🔴 Yuqori · Kardiologiya");
    expect(p.body).toBe("Qisqa xulosa.");
    expect(p.url).toBe("/dashboard?feedback=abc");
    expect(p.tag).toBe("feedback-abc");
    expect(p.urgent).toBe(true);
  });

  it("marks management routing and suggestions, and does not keep low severity on screen", () => {
    expect(buildFeedbackPayload({ ...base, severity: "orta", routedToManagement: true }, { name: "K" })).toMatchObject({
      title: "🏛 Rahbariyatga · 🟠 O'rta · K",
      urgent: false,
    });
    expect(buildFeedbackPayload({ ...base, severity: "past", kind: "taklif" }, { name: "K" }).title).toBe("💡 Taklif · K");
  });

  it("falls back to the transcript and truncates long text", () => {
    const p = buildFeedbackPayload({ ...base, aiSummary: undefined, transcript: "x".repeat(400) }, { name: "K" });
    expect(p.body.length).toBeLessThanOrEqual(180);
    expect(p.body.endsWith("…")).toBe(true);
  });
});

describe("sendPush", () => {
  const payload = { title: "t", body: "b", tag: "x", url: "/dashboard", urgent: false };

  it("sends the JSON payload to every subscription", async () => {
    sendNotification.mockResolvedValue({});
    const result = await sendPush([sub("1", "boss"), sub("2", "nurse")], payload);
    expect(result).toEqual({ sent: 2, removed: 0 });
    expect(JSON.parse(sendNotification.mock.calls[0][1])).toMatchObject({ title: "t", url: "/dashboard" });
  });

  it("removes expired subscriptions (404/410) and keeps going on other errors", async () => {
    sendNotification
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error("boom"), { statusCode: 500 }))
      .mockResolvedValueOnce({});
    const result = await sendPush([sub("1", "a"), sub("2", "b"), sub("3", "c")], payload);
    expect(result).toEqual({ sent: 1, removed: 1 });
    expect(deleteMany).toHaveBeenCalledWith({ _id: { $in: ["1"] } });
  });

  it("does nothing without subscriptions", async () => {
    expect(await sendPush([], payload)).toEqual({ sent: 0, removed: 0 });
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
