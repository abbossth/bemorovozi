import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
});

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

  await connectDB();
  // Upsert by endpoint: a browser has one endpoint, so this also moves it to whoever is logged in now.
  await PushSubscription.findOneAndUpdate(
    { endpoint: parsed.data.endpoint },
    {
      staffId: staff._id,
      hospitalId: staff.hospitalId,
      keys: parsed.data.keys,
      userAgent: request.headers.get("user-agent")?.slice(0, 200),
    },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  const parsed = z.object({ endpoint: z.string().url() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

  await connectDB();
  await PushSubscription.deleteOne({ endpoint: parsed.data.endpoint, staffId: staff._id });
  return NextResponse.json({ ok: true });
}
