// VoiceLab (voicelab.uz, part of the Aisha.group family) — Uzbek-specialized STT/TTS
// over REST. API reference: https://docs.voicelab.uz/api/tts, /api/stt
//
// TTS is synchronous — POST returns the WAV bytes directly.
// STT is asynchronous — POST returns a queued job id, which we poll until "completed".

import { time, mark } from "@/lib/timing";
import { audioFileName } from "./mime";

const STT_POLL_INTERVAL_MS = 1000;
const STT_POLL_TIMEOUT_MS = 25000;

function requireConfig() {
  const apiKey = process.env.VOICELAB_API_KEY;
  const baseUrl = process.env.VOICELAB_API_BASE_URL ?? "https://api.voicelab.uz/v1";
  if (!apiKey) {
    throw new Error(
      "VOICELAB_API_KEY is not set — voice mode needs a VoiceLab account (voicelab.uz). Add it to .env.local to enable STT/TTS."
    );
  }
  return { apiKey, baseUrl };
}

type SttTranscription = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  transcript?: string;
  error?: string;
};

/** Speech-to-text: raw audio bytes in, Uzbek transcript out. */
export async function speechToText(audio: Buffer, mimeType: string): Promise<string> {
  const { apiKey, baseUrl } = requireConfig();

  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(audio)], { type: mimeType }), audioFileName(mimeType));
  form.append("language", "uz");
  form.append("include_speakers", "false");

  const submitRes = await time("voicelab.stt.submit", () =>
    fetch(`${baseUrl}/stt`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: form,
    })
  );

  if (!submitRes.ok) {
    throw new Error(`VoiceLab STT so'rovi muvaffaqiyatsiz: ${submitRes.status} ${await submitRes.text()}`);
  }

  const submitted = (await submitRes.json()) as SttTranscription;

  // Synchronous short clips can come back already completed.
  if (submitted.status === "completed") {
    mark("voicelab.stt.completedSynchronously");
    return submitted.transcript?.trim() ?? "";
  }

  const pollStart = Date.now();
  let pollCount = 0;
  const deadline = Date.now() + STT_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, STT_POLL_INTERVAL_MS));
    pollCount++;

    const pollRes = await fetch(`${baseUrl}/stt/transcriptions/${submitted.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!pollRes.ok) continue;

    const polled = (await pollRes.json()) as SttTranscription;
    if (polled.status === "completed") {
      mark("voicelab.stt.poll.total", { pollCount, ms: Date.now() - pollStart });
      return polled.transcript?.trim() ?? ""; // empty = no speech in the clip, not a failure
    }
    if (polled.status === "failed") {
      throw new Error(`VoiceLab STT muvaffaqiyatsiz tugadi: ${polled.error ?? "noma'lum xato"}`);
    }
  }

  mark("voicelab.stt.poll.timeout", { pollCount, ms: Date.now() - pollStart });
  throw new Error("VoiceLab STT javob berish vaqti tugadi");
}

/** Text-to-speech: Uzbek text in, audio bytes (wav) out. */
export async function textToSpeech(text: string): Promise<Buffer> {
  const { apiKey, baseUrl } = requireConfig();
  const voiceId = process.env.VOICELAB_VOICE_ID ?? "voice_01J9NEUTRAL0000000000000001"; // Gulnoza — calm, balanced uz voice

  const res = await time("voicelab.tts.request", () =>
    fetch(`${baseUrl}/tts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ text, language: "uz", voice_id: voiceId, speed: 1 }),
    })
  );

  if (!res.ok) {
    throw new Error(`VoiceLab TTS so'rovi muvaffaqiyatsiz: ${res.status} ${await res.text()}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function isVoiceLabConfigured() {
  return Boolean(process.env.VOICELAB_API_KEY);
}
