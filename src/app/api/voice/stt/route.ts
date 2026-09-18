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
    // Log the real cause (provider name, HTTP status, billing state, etc.) for
    // us to debug — but never forward that internal detail to an anonymous
    // patient's screen.
    console.error("[api/voice/stt] failed:", error);
    return NextResponse.json({ error: "Ovozni tanib bo'lmadi. Iltimos, qayta urinib ko'ring." }, { status: 502 });
  }
}
