import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import TelegramLinkToken from "@/models/TelegramLinkToken";
import Staff from "@/models/Staff";

const TOKEN_TTL_MS = 10 * 60 * 1000;

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  return NextResponse.json({
    connected: Boolean(staff.telegramChatId),
    notificationMode: staff.telegramNotificationMode ?? "realtime",
  });
}

const patchSchema = z.object({ notificationMode: z.enum(["realtime", "digest"]) });

export async function PATCH(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

  await connectDB();
  await Staff.findByIdAndUpdate(staff._id, { telegramNotificationMode: parsed.data.notificationMode });

  return NextResponse.json({ ok: true });
}

export async function POST() {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  await connectDB();

  const token = crypto.randomBytes(24).toString("base64url");
  await TelegramLinkToken.create({
    token,
    staffId: staff._id,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  const botUsername = process.env.TELEGRAM_STAFF_BOT_USERNAME;
  const deepLink = botUsername ? `https://t.me/${botUsername}?start=${token}` : null;

  return NextResponse.json({ token, deepLink, expiresInSeconds: TOKEN_TTL_MS / 1000 });
}

export async function DELETE() {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  await connectDB();
  await Staff.findByIdAndUpdate(staff._id, { $unset: { telegramChatId: 1 } });

  return NextResponse.json({ ok: true });
}
