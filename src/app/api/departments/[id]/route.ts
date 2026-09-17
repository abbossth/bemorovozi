import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Department from "@/models/Department";
import Feedback from "@/models/Feedback";

const updateSchema = z.object({ name: z.string().min(2, "Nomi juda qisqa") });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

  await connectDB();
  const department = await Department.findOneAndUpdate(
    { _id: id, hospitalId: staff.hospitalId },
    { name: parsed.data.name },
    { returnDocument: "after" }
  );
  if (!department) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  return NextResponse.json({ id: String(department._id), name: department.name });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const feedbackCount = await Feedback.countDocuments({ departmentId: id, hospitalId: staff.hospitalId });
  if (feedbackCount > 0) {
    return NextResponse.json(
      { error: "Bu bo'limda mavjud xabarlar bor — avval ularni arxivlang yoki boshqa bo'limga o'tkazing." },
      { status: 409 }
    );
  }

  const result = await Department.deleteOne({ _id: id, hospitalId: staff.hospitalId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
