import { NextResponse } from "next/server";
import { z } from "zod";
import { mark } from "@/lib/timing";
import { DepartmentNotFoundError } from "@/lib/createFeedback";
import { verifyState, signState } from "@/lib/conversation/token";
import { continueConversation, EngineError, handleMessageWithIntent, markDone, toView } from "@/lib/conversation/engine";
import { callConversationModel } from "@/lib/conversation/model";
import { buildInitialState, ConversationTargetNotFoundError } from "@/lib/conversation/init";
import { finalizeConversation } from "@/lib/conversation/finalize";
import type { ConversationState } from "@/lib/conversation/types";

// One endpoint for the whole chat — text and voice both call it, so both go through the
// exact same state machine. Voice only adds STT before and TTS after this call.
const bodySchema = z.discriminatedUnion("action", [
  z.object({
    token: z.string().min(1),
    action: z.literal("message"),
    text: z.string(),
    // used only if the message turns out to be "ha, yubor" answering the card
    channel: z.enum(["text", "voice"]).default("text"),
  }),
  z.object({ token: z.string().min(1), action: z.literal("continue") }),
  z.object({ token: z.string().min(1), action: z.literal("restart") }),
  z.object({ token: z.string().min(1), action: z.literal("confirm"), channel: z.enum(["text", "voice"]).default("text") }),
]);

function respond(state: ConversationState, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ token: signState(state), view: toView(state), ...extra });
}

export async function POST(request: Request) {
  const routeStart = Date.now();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

  const body = parsed.data;
  const state = verifyState(body.token);
  if (!state) {
    return NextResponse.json(
      { error: "Suhbat muddati tugagan. Sahifani yangilab, qaytadan boshlang.", expired: true },
      { status: 400 }
    );
  }

  try {
    switch (body.action) {
      case "message": {
        const { state: next, intent } = await handleMessageWithIntent(state, body.text, callConversationModel);
        mark("route.conversation.message", { ms: Date.now() - routeStart, stage: next.stage, intent });
        // The card can be answered in words as well as with its buttons — same three outcomes.
        if (intent === "confirm") {
          const feedback = await finalizeConversation(next, body.channel);
          mark("route.conversation.confirm", { ms: Date.now() - routeStart, channel: body.channel, via: "message" });
          return respond(markDone(next), { trackingCode: feedback.trackingCode });
        }
        if (intent === "restart") {
          return respond(await buildInitialState(state.hospitalId, state.departmentId, state.epoch + 1));
        }
        return respond(next);
      }
      case "continue":
        return respond(continueConversation(state));
      case "restart":
        // Everything is cleared and STAGE 0 is rebuilt from the database (fresh hospital name).
        return respond(await buildInitialState(state.hospitalId, state.departmentId, state.epoch + 1));
      case "confirm": {
        const feedback = await finalizeConversation(state, body.channel);
        mark("route.conversation.confirm", { ms: Date.now() - routeStart, channel: body.channel });
        return respond(markDone(state), { trackingCode: feedback.trackingCode });
      }
    }
  } catch (error) {
    if (error instanceof EngineError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    if (error instanceof DepartmentNotFoundError || error instanceof ConversationTargetNotFoundError) {
      return NextResponse.json({ error: "Bo'lim topilmadi" }, { status: 404 });
    }
    mark("route.conversation.failed", { ms: Date.now() - routeStart, action: body.action });
    console.error("[api/conversation] Unexpected error:", error);
    return NextResponse.json({ error: "Kutilmagan xatolik yuz berdi. Qaytadan urinib ko'ring." }, { status: 500 });
  }
}
