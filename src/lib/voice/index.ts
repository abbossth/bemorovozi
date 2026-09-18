// Voice provider with automatic failover: VoiceLab is primary, NeuronAI is the
// fallback used transparently if VoiceLab is unavailable or errors out — the
// patient's voice flow should keep working even if one provider is down.

import * as voicelab from "./voicelab";
import * as neuronai from "./neuronai";
import { time, mark } from "@/lib/timing";

export async function speechToText(audio: Buffer, mimeType: string): Promise<string> {
  return time("voice.stt.total", async () => {
    try {
      return await voicelab.speechToText(audio, mimeType);
    } catch (error) {
      if (!neuronai.isNeuronAiConfigured()) throw error;
      mark("voice.stt.fallbackToNeuronAi");
      console.error("[voice] VoiceLab STT failed, falling back to NeuronAI:", error);
      return time("voice.stt.neuronaiFallback", () => neuronai.speechToText(audio, mimeType));
    }
  });
}

export async function textToSpeech(text: string): Promise<Buffer> {
  return time("voice.tts.total", async () => {
    try {
      return await voicelab.textToSpeech(text);
    } catch (error) {
      if (!neuronai.isNeuronAiConfigured()) throw error;
      mark("voice.tts.fallbackToNeuronAi");
      console.error("[voice] VoiceLab TTS failed, falling back to NeuronAI:", error);
      return time("voice.tts.neuronaiFallback", () => neuronai.textToSpeech(text));
    }
  });
}
