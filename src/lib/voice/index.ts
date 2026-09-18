// Voice provider with automatic failover: VoiceLab is primary, NeuronAI is the
// fallback used transparently if VoiceLab is unavailable or errors out — the
// patient's voice flow should keep working even if one provider has an outage.

import * as voicelab from "./voicelab";
import * as neuronai from "./neuronai";

export async function speechToText(audio: Buffer, mimeType: string): Promise<string> {
  try {
    return await voicelab.speechToText(audio, mimeType);
  } catch (error) {
    if (!neuronai.isNeuronAiConfigured()) throw error;
    console.error("[voice] VoiceLab STT failed, falling back to NeuronAI:", error);
    return neuronai.speechToText(audio, mimeType);
  }
}

export async function textToSpeech(text: string): Promise<Buffer> {
  try {
    return await voicelab.textToSpeech(text);
  } catch (error) {
    if (!neuronai.isNeuronAiConfigured()) throw error;
    console.error("[voice] VoiceLab TTS failed, falling back to NeuronAI:", error);
    return neuronai.textToSpeech(text);
  }
}
