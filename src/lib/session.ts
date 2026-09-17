import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";

export const SESSION_COOKIE = "bo_session";

export async function getCurrentStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    await connectDB();
    const staff = await Staff.findOne({ firebaseUid: decoded.uid }).lean();
    if (!staff) return null;
    return staff;
  } catch {
    return null;
  }
}
