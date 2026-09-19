import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Feedback from "@/models/Feedback";
import Department from "@/models/Department";
import { buildClusters, CLUSTER_MIN_COUNT, CLUSTER_WINDOW_DAYS } from "@/lib/clusters";
import { humanizeTag } from "@/lib/ui/format";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS = 500;
const WEEKDAYS = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

/** Midnight of `date`'s day in a timezone `offsetMinutes` east of UTC, as a real instant. */
function startOfDay(date: Date, offsetMinutes: number) {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offsetMinutes * 60_000);
}

function offsetString(offsetMinutes: number) {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 });

  // "Today" and the daily buckets must follow the viewer's clock, not the server's (UTC on Vercel).
  const tzParam = Number(new URL(request.url).searchParams.get("tz"));
  const tz = Number.isFinite(tzParam) ? Math.max(-720, Math.min(840, Math.round(tzParam))) : 300;

  await connectDB();

  const now = new Date();
  const todayStart = startOfDay(now, tz);
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const clusterStart = new Date(now.getTime() - CLUSTER_WINDOW_DAYS * DAY_MS);
  const hospitalId = staff.hospitalId;

  const [items, departments, todayCount, highCount, resolvedAvg, perDay, clusterRows] = await Promise.all([
    Feedback.find({ hospitalId }).sort({ createdAt: -1 }).limit(MAX_ITEMS).lean(),
    Department.find({ hospitalId }).lean(),
    Feedback.countDocuments({ hospitalId, createdAt: { $gte: todayStart } }),
    Feedback.countDocuments({ hospitalId, severity: "yuqori", status: { $ne: "hal_qilindi" } }),
    Feedback.aggregate([
      { $match: { hospitalId, status: "hal_qilindi", updatedAt: { $gte: new Date(now.getTime() - 30 * DAY_MS) } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ["$updatedAt", "$createdAt"] } } } },
    ]),
    Feedback.aggregate([
      { $match: { hospitalId, createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: offsetString(tz) } },
          count: { $sum: 1 },
        },
      },
    ]),
    Feedback.find({ hospitalId, createdAt: { $gte: clusterStart } }).select("issueTag createdAt").lean(),
  ]);

  const deptNameById = new Map(departments.map((d) => [String(d._id), d.name]));
  const { systemic, clusterOf } = buildClusters(
    clusterRows.map((r) => ({ id: String(r._id), issueTag: r.issueTag, createdAt: r.createdAt }))
  );

  const countByDay = new Map<string, number>(perDay.map((d: { _id: string; count: number }) => [d._id, d.count]));
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(todayStart.getTime() - (6 - i) * DAY_MS);
    const local = new Date(dayStart.getTime() + tz * 60_000); // wall-clock date in the viewer's timezone
    const date = local.toISOString().slice(0, 10);
    return { date, label: WEEKDAYS[local.getUTCDay()], count: countByDay.get(date) ?? 0, isToday: i === 6 };
  });

  const avgMs = resolvedAvg[0]?.avgMs as number | undefined;

  return NextResponse.json({
    items: items.map((item) => {
      const cluster = clusterOf.get(String(item._id));
      return {
        id: String(item._id),
        excerpt: item.transcript,
        summary: item.aiSummary,
        dept: deptNameById.get(String(item.departmentId)) ?? "Noma'lum bo'lim",
        severity: item.severity,
        status: item.status,
        channel: item.channel,
        trackingCode: item.trackingCode,
        createdAt: item.createdAt,
        kind: item.kind ?? "shikoyat",
        room: item.roomOrWard ?? null,
        staffName: item.staffName ?? null,
        occurredAt: item.occurredAt ?? null,
        routedToManagement: item.routedToManagement ?? false,
        reviewedByName: item.reviewedByName ?? null,
        resolvedByName: item.resolvedByName ?? null,
        conversation: item.conversation ?? null,
        isSystemic: Boolean(cluster),
        clusterCount: cluster?.count ?? 1,
      };
    }),
    stats: {
      todayCount,
      highCount,
      avgResponseMinutes: avgMs != null ? Math.round(avgMs / 60000) : null,
    },
    overview: {
      last7Days,
      clusterWindowDays: CLUSTER_WINDOW_DAYS,
      clusterMinCount: CLUSTER_MIN_COUNT,
      systemicClusters: systemic.length,
      topClusters: systemic.slice(0, 3).map((c) => ({ label: humanizeTag(c.tag), count: c.count })),
    },
  });
}
