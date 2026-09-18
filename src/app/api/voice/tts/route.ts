import { NextResponse } from "next/server";
import { z } from "zod";
import { textToSpeech } from "@/lib/voicelab";

const bodySchema = z.object({ text: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  try {
    const audio = await textToSpeech(parsed.data.text);
    return new NextResponse(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/wav" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ovoz yaratib bo'lmadi" },
      { status: 502 }
    );
  }
}
