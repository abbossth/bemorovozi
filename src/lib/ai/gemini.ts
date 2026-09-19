import { GoogleGenAI, Type } from "@google/genai";
import { withRetry } from "@/lib/retry";
import { buildClassificationPrompt } from "./prompts";
import type {
  AiProvider,
  ClassificationInput,
  ClassificationResult,
} from "./types";

const MODEL = "gemini-3.6-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set — add it to .env.local");
  return new GoogleGenAI({ apiKey });
}

export const geminiProvider: AiProvider = {
  async classifyFeedback(input: ClassificationInput): Promise<ClassificationResult> {
    const ai = client();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: buildClassificationPrompt(input) }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING, enum: ["past", "orta", "yuqori"] },
              summary: { type: Type.STRING },
              suggestedDepartment: { type: Type.STRING },
              issueTag: { type: Type.STRING },
            },
            required: ["severity", "summary", "suggestedDepartment", "issueTag"],
          },
        },
      })
    );

    const raw = response.text;
    if (!raw) throw new Error("Gemini classification returned an empty response");
    return JSON.parse(raw) as ClassificationResult;
  },
};
