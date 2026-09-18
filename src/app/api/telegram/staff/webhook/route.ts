import { webhookCallback } from "grammy";
import { getStaffBot } from "@/lib/telegram/staffBot";

let handler: ((req: Request) => Promise<Response>) | null = null;

export async function POST(request: Request) {
  try {
    if (!handler) {
      handler = webhookCallback(getStaffBot(), "std/http", {
        secretToken: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
      }) as (req: Request) => Promise<Response>;
    }
    return await handler(request);
  } catch (error) {
    // See src/app/api/telegram/patient/webhook/route.ts for why this always
    // returns 200 — bot.catch() doesn't cover the webhook (handleUpdate) path.
    console.error("[telegram/staff/webhook] Handler error:", error);
    return new Response("ok");
  }
}
