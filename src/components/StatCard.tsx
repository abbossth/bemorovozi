import { Skeleton } from "@/components/Skeleton";

export function StatCard({
  label,
  value,
  valueColor,
  loading = false,
}: {
  label: string;
  value: string | number;
  valueColor?: string;
  /** the number is still being fetched: show a placeholder instead of a misleading "—" */
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-gray-200 bg-white px-5 py-4" aria-busy={loading || undefined}>
      <span className="text-[13px] text-gray-500">{label}</span>
      {loading ? (
        <>
          <Skeleton className="mt-1 h-7 w-20" />
          <span className="sr-only">Yuklanmoqda…</span>
        </>
      ) : (
        <span className="font-heading text-[28px] font-extrabold" style={{ color: valueColor ?? "#16181D" }}>
          {value}
        </span>
      )}
    </div>
  );
}
