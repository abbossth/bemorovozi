import Anthropic from "@anthropic-ai/sdk";
import { buildClassificationPrompt, buildVoiceTurnPrompt } from "./prompts";
import type {
  AiProvider,
  ClassificationInput,
  ClassificationResult,
  VoiceDialogueResult,
  VoiceTurn,
} from "./types";

const MODEL = "claude-sonnet-5";

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set — add it to .env.local");
  return new Anthropic({ apiKey });
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude response did not contain JSON");
  return JSON.parse(match[0]);
}

export const anthropicProvider: AiProvider = {
  async classifyFeedback(input: ClassificationInput): Promise<ClassificationResult> {
    const anthropic = client();
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `${buildClassificationPrompt(input)}\n\nJavobni FAQAT JSON sifatida qaytaring, boshqa hech qanday matnsiz.`,
        },
      ],
    });
    const text = message.content.find((c) => c.type === "text")?.text ?? "";
    return extractJson(text) as ClassificationResult;
  },

  async voiceDialogueTurn(history: VoiceTurn[]): Promise<VoiceDialogueResult> {
    const anthropic = client();
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `${buildVoiceTurnPrompt(history)}\n\nJavobni FAQAT JSON sifatida qaytaring, boshqa hech qanday matnsiz.`,
        },
      ],
    });
    const text = message.content.find((c) => c.type === "text")?.text ?? "";
    return extractJson(text) as VoiceDialogueResult;
  },
};
