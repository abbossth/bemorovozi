import Anthropic from "@anthropic-ai/sdk";
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
          content: `Siz o'zbekiston shifoxonasidagi bemorlar fikr-mulohazasini tahlil qiluvchi yordamchisiz.

Bemor bo'limi tanlagan: "${input.departmentName}"
Mavjud bo'limlar ro'yxati: ${input.availableDepartments.join(", ")}

Bemor xabari:
"""
${input.transcript}
"""

Faqat JSON qaytaring: { "severity": "past"|"orta"|"yuqori", "summary": string, "suggestedDepartment": string, "issueTag": string }`,
        },
      ],
    });
    const text = message.content.find((c) => c.type === "text")?.text ?? "";
    return extractJson(text) as ClassificationResult;
  },

  async voiceDialogueTurn(history: VoiceTurn[]): Promise<VoiceDialogueResult> {
    const anthropic = client();
    const turnCount = history.filter((t) => t.role === "patient").length;
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Siz shifoxonadagi bemor bilan ovozli suhbatlashayotgan mehribon AI yordamchisiz. Ismini so'ramang.
Bemor ${turnCount} marta gapirdi. 2 yoki undan ko'p bo'lsa, suhbatni yakunlang (done: true).

Suhbat tarixi:
${history.map((t) => `${t.role === "ai" ? "Yordamchi" : "Bemor"}: ${t.text}`).join("\n")}

Faqat JSON qaytaring: { "reply": string, "done": boolean }`,
        },
      ],
    });
    const text = message.content.find((c) => c.type === "text")?.text ?? "";
    return extractJson(text) as VoiceDialogueResult;
  },
};
