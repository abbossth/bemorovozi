import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";
import Feedback from "@/models/Feedback";
import Department from "@/models/Department";
import { getStaffBot } from "@/lib/telegram/staffBot";
import { SEVERITY_LABEL } from "@/lib/telegram/format";
import type { Severity } from "@/lib/ai/types";

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Triggered by a Vercel Cron (see vercel.json) — sends staff who opted into
// "digest" mode a periodic summary of non-critical (orta/past) feedback since
// their last digest. "Yuqori" severity never waits for this — it's always
// sent immediately by notifyStaffForFeedback.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });
  }

  await connectDB();

  const staffList = await Staff.find({
    telegramChatId: { $exists: true, $ne: null },
    telegramNotificationMode: "digest",
  });

  const bot = getStaffBot();
  let sent = 0;

  for (const staff of staffList) {
    const since = staff.telegramLastDigestAt ?? new Date(Date.now() - DEFAULT_WINDOW_MS);
    const items = await Feedback.find({
      hospitalId: staff.hospitalId,
      severity: { $in: ["orta", "past"] },
      createdAt: { $gt: since },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (items.length === 0) {
      staff.telegramLastDigestAt = new Date();
      await staff.save();
      continue;
    }

    const departments = await Department.find({ hospitalId: staff.hospitalId }).select("name").lean();
    const deptNameById = new Map(departments.map((d) => [String(d._id), d.name]));

    const highOrtaCount = items.filter((i) => i.severity === "orta").length;
    const pastCount = items.filter((i) => i.severity === "past").length;

    const lines = items
      .slice(0, 10)
      .map((i) => `• ${SEVERITY_LABEL[i.severity as Severity]} — ${deptNameById.get(String(i.departmentId)) ?? ""}: ${i.transcript.slice(0, 80)}`);

    const text =
      `📋 <b>Kunlik xulosa</b>\n\n` +
      `O'rta: ${highOrtaCount} ta, Past: ${pastCount} ta\n\n` +
      lines.join("\n") +
      (items.length > 10 ? `\n\n... va yana ${items.length - 10} ta xabar. Boshqaruv panelida to'liq ro'yxatni ko'ring.` : "");

    try {
      await bot.api.sendMessage(staff.telegramChatId!, text, { parse_mode: "HTML" });
      sent++;
    } catch (error) {
      console.error(`[telegram/staff/digest] Failed to send to staff ${staff._id}:`, error);
    }

    staff.telegramLastDigestAt = new Date();
    await staff.save();
  }

  return NextResponse.json({ ok: true, digestsSent: sent });
}
