import { webhookCallback } from "grammy";
import { getPatientBot } from "@/lib/telegram/patientBot";

let handler: ((req: Request) => Promise<Response>) | null = null;

export async function POST(request: Request) {
  try {
    if (!handler) {
      handler = webhookCallback(getPatientBot(), "std/http", {
        secretToken: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
      }) as (req: Request) => Promise<Response>;
    }
    return await handler(request);
  } catch (error) {
    // grammY's bot.catch() only applies to long-polling — handleUpdate() (used by
    // webhooks) rejects instead. Always ACK Telegram with 200 regardless, so a
    // transient failure (e.g. the reply itself failing to send) doesn't trigger
    // Telegram's retry storm; the handlers' own idempotency checks (used tokens,
    // status guards) already make a genuine retry safe if one does occur.
    console.error("[telegram/patient/webhook] Handler error:", error);
    return new Response("ok");
  }
}
