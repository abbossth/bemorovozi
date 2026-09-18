import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";

const bodySchema = z.object({ status: z.enum(["yangi", "bogolanildi", "yopildi"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

  await connectDB();
  const lead = await Lead.findByIdAndUpdate(id, { status: parsed.data.status }, { returnDocument: "after" });
  if (!lead) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  return NextResponse.json({ ok: true, status: lead.status });
}
