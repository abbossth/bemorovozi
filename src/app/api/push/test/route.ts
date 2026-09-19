import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";
import { isPushConfigured, sendPush } from "@/lib/push/send";
import { TEST_PAYLOAD } from "@/lib/push/payload";

// "Test bildirishnoma yuborish" in Sozlamalar: sends only to the caller's own devices.
export async function POST() {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Bildirishnomalar serverda sozlanmagan" }, { status: 503 });
  }

  await connectDB();
  const subscriptions = await PushSubscription.find({ staffId: staff._id }).lean();
  if (subscriptions.length === 0) {
    return NextResponse.json({ error: "Bu qurilmada bildirishnoma yoqilmagan" }, { status: 409 });
  }

  const result = await sendPush(subscriptions, TEST_PAYLOAD);
  return NextResponse.json(result);
}
