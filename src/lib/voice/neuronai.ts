// NeuronAI (neuronai.uz) — Uzbek-specialized STT/TTS over REST, used as a fallback
// when VoiceLab is unavailable. API reference discovered via its published OpenAPI
// specs: https://my.neuronai.uz/docs/api/{text-to-speech,speech-to-text}/openapi.json
//
// Both endpoints are synchronous — no polling needed, unlike VoiceLab's async STT.

function requireConfig() {
  const apiKey = process.env.NEURONAI_API_KEY;
  const baseUrl = process.env.NEURONAI_API_BASE_URL ?? "https://my.neuronai.uz/api";
  if (!apiKey) {
    throw new Error(
      "NEURONAI_API_KEY is not set — add it to .env.local to enable it as a voice fallback."
    );
  }
  return { apiKey, baseUrl };
}

type SttResponse = {
  success: boolean;
  data?: { text: string };
  error?: string;
};

/** Speech-to-text: raw audio bytes in, Uzbek transcript out. */
export async function speechToText(audio: Buffer, mimeType: string): Promise<string> {
  const { apiKey, baseUrl } = requireConfig();

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), "voice.webm");
  form.append("language", "uz");

  const res = await fetch(`${baseUrl}/v2/stt/transcribe`, {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: form,
  });

  const data = (await res.json()) as SttResponse;
  if (!res.ok || !data.success || !data.data?.text) {
    throw new Error(`NeuronAI STT so'rovi muvaffaqiyatsiz: ${res.status} ${data.error ?? ""}`);
  }
  return data.data.text;
}

/** Text-to-speech: Uzbek text in, audio bytes (wav) out. */
export async function textToSpeech(text: string): Promise<Buffer> {
  const { apiKey, baseUrl } = requireConfig();
  const voiceId = process.env.NEURONAI_VOICE_ID ?? "madina"; // calm uz female voice

  const res = await fetch(`${baseUrl}/v3/tts/synthesize`, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ voice_id: voiceId, text, language: "uz", quality: "standard" }),
  });

  if (!res.ok) {
    throw new Error(`NeuronAI TTS so'rovi muvaffaqiyatsiz: ${res.status} ${await res.text()}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function isNeuronAiConfigured() {
  return Boolean(process.env.NEURONAI_API_KEY);
}
