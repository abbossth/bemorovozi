import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Department from "@/models/Department";
import { patientFormUrl, qrDataUrl } from "@/lib/qr";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  await connectDB();
  const departments = await Department.find({ hospitalId: staff.hospitalId }).sort({ createdAt: 1 }).lean();

  const items = await Promise.all(
    departments.map(async (d) => ({
      id: String(d._id),
      name: d.name,
      url: patientFormUrl(String(staff.hospitalId), String(d._id)),
      qrDataUrl: await qrDataUrl(patientFormUrl(String(staff.hospitalId), String(d._id))),
    }))
  );

  return NextResponse.json({ items });
}

const createSchema = z.object({ name: z.string().min(2, "Nomi juda qisqa") });

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov" }, { status: 400 });
  }

  await connectDB();

  let qrSlug = slugify(parsed.data.name);
  const existingCount = await Department.countDocuments({ hospitalId: staff.hospitalId, qrSlug });
  if (existingCount > 0) qrSlug = `${qrSlug}-${existingCount + 1}`;

  const department = await Department.create({
    hospitalId: staff.hospitalId,
    name: parsed.data.name,
    qrSlug,
  });

  return NextResponse.json({
    id: String(department._id),
    name: department.name,
    url: patientFormUrl(String(staff.hospitalId), String(department._id)),
    qrDataUrl: await qrDataUrl(patientFormUrl(String(staff.hospitalId), String(department._id))),
  });
}
