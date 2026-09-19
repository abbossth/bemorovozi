import { Tag } from "@/components/Tag";
import { LoadingRegion, Skeleton } from "@/components/Skeleton";
import { TONE } from "@/lib/ui/tones";

export type Overview = {
  last7Days: { date: string; label: string; count: number; isToday: boolean }[];
  clusterWindowDays: number;
  clusterMinCount: number;
  systemicClusters: number;
  topClusters: { label: string; count: number }[];
};

type Props = {
  overview: Overview | undefined;
  /** the report list is (re)loading — show placeholders instead of "no reports" */
  loading?: boolean;
  /** only the per-department block depends on the list being shown */
  departmentsLoading?: boolean;
  /** departments of the reports currently in the list, most reported first */
  byDepartment: { name: string; count: number }[];
};

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-heading text-[13px] font-extrabold uppercase tracking-wide text-gray-500">{title}</h3>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * Shown in the right column while no report is selected — instead of an empty box:
 * the last 7 days, where reports come from, and how many problems keep coming back.
 */
function OverviewSkeleton() {
  return (
    <LoadingRegion className="flex flex-grow flex-col gap-5" label="Umumiy ko'rinish yuklanmoqda…">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <div className="flex h-[96px] items-end gap-2">
          {[38, 56, 44, 70, 52, 64, 82].map((h, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-32" />
        {[100, 78, 62, 48].map((w) => (
          <div key={w} className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-1.5 rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </LoadingRegion>
  );
}

export function OverviewPanel({ overview, byDepartment, loading = false, departmentsLoading = false }: Props) {
  if (loading || !overview) return <OverviewSkeleton />;
  const days = overview?.last7Days ?? [];
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const weekTotal = days.reduce((sum, d) => sum + d.count, 0);
  const maxDept = Math.max(1, ...byDepartment.map((d) => d.count));

  return (
    <div className="flex flex-grow flex-col gap-5" data-testid="overview-panel">
      <Block title="So'nggi 7 kun" hint={`Jami: ${weekTotal}`}>
        <div className="flex h-[96px] items-end gap-2" role="img" aria-label={`So'nggi 7 kunlik xabarlar soni, jami ${weekTotal}`}>
          {days.map((d) => (
            <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-xs font-bold tabular-nums text-ink">{d.count}</span>
              <div
                className="w-full rounded-md"
                style={{
                  height: `${Math.max(4, Math.round((d.count / maxDay) * 52))}px`,
                  background: d.isToday ? TONE.success.fg : "#9FD0C4",
                }}
              />
              <span className={`text-[11px] ${d.isToday ? "font-bold text-ink" : "text-gray-500"}`}>{d.label}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Bo'limlar bo'yicha" hint="ro'yxatdagi xabarlar">
        {departmentsLoading ? (
          <LoadingRegion className="flex flex-col gap-2.5" label="Bo'limlar yuklanmoqda…">
            {[100, 70, 52, 40].map((w) => (
              <div key={w} className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-1.5 rounded-full" />
              </div>
            ))}
          </LoadingRegion>
        ) : byDepartment.length === 0 ? (
          <p className="text-sm text-gray-500">Ro&apos;yxatda xabarlar yo&apos;q.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {byDepartment.slice(0, 6).map((d) => (
              <li key={d.name} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-ink">{d.name}</span>
                  <span className="font-bold tabular-nums text-ink">{d.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${(d.count / maxDept) * 100}%`, background: TONE.success.fg }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Tizimli muammolar" hint={overview ? `so'nggi ${overview.clusterWindowDays} kun` : undefined}>
        <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: overview?.systemicClusters ? TONE.warning.bg : TONE.neutral.bg }}>
          <span
            className="font-heading text-[28px] font-extrabold leading-none tabular-nums"
            style={{ color: overview?.systemicClusters ? TONE.warning.fg : TONE.neutral.fg }}
          >
            {overview?.systemicClusters ?? "—"}
          </span>
          <span className="text-[13px] leading-snug text-gray-600">
            {overview
              ? overview.systemicClusters > 0
                ? `ta muammo ${overview.clusterMinCount}+ marta takrorlangan`
                : "Takrorlanayotgan muammo yo'q"
              : ""}
          </span>
        </div>
        {overview && overview.topClusters.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {overview.topClusters.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-ink">{c.label}</span>
                <Tag tone="warning">{c.count} marta</Tag>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <p className="mt-auto text-center text-xs text-gray-500">Batafsil ko&apos;rish uchun ro&apos;yxatdan xabarni tanlang.</p>
    </div>
  );
}
