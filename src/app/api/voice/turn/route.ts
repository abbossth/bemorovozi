import { NextResponse } from "next/server";
import { z } from "zod";
import { ai } from "@/lib/ai";
import { mark } from "@/lib/timing";

const bodySchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(["ai", "patient"]),
      text: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  const routeStart = Date.now();
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  try {
    const result = await ai.voiceDialogueTurn(parsed.data.history);
    mark("route.voice.turn.total", { ms: Date.now() - routeStart });
    return NextResponse.json(result);
  } catch (error) {
    mark("route.voice.turn.failed", { ms: Date.now() - routeStart });
    console.error("[api/voice/turn] AI dialogue failed:", error);
    // The patient already spoke and STT already succeeded — don't strand them on
    // a dead end because the model had a transient hiccup. End the conversation
    // gracefully so what they said so far still gets submitted.
    return NextResponse.json({
      reply: "Tushunarli, xabaringiz qabul qilindi. Fikr bildirganingiz uchun rahmat!",
      done: true,
    });
  }
}
