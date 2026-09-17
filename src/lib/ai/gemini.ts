import { GoogleGenAI, Type } from "@google/genai";
import { withRetry } from "@/lib/retry";
import type {
  AiProvider,
  ClassificationInput,
  ClassificationResult,
  VoiceDialogueResult,
  VoiceTurn,
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
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Siz o'zbekiston shifoxonasidagi bemorlar fikr-mulohazasini tahlil qiluvchi yordamchisiz.
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
        },
      ],
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
    }));

    const raw = response.text;
    if (!raw) throw new Error("Gemini classification returned an empty response");
    return JSON.parse(raw) as ClassificationResult;
  },

  async voiceDialogueTurn(history: VoiceTurn[]): Promise<VoiceDialogueResult> {
    const ai = client();
    const turnCount = history.filter((t) => t.role === "patient").length;
    const response = await withRetry(() => ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Siz shifoxonadagi bemor bilan ovozli suhbatlashayotgan mehribon AI yordamchisiz. Bemor to'liq anonim — ismini so'ramang.
Vazifangiz: bemorning muammosini 2-3 savolda aniqlashtirish, so'ng suhbatni yakunlash.

Hozirgacha bemor ${turnCount} marta gapirdi. Agar bu 2 yoki undan ko'p bo'lsa, muammoni tasdiqlab, suhbatni yakunlang (done: true) va rahmat ayting.

Suhbat tarixi:
${history.map((t) => `${t.role === "ai" ? "Yordamchi" : "Bemor"}: ${t.text}`).join("\n")}

Javobni faqat quyidagi JSON formatda qaytaring:
- reply: yordamchining keyingi o'zbekcha javobi (qisqa, tabiiy, bir yoki ikki jumla)
- done: suhbatni yakunlash vaqti kelganini bildiruvchi boolean`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            done: { type: Type.BOOLEAN },
          },
          required: ["reply", "done"],
        },
      },
    }));

    const raw = response.text;
    if (!raw) throw new Error("Gemini dialogue turn returned an empty response");
    return JSON.parse(raw) as VoiceDialogueResult;
  },
};
