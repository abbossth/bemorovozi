import type { AiProvider } from "./types";
import { geminiProvider } from "./gemini";
import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";

export * from "./types";

function resolveProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? "openai";
  if (provider === "anthropic") return anthropicProvider;
  if (provider === "gemini") return geminiProvider;
  return openaiProvider;
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
};
