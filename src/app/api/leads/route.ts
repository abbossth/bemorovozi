import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";

const bodySchema = z.object({
  source: z.enum(["demo", "narxlar_b2b", "narxlar_b2g", "pilot"]),
  organizationName: z.string().min(2, "Tashkilot nomini kiriting"),
  contactName: z.string().min(2, "Ismingizni kiriting"),
  phone: z.string().min(7, "Telefon raqamini kiriting"),
  email: z.string().email().optional().or(z.literal("")),
  message: z.string().optional(),
  plan: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov" }, { status: 400 });
  }

  await connectDB();
  await Lead.create(parsed.data);

  return NextResponse.json({ ok: true });
}
