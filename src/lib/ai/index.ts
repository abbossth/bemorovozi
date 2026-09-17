import type { AiProvider } from "./types";
import { geminiProvider } from "./gemini";
import { anthropicProvider } from "./anthropic";

export * from "./types";

function resolveProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  if (provider === "anthropic") return anthropicProvider;
  return geminiProvider;
}

export function normalizeIssueTag(tag: string) {
  return tag
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const ai: AiProvider = {
  classifyFeedback: async (input) => {
    const result = await resolveProvider().classifyFeedback(input);
    return { ...result, issueTag: normalizeIssueTag(result.issueTag) };
  },
  voiceDialogueTurn: (history) => resolveProvider().voiceDialogueTurn(history),
};
