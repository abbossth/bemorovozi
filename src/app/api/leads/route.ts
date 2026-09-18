import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getCurrentStaff } from "@/lib/session";
import { notifyStaffForLead } from "@/lib/telegram/notifyStaff";

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
  const lead = await Lead.create(parsed.data);

  notifyStaffForLead(lead).catch((error) => {
    console.error("[api/leads] Staff notification failed:", error);
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  await connectDB();
  const leads = await Lead.find().sort({ createdAt: -1 }).lean();

  return NextResponse.json({
    items: leads.map((l) => ({
      id: String(l._id),
      source: l.source,
      organizationName: l.organizationName,
      contactName: l.contactName,
      phone: l.phone,
      email: l.email ?? "",
      message: l.message ?? "",
      plan: l.plan ?? "",
      status: l.status,
      createdAt: l.createdAt,
    })),
  });
}
