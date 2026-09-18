import { NextResponse } from "next/server";
import { z } from "zod";
import { createFeedback, DepartmentNotFoundError } from "@/lib/createFeedback";

const bodySchema = z.object({
  hospitalId: z.string(),
  departmentId: z.string(),
  channel: z.enum(["text", "voice"]),
  transcript: z.string().min(3, "Xabar juda qisqa"),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov" }, { status: 400 });
    }

    const feedback = await createFeedback({ ...parsed.data, source: "web" });
    return NextResponse.json({ trackingCode: feedback.trackingCode });
  } catch (error) {
    if (error instanceof DepartmentNotFoundError) {
      return NextResponse.json({ error: "Bo'lim topilmadi" }, { status: 404 });
    }
    console.error("[api/feedback] Unexpected error:", error);
    return NextResponse.json({ error: "Kutilmagan xatolik yuz berdi. Qaytadan urinib ko'ring." }, { status: 500 });
  }
}
