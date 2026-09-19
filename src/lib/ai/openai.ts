import OpenAI from "openai";
import { withRetry } from "@/lib/retry";
import { time } from "@/lib/timing";
import { buildClassificationPrompt } from "./prompts";
import type {
  AiProvider,
  ClassificationInput,
  ClassificationResult,
} from "./types";

// gpt-4.1-mini: fast (~1.3-1.7s measured for this task), cheap, direct output
// (no hidden reasoning-token overhead like gpt-5-mini has) — picked specifically
// for latency in the BOSQICH 2 profiling-driven optimization pass, not just as
// a Gemini-quota workaround.
const MODEL = "gpt-4.1-mini";

function client() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set — add it to .env.local");
  return new OpenAI({ apiKey });
}

export const openaiProvider: AiProvider = {
  async classifyFeedback(input: ClassificationInput): Promise<ClassificationResult> {
    const openai = client();
    const response = await time("openai.classifyFeedback", () =>
      withRetry(() =>
        openai.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: buildClassificationPrompt(input) }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "classification",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  severity: { type: "string", enum: ["past", "orta", "yuqori"] },
                  summary: { type: "string" },
                  suggestedDepartment: { type: "string" },
                  issueTag: { type: "string" },
                },
                required: ["severity", "summary", "suggestedDepartment", "issueTag"],
                additionalProperties: false,
              },
            },
          },
        })
      )
    );

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAI classification returned an empty response");
    return JSON.parse(raw) as ClassificationResult;
  },
};
