import { LoadingRegion, Skeleton } from "@/components/Skeleton";

// Shown by Next while a dashboard page is being prepared on the server (the sidebar stays in place).
export default function DashboardLoading() {
  return (
    <LoadingRegion className="flex flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10" label="Sahifa yuklanmoqda…">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-[14px] border border-gray-200 bg-white px-5 py-4">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-xl border-[1.5px] border-gray-200 bg-white px-4 py-3.5">
            <Skeleton className="h-6 w-2/5 rounded-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
