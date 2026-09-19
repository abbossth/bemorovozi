import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Hospital from "@/models/Hospital";

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  await connectDB();
  const hospital = await Hospital.findById(staff.hospitalId).lean();
  if (!hospital) return NextResponse.json({ error: "Shifoxona topilmadi" }, { status: 404 });

  return NextResponse.json({ name: hospital.name, canEdit: staff.role === "admin" });
}

const updateSchema = z.object({
  name: z.string().trim().min(2, "Nomi juda qisqa").max(80, "Nomi juda uzun"),
});

// The name is what the AI assistant greets patients with ("Salom, {name} klinikasiga…"), so it is
// admin-only: it changes what every patient of this hospital sees and hears.
export async function PATCH(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Shifoxona nomini faqat administrator o'zgartira oladi" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov" }, { status: 400 });
  }

  await connectDB();
  const hospital = await Hospital.findByIdAndUpdate(
    staff.hospitalId,
    { name: parsed.data.name },
    { returnDocument: "after" }
  ).lean();
  if (!hospital) return NextResponse.json({ error: "Shifoxona topilmadi" }, { status: 404 });

  return NextResponse.json({ name: hospital.name });
}
