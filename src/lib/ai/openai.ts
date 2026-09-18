import OpenAI from "openai";
import { withRetry } from "@/lib/retry";
import { time } from "@/lib/timing";
import type {
  AiProvider,
  ClassificationInput,
  ClassificationResult,
  VoiceDialogueResult,
  VoiceTurn,
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
          messages: [
            {
              role: "user",
              content: `Siz o'zbekiston shifoxonasidagi bemorlar fikr-mulohazasini tahlil qiluvchi yordamchisiz.
Quyidagi bemor xabarini tahlil qiling va uni tasniflang.

Bemor bo'limi tanlagan: "${input.departmentName}"
Mavjud bo'limlar ro'yxati: ${input.availableDepartments.join(", ")}

Bemor xabari:
"""
${input.transcript}
"""

Javobni faqat quyidagi JSON formatda qaytaring:
- severity: "past" (kichik noqulaylik), "orta" (e'tibor talab qiladi), yoki "yuqori" (shifokorlar zudlik bilan ko'rib chiqishi kerak) bo'lgan jiddiylik darajasi
- summary: xabarning bir yoki ikki jumlali xolis, qisqa o'zbekcha xulosasi
- suggestedDepartment: mavjud bo'limlar ro'yxatidan eng mos keladigan bo'lim nomi
- issueTag: muammoning snake_case formatidagi qisqa lotin-o'zbekcha kodi (masalan "dori_vaqtida_berilmadi"), o'xshash xabarlarni guruhlash uchun ishlatiladi`,
            },
          ],
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

  async voiceDialogueTurn(history: VoiceTurn[]): Promise<VoiceDialogueResult> {
    const openai = client();
    const turnCount = history.filter((t) => t.role === "patient").length;
    const response = await time("openai.voiceDialogueTurn", () =>
      withRetry(() =>
        openai.chat.completions.create({
          model: MODEL,
          messages: [
            {
              role: "user",
              content: `Siz shifoxonadagi bemor bilan ovozli suhbatlashayotgan mehribon AI yordamchisiz. Bemor to'liq anonim — ismini so'ramang.
Vazifangiz: bemorning muammosini 2-3 savolda aniqlashtirish, so'ng suhbatni yakunlash.

Hozirgacha bemor ${turnCount} marta gapirdi. Agar bu 2 yoki undan ko'p bo'lsa, muammoni tasdiqlab, suhbatni yakunlang (done: true) va rahmat ayting.

Suhbat tarixi:
${history.map((t) => `${t.role === "ai" ? "Yordamchi" : "Bemor"}: ${t.text}`).join("\n")}

Javobni faqat quyidagi JSON formatda qaytaring:
- reply: yordamchining keyingi o'zbekcha javobi (qisqa, tabiiy, bir yoki ikki jumla)
- done: suhbatni yakunlash vaqti kelganini bildiruvchi boolean`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "voice_turn",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  reply: { type: "string" },
                  done: { type: "boolean" },
                },
                required: ["reply", "done"],
                additionalProperties: false,
              },
            },
          },
        })
      )
    );

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAI dialogue turn returned an empty response");
    return JSON.parse(raw) as VoiceDialogueResult;
  },
};
