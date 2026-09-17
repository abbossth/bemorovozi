import { NextResponse } from "next/server";
import { z } from "zod";
import { ai } from "@/lib/ai";

const bodySchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(["ai", "patient"]),
      text: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
    }

    const result = await ai.voiceDialogueTurn(parsed.data.history);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/voice/turn] Unexpected error:", error);
    return NextResponse.json(
      { error: "Yordamchi hozircha javob bera olmadi. Birozdan so'ng qayta urinib ko'ring." },
      { status: 502 }
    );
  }
}
