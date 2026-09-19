import { createHmac, timingSafeEqual } from "node:crypto";
import type { ConversationState } from "./types";

const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function secret() {
  // CONVERSATION_SECRET is preferred; the fallbacks are existing server-only secrets, and the
  // HMAC key is domain-separated below so they are never used as-is to sign these tokens.
  const raw = process.env.CONVERSATION_SECRET ?? process.env.TELEGRAM_WEBHOOK_SECRET ?? process.env.CRON_SECRET;
  if (!raw) throw new Error("CONVERSATION_SECRET is not set — add it to .env.local");
  return createHmac("sha256", raw).update("bemorovozi:conversation-state:v1").digest();
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signState(state: ConversationState): string {
  const payload = Buffer.from(JSON.stringify({ ...state, issuedAt: Date.now() }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the state only if the signature is valid and the token is recent; otherwise null. */
export function verifyState(token: string): ConversationState | null {
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ConversationState;
    if (state.v !== 1 || Date.now() - state.issuedAt > MAX_AGE_MS) return null;
    return state;
  } catch {
    return null;
  }
}
