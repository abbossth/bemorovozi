// Voice providers with automatic failover. NeuronAI is the primary (VOICE_PROVIDER=voicelab
// flips the order); the other one is used transparently if it errors, so the patient's
// voice flow keeps working when one provider is down.
//
// An empty transcript is NOT an error — it means "no speech in this clip" and is returned
// as-is. Falling back to another provider on it would only get a second opinion on silence.
// A provider that reports it is out of credits is skipped for a few minutes so a dead
// account doesn't add a failed round-trip to every single turn.

import * as voicelab from "./voicelab";
import * as neuronai from "./neuronai";
import { time, mark } from "@/lib/timing";

type VoiceProvider = {
  name: string;
  isConfigured: () => boolean;
  speechToText: (audio: Buffer, mimeType: string) => Promise<string>;
  textToSpeech: (text: string) => Promise<Buffer>;
};

const NEURONAI: VoiceProvider = { name: "neuronai", isConfigured: neuronai.isNeuronAiConfigured, ...neuronai };
const VOICELAB: VoiceProvider = { name: "voicelab", isConfigured: voicelab.isVoiceLabConfigured, ...voicelab };

const BILLING_COOLDOWN_MS = 5 * 60 * 1000;
const cooldownUntil = new Map<string, number>();

function isBillingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /\b402\b|insufficient|balance|credit/i.test(message);
}

function providersInOrder(): VoiceProvider[] {
  const ordered = process.env.VOICE_PROVIDER === "voicelab" ? [VOICELAB, NEURONAI] : [NEURONAI, VOICELAB];
  const configured = ordered.filter((p) => p.isConfigured());
  const now = Date.now();
  const available = configured.filter((p) => (cooldownUntil.get(p.name) ?? 0) <= now);
  // If every provider is cooling down, still try them all rather than fail without trying.
  return available.length > 0 ? available : configured;
}

async function withFailover<T>(operation: "stt" | "tts", run: (provider: VoiceProvider) => Promise<T>): Promise<T> {
  const candidates = providersInOrder();
  if (candidates.length === 0) {
    throw new Error("No voice provider configured — set NEURONAI_API_KEY or VOICELAB_API_KEY");
  }

  let lastError: unknown;
  for (const provider of candidates) {
    try {
      return await time(`voice.${operation}.${provider.name}`, () => run(provider));
    } catch (error) {
      lastError = error;
      if (isBillingError(error)) cooldownUntil.set(provider.name, Date.now() + BILLING_COOLDOWN_MS);
      mark(`voice.${operation}.providerFailed`, { provider: provider.name });
      console.error(`[voice] ${provider.name} ${operation} failed:`, error);
    }
  }
  throw lastError;
}

export async function speechToText(audio: Buffer, mimeType: string): Promise<string> {
  return time("voice.stt.total", () => withFailover("stt", (p) => p.speechToText(audio, mimeType)));
}

export async function textToSpeech(text: string): Promise<Buffer> {
  return time("voice.tts.total", () => withFailover("tts", (p) => p.textToSpeech(text)));
}

/** Test hook: forget which providers are cooling down. */
export function resetVoiceProviderCooldowns() {
  cooldownUntil.clear();
}
