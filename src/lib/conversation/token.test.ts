import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "./engine";
import { signState, verifyState } from "./token";

const state = () =>
  createInitialState({ hospitalId: "h", departmentId: "d", hospitalName: "Klinika", departmentName: "Bo'lim", departmentNames: ["Bo'lim"] });

beforeEach(() => {
  process.env.CONVERSATION_SECRET = "test-secret";
});
afterEach(() => vi.useRealTimers());

describe("conversation state token", () => {
  it("round-trips a signed state", () => {
    const back = verifyState(signState(state()));
    expect(back?.stage).toBe("gathering");
    expect(back?.messages[0].role).toBe("assistant");
  });

  it("rejects a token whose payload was tampered with (e.g. forging the stage)", () => {
    const [payload, sig] = signState(state()).split(".");
    const forged = JSON.parse(Buffer.from(payload, "base64url").toString());
    forged.stage = "confirming";
    const tampered = `${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${sig}`;
    expect(verifyState(tampered)).toBeNull();
  });

  it("rejects garbage and tokens signed with another secret", () => {
    expect(verifyState("nope")).toBeNull();
    expect(verifyState("a.b.c")).toBeNull();
    const token = signState(state());
    process.env.CONVERSATION_SECRET = "different-secret";
    expect(verifyState(token)).toBeNull();
  });

  it("expires old tokens", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = signState(state());
    vi.setSystemTime(new Date("2026-01-01T07:00:00Z"));
    expect(verifyState(token)).toBeNull();
  });
});
