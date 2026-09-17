import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Feedback from "@/models/Feedback";
import Department from "@/models/Department";

const CLUSTER_WINDOW_DAYS = 14;
const CLUSTER_MIN_COUNT = 3;

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  await connectDB();

  const [items, departments] = await Promise.all([
    Feedback.find({ hospitalId: staff.hospitalId }).sort({ createdAt: -1 }).limit(200).lean(),
    Department.find({ hospitalId: staff.hospitalId }).lean(),
  ]);

  const deptNameById = new Map(departments.map((d) => [String(d._id), d.name]));

  const windowStart = new Date(Date.now() - CLUSTER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const clusterCounts = new Map<string, number>();
  for (const item of items) {
    if (new Date(item.createdAt) < windowStart) continue;
    clusterCounts.set(item.issueTag, (clusterCounts.get(item.issueTag) ?? 0) + 1);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = items.filter((i) => new Date(i.createdAt) >= todayStart).length;
  const highCount = items.filter((i) => i.severity === "yuqori" && i.status !== "hal_qilindi").length;

  const resolved = items.filter((i) => i.status === "hal_qilindi");
  const avgResponseMinutes = resolved.length
    ? Math.round(
        resolved.reduce((sum, i) => sum + (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()), 0) /
          resolved.length /
          60000
      )
    : null;

  return NextResponse.json({
    items: items.map((item) => ({
      id: String(item._id),
      excerpt: item.transcript,
      summary: item.aiSummary,
      dept: deptNameById.get(String(item.departmentId)) ?? "Noma'lum bo'lim",
      severity: item.severity,
      status: item.status,
      channel: item.channel,
      trackingCode: item.trackingCode,
      createdAt: item.createdAt,
      isSystemic: (clusterCounts.get(item.issueTag) ?? 0) >= CLUSTER_MIN_COUNT,
      clusterCount: clusterCounts.get(item.issueTag) ?? 1,
    })),
    stats: {
      todayCount,
      highCount,
      avgResponseMinutes,
    },
  });
}
