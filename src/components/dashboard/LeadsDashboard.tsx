"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { formatDateTime } from "@/lib/ui/format";
import { LoadingRegion, Skeleton } from "@/components/Skeleton";

type Lead = {
  id: string;
  source: "demo" | "narxlar_b2b" | "narxlar_b2g" | "pilot";
  organizationName: string;
  contactName: string;
  phone: string;
  email: string;
  message: string;
  plan: string;
  status: "yangi" | "bogolanildi" | "yopildi";
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SOURCE_LABEL: Record<Lead["source"], string> = {
  demo: "Demo so'rash",
  narxlar_b2b: "Narxlar (B2B)",
  narxlar_b2g: "Narxlar (B2G)",
  pilot: "Pilot dastur",
};

const STATUS_META: Record<Lead["status"], { label: string; color: string; bg: string }> = {
  yangi: { label: "Yangi", color: "#4B5563", bg: "#F3F4F6" },
  bogolanildi: { label: "Bog'lanildi", color: "#B36B00", bg: "#FDF3E4" },
  yopildi: { label: "Yopildi", color: "#0F6E5C", bg: "#EAF5F2" },
};

const NEXT_STATUS: Partial<Record<Lead["status"], Lead["status"]>> = {
  yangi: "bogolanildi",
  bogolanildi: "yopildi",
};

const NEXT_LABEL: Partial<Record<Lead["status"], string>> = {
  yangi: "Bog'lanildi deb belgilash",
  bogolanildi: "Yopildi deb belgilash",
};

const FILTERS: { value: "all" | Lead["status"]; label: string }[] = [
  { value: "all", label: "Hammasi" },
  { value: "yangi", label: "Yangi" },
  { value: "bogolanildi", label: "Bog'lanildi" },
  { value: "yopildi", label: "Yopildi" },
];

function formatTime(iso: string) {
  return formatDateTime(new Date(iso));
}

export function LeadsDashboard() {
  const { data, mutate, isLoading } = useSWR<{ items: Lead[] }>("/api/leads", fetcher, { refreshInterval: 15000 });
  const [filter, setFilter] = useState<"all" | Lead["status"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data]);
  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );
  const selected = items.find((i) => i.id === selectedId) ?? null;

  async function advanceStatus(lead: Lead) {
    const next = NEXT_STATUS[lead.status];
    if (!next) return;
    setAdvancing(true);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      await mutate();
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:h-screen lg:gap-7 lg:overflow-hidden lg:px-12 lg:py-10">
      <div className="flex-shrink-0">
        <h1 className="font-heading text-2xl font-extrabold text-ink lg:text-[28px]">Lidlar</h1>
        <p className="mt-1 text-sm text-gray-500">Demo so&apos;rash va narxlar sahifasidan kelgan so&apos;rovlar</p>
      </div>

      <div className="-mx-4 flex flex-shrink-0 gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className="flex-shrink-0 rounded-full border-[1.5px] px-[18px] py-2 text-sm font-semibold"
              style={{
                borderColor: active ? "#0F6E5C" : "#E4E7EB",
                background: active ? "#EAF5F2" : "#FFFFFF",
                color: active ? "#0F6E5C" : "#4B5563",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:flex-grow lg:flex-row lg:gap-6">
        <div className="flex min-h-0 flex-col gap-3 lg:flex-grow lg:overflow-y-auto lg:pr-1">
          {isLoading && (
            <LoadingRegion className="flex flex-col gap-3" label="Lidlar yuklanmoqda…">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2.5 rounded-xl border-[1.5px] border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-28 rounded-full" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </LoadingRegion>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="mt-10 text-center text-sm text-gray-500">Hozircha lidlar yo&apos;q.</p>
          )}
          {filtered.map((lead) => {
            const active = lead.id === selectedId;
            const statusMeta = STATUS_META[lead.status];
            return (
              <button
                key={lead.id}
                type="button"
                onClick={() => setSelectedId(lead.id)}
                className="flex w-full flex-col gap-2.5 rounded-xl border-[1.5px] p-4 text-left"
                style={{ background: active ? "#EAF5F2" : "#FFFFFF", borderColor: active ? "#0F6E5C" : "#E4E7EB" }}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-gray-100 px-2.5 py-[3px] text-xs font-semibold text-gray-500">
                    {SOURCE_LABEL[lead.source]}
                  </span>
                  <span className="text-[13px] text-gray-500">{formatTime(lead.createdAt)}</span>
                </div>
                <p className="font-heading text-[15px] font-bold text-ink">{lead.organizationName}</p>
                <p className="text-sm text-gray-500">
                  {lead.contactName} · {lead.phone}
                </p>
                <span
                  className="w-fit rounded-full px-2.5 py-[3px] text-xs font-semibold"
                  style={{ color: statusMeta.color, background: statusMeta.bg }}
                >
                  {statusMeta.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 w-full flex-shrink-0 flex-col rounded-[14px] border border-gray-200 bg-white p-5 sm:p-6 lg:w-[360px] lg:overflow-y-auto">
          {selected ? (
            <div className="flex flex-grow flex-col gap-4">
              <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                {SOURCE_LABEL[selected.source]}
              </span>
              <div>
                <h2 className="font-heading text-lg font-bold text-ink">{selected.organizationName}</h2>
                <p className="text-sm text-gray-500">{selected.contactName}</p>
              </div>
              <div className="flex flex-col gap-2.5 border-t border-gray-200 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Telefon</span>
                  <a href={`tel:${selected.phone}`} className="font-semibold text-teal">
                    {selected.phone}
                  </a>
                </div>
                {selected.email && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Email</span>
                    <a href={`mailto:${selected.email}`} className="font-semibold text-teal">
                      {selected.email}
                    </a>
                  </div>
                )}
                {selected.plan && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tarif</span>
                    <span className="font-semibold text-ink">{selected.plan}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vaqt</span>
                  <span className="font-semibold text-ink">{formatTime(selected.createdAt)}</span>
                </div>
              </div>
              {selected.message && (
                <p className="rounded-lg bg-[#F7F9F8] p-3 text-sm leading-relaxed text-ink">{selected.message}</p>
              )}

              {selected.status === "yopildi" ? (
                <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-teal">
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#0F6E5C" strokeWidth={2}>
                    <path d="M5 12.5l4 4 10-11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Yopildi
                </div>
              ) : (
                <button
                  type="button"
                  disabled={advancing}
                  onClick={() => advanceStatus(selected)}
                  className="mt-auto w-full rounded-[10px] bg-teal py-3.5 font-heading text-[15px] font-bold text-white disabled:opacity-60"
                >
                  {NEXT_LABEL[selected.status]}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-grow items-center justify-center text-center">
              <p className="max-w-[220px] text-sm text-gray-500">Batafsil ko&apos;rish uchun ro&apos;yxatdan lidni tanlang.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
