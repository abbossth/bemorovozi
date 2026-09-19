import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./neuronai", () => ({
  speechToText: vi.fn(),
  textToSpeech: vi.fn(),
  isNeuronAiConfigured: () => true,
}));
vi.mock("./voicelab", () => ({
  speechToText: vi.fn(),
  textToSpeech: vi.fn(),
  isVoiceLabConfigured: () => true,
}));

import * as neuronai from "./neuronai";
import * as voicelab from "./voicelab";
import { speechToText, resetVoiceProviderCooldowns } from "./index";

const neuronStt = vi.mocked(neuronai.speechToText);
const voicelabStt = vi.mocked(voicelab.speechToText);
const audio = Buffer.from("x");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  delete process.env.VOICE_PROVIDER;
  resetVoiceProviderCooldowns();
});

describe("voice provider failover", () => {
  it("uses NeuronAI first and does not touch VoiceLab when it works", async () => {
    neuronStt.mockResolvedValue("salom");
    expect(await speechToText(audio, "audio/webm")).toBe("salom");
    expect(voicelabStt).not.toHaveBeenCalled();
  });

  it("returns an empty transcript as-is instead of treating it as a failure", async () => {
    neuronStt.mockResolvedValue("");
    expect(await speechToText(audio, "audio/webm")).toBe("");
    expect(voicelabStt).not.toHaveBeenCalled();
  });

  it("falls back to VoiceLab when NeuronAI errors", async () => {
    neuronStt.mockRejectedValue(new Error("NeuronAI STT so'rovi muvaffaqiyatsiz: 500"));
    voicelabStt.mockResolvedValue("zaxira");
    expect(await speechToText(audio, "audio/webm")).toBe("zaxira");
  });

  it("skips a provider that is out of credits on the following calls", async () => {
    neuronStt.mockRejectedValue(new Error("NeuronAI STT so'rovi muvaffaqiyatsiz: 402 Insufficient balance"));
    voicelabStt.mockResolvedValue("zaxira");

    await speechToText(audio, "audio/webm");
    await speechToText(audio, "audio/webm");

    expect(neuronStt).toHaveBeenCalledTimes(1); // second call went straight to VoiceLab
    expect(voicelabStt).toHaveBeenCalledTimes(2);
  });

  it("honors VOICE_PROVIDER=voicelab as the primary", async () => {
    process.env.VOICE_PROVIDER = "voicelab";
    voicelabStt.mockResolvedValue("voicelab");
    expect(await speechToText(audio, "audio/webm")).toBe("voicelab");
    expect(neuronStt).not.toHaveBeenCalled();
  });

  it("throws the last error when every provider fails", async () => {
    neuronStt.mockRejectedValue(new Error("boom 1"));
    voicelabStt.mockRejectedValue(new Error("boom 2"));
    await expect(speechToText(audio, "audio/webm")).rejects.toThrow("boom 2");
  });
});
