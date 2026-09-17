import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Feedback from "@/models/Feedback";

const bodySchema = z.object({ status: z.enum(["yangi", "korib_chiqilmoqda", "hal_qilindi"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

  await connectDB();

  const feedback = await Feedback.findOneAndUpdate(
    { _id: id, hospitalId: staff.hospitalId },
    { status: parsed.data.status },
    { new: true }
  );

  if (!feedback) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  return NextResponse.json({ ok: true, status: feedback.status });
}
