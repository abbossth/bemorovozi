import { NextResponse } from "next/server";
import { z } from "zod";
import { textToSpeech } from "@/lib/voice";
import { mark } from "@/lib/timing";

const bodySchema = z.object({ text: z.string().min(1) });

export async function POST(request: Request) {
  const routeStart = Date.now();
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  try {
    const audio = await textToSpeech(parsed.data.text);
    mark("route.voice.tts.total", { ms: Date.now() - routeStart });
    return new NextResponse(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/wav" },
    });
  } catch (error) {
    mark("route.voice.tts.failed", { ms: Date.now() - routeStart });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ovoz yaratib bo'lmadi" },
      { status: 502 }
    );
  }
}
