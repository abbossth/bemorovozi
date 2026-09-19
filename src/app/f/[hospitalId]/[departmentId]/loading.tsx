import { LoadingRegion, Skeleton } from "@/components/Skeleton";

// The patient page is prepared on the server (hospital + department lookup, greeting). This is the same
// frame as the finished page, so nothing jumps when the chat appears.
export default function PatientFormLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9F8] py-6">
      <div className="w-full max-w-[390px] rounded-[28px] bg-white shadow-sm">
        <LoadingRegion className="flex h-[min(700px,calc(100dvh-3rem))] w-full flex-col overflow-hidden rounded-[28px]" label="Yuklanmoqda…">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-[26px] w-[26px] rounded-lg" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
          <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">
            <Skeleton className="h-[74px] w-[80%] rounded-2xl" />
          </div>
          <div className="border-t border-gray-100 px-3 pb-3 pt-3">
            <Skeleton className="h-[62px] w-full rounded-3xl" />
          </div>
        </LoadingRegion>
      </div>
    </main>
  );
}
