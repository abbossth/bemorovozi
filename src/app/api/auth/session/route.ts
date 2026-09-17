import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";
import { SESSION_COOKIE } from "@/lib/session";

const bodySchema = z.object({ idToken: z.string() });
const SESSION_EXPIRES_IN = 60 * 60 * 24 * 5 * 1000; // 5 days, matches cookie maxAge below

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(parsed.data.idToken);

    await connectDB();
    const staff = await Staff.findOne({ firebaseUid: decoded.uid });
    if (!staff) {
      return NextResponse.json(
        { error: "Hisobingiz shifoxona xodimi sifatida ro'yxatdan o'tmagan. Ma'muriyat bilan bog'laning." },
        { status: 403 }
      );
    }

    const sessionCookie = await adminAuth().createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_EXPIRES_IN,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN / 1000,
    });
    return response;
  } catch (error) {
    console.error("[api/auth/session] failed:", error);
    return NextResponse.json({ error: "Kirishda xatolik yuz berdi" }, { status: 401 });
  }
}
