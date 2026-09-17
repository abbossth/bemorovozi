// Aisha AI (aisha.group) — Uzbek-specialized STT/TTS over REST.
// Endpoint paths below follow Aisha's published REST shape as of this writing;
// verify against your account's API docs once AISHA_API_KEY is set, since exact
// paths can differ per plan/version.

function requireConfig() {
  const apiKey = process.env.AISHA_API_KEY;
  const baseUrl = process.env.AISHA_API_BASE_URL ?? "https://api.aisha.group";
  if (!apiKey) {
    throw new Error(
      "AISHA_API_KEY is not set — voice mode needs an Aisha AI account (aisha.group). Add it to .env.local to enable STT/TTS."
    );
  }
  return { apiKey, baseUrl };
}

/** Speech-to-text: raw audio bytes in, Uzbek transcript out. */
export async function speechToText(audio: Buffer, mimeType: string): Promise<string> {
  const { apiKey, baseUrl } = requireConfig();

  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(audio)], { type: mimeType }), "voice.webm");
  form.append("language", "uz");

  const res = await fetch(`${baseUrl}/api/v1/stt`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Aisha STT so'rovi muvaffaqiyatsiz: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new Error("Aisha STT bo'sh transkript qaytardi");
  return data.text;
}

/** Text-to-speech: Uzbek text in, audio bytes (mp3) out. */
export async function textToSpeech(text: string): Promise<Buffer> {
  const { apiKey, baseUrl } = requireConfig();

  const res = await fetch(`${baseUrl}/api/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, language: "uz" }),
  });

  if (!res.ok) {
    throw new Error(`Aisha TTS so'rovi muvaffaqiyatsiz: ${res.status} ${await res.text()}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function isAishaConfigured() {
  return Boolean(process.env.AISHA_API_KEY);
}
