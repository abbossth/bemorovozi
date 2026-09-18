import { NextResponse } from "next/server";
import { speechToText } from "@/lib/voice";
import { mark } from "@/lib/timing";

// Audio arrives as multipart form data and lives only in this request's memory —
// it is never written to disk or the database, and is dropped as soon as this
// function returns, per the product's no-raw-audio-retention requirement.
export async function POST(request: Request) {
  const routeStart = Date.now();
  const form = await request.formData();
  const audio = form.get("audio");

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Audio fayl topilmadi" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    mark("route.voice.stt.audioSize", { bytes: buffer.length });
    const text = await speechToText(buffer, audio.type || "audio/webm");
    mark("route.voice.stt.total", { ms: Date.now() - routeStart });
    return NextResponse.json({ text });
  } catch (error) {
    mark("route.voice.stt.failed", { ms: Date.now() - routeStart });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ovozni tanib bo'lmadi" },
      { status: 502 }
    );
  }
}
