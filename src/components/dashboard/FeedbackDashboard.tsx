"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge, NEXT_STATUS, NEXT_STATUS_LABEL, type Status } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { NewFeedbackToasts, type Toast } from "@/components/dashboard/NewFeedbackToasts";
import { PushNotificationBanner } from "@/components/dashboard/PushNotificationBanner";
import { isNotifyEnabled, showLocalNotification } from "@/components/dashboard/localNotify";
import { buildFeedbackPayload } from "@/lib/push/payload";
import { Tag } from "@/components/Tag";
import { Avatar } from "@/components/Avatar";
import { OverviewPanel, type Overview } from "@/components/dashboard/OverviewPanel";
import { shortName } from "@/lib/ui/format";
import { CLUSTER_WINDOW_DAYS } from "@/lib/clusters";
import { IDLE, SELECTED, TONE } from "@/lib/ui/tones";
import { playSeverityAlert } from "@/lib/notificationSound";
import type { Severity } from "@/lib/ai/types";

type FeedbackItem = {
  id: string;
  excerpt: string;
  summary: string;
  dept: string;
  severity: Severity;
  status: Status;
  channel: "text" | "voice";
  trackingCode: string;
  createdAt: string;
  kind: "shikoyat" | "taklif";
  room: string | null;
  staffName: string | null;
  occurredAt: string | null;
  routedToManagement: boolean;
  reviewedByName: string | null;
  resolvedByName: string | null;
  /** full assistant + patient exchange (web chat/voice submissions only) */
  conversation: { role: "assistant" | "patient"; text: string }[] | null;
  isSystemic: boolean;
  clusterCount: number;
};

type DashboardResponse = {
  items: FeedbackItem[];
  stats: { todayCount: number; highCount: number; avgResponseMinutes: number | null };
  overview: Overview;
};

// An expired session used to make this component crash on `data.stats` — send the user to the login instead.
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.replace("/login");
    throw new Error("Sessiya tugagan");
  }
  return res.json();
};

// Day buckets and "today" follow this browser's clock (minutes east of UTC), not the server's.
const TZ_QUERY = () => `?tz=${-new Date().getTimezoneOffset()}`;

const FILTERS: { value: "all" | Severity; label: string }[] = [
  { value: "all", label: "Hammasi" },
  { value: "yuqori", label: "Yuqori" },
  { value: "orta", label: "O'rta" },
  { value: "past", label: "Past" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

/** "14:25" for today, "Kecha 14:25" for yesterday, "12-sen 14:25" otherwise — the list can now span weeks. */
function formatWhen(iso: string) {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  const time = formatTime(iso);
  if (days <= 0) return time;
  if (days === 1) return `Kecha ${time}`;
  return `${date.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })} ${time}`;
}

export function FeedbackDashboard() {
  const { data, mutate } = useSWR<DashboardResponse>(`/api/dashboard/feedback${TZ_QUERY()}`, fetcher, {
    refreshInterval: 15000,
    // Keep polling while the tab is in the background — that is exactly when a notification is wanted.
    refreshWhenHidden: true,
    revalidateOnFocus: true,
  });
  const [filter, setFilter] = useState<"all" | Severity>("all");
  // A clicked push notification opens /dashboard?feedback=<id> — start with that item selected.
  // (The list is fetched client-side, so nothing about it is in the server HTML to mismatch.)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("feedback")
  );
  const [advancing, setAdvancing] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data]);
  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.severity === filter)),
    [items, filter]
  );
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const byDepartment = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of filtered) counts.set(item.dept, (counts.get(item.dept) ?? 0) + 1);
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);
  const today = new Date().toLocaleDateString("uz-UZ", { day: "numeric", month: "long" });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!data) return;
    const currentIds = new Set(items.map((i) => i.id));

    if (knownIdsRef.current) {
      const newItems = items.filter((i) => !knownIdsRef.current!.has(i.id));
      if (newItems.length > 0) {
        const newToasts = newItems.map((i) => ({
          key: `${i.id}-${Date.now()}`,
          id: i.id,
          severity: i.severity,
          dept: i.dept,
          summary: i.summary,
        }));
        setToasts((prev) => [...newToasts, ...prev]);
        newToasts.forEach((t) => {
          setTimeout(() => dismissToast(t.key), 8000);
        });
        // Loudest/most urgent severity among the new arrivals gets to play.
        const bySeverityRank: Record<Severity, number> = { yuqori: 2, orta: 1, past: 0 };
        const loudest = newItems.reduce((a, b) => (bySeverityRank[b.severity] > bySeverityRank[a.severity] ? b : a));
        playSeverityAlert(loudest.severity);

        // Tab in the background (another tab or app in front): raise an OS notification too. Same tag as
        // the web push, so if the push already got there this is a no-op — never two banners.
        if ((document.visibilityState === "hidden" || !document.hasFocus()) && isNotifyEnabled()) {
          newItems.slice(0, 3).forEach((i) => {
            void showLocalNotification(
              buildFeedbackPayload(
                {
                  _id: i.id,
                  severity: i.severity,
                  aiSummary: i.summary,
                  transcript: i.excerpt,
                  kind: i.kind,
                  routedToManagement: i.routedToManagement,
                },
                { name: i.dept }
              )
            ).catch(() => {});
          });
        }
      }
    }
    // First load just establishes the baseline — no toasts/sound for pre-existing items.
    knownIdsRef.current = currentIds;
  }, [data, items]);

  function dismissToast(key: string) {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }

  async function advanceStatus(item: FeedbackItem) {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    setAdvancing(true);
    try {
      await fetch(`/api/feedback/${item.id}`, {
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
    <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:h-screen lg:gap-5 lg:overflow-hidden lg:px-12 lg:py-8">
      <NewFeedbackToasts toasts={toasts} onDismiss={dismissToast} onSelect={setSelectedId} />
      <div className="flex-shrink-0">
        <h1 className="font-heading text-2xl font-extrabold text-ink lg:text-[28px]">Xabarlar</h1>
        <p className="mt-1 text-sm text-gray-500" suppressHydrationWarning>
          Bugun, {today}
        </p>
      </div>

      <PushNotificationBanner />

      <div className="grid flex-shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Bugungi xabarlar" value={data?.stats.todayCount ?? "—"} />
        <StatCard label="Yuqori jiddiylik" value={data?.stats.highCount ?? "—"} valueColor={TONE.danger.fg} />
        <StatCard
          label="O'rtacha javob vaqti"
          value={data?.stats.avgResponseMinutes != null ? `${data.stats.avgResponseMinutes} daqiqa` : "—"}
        />
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
                borderColor: (active ? SELECTED : IDLE).border,
                background: (active ? SELECTED : IDLE).bg,
                color: (active ? SELECTED : IDLE).fg,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:flex-grow lg:flex-row lg:gap-6">
        <div className="flex min-h-0 flex-col gap-3 lg:flex-grow lg:overflow-y-auto lg:pr-1">
          {filtered.length === 0 && (
            <p className="mt-10 text-center text-sm text-gray-500">Hozircha xabarlar yo&apos;q.</p>
          )}
          {filtered.map((item) => {
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="flex w-full flex-col gap-2 rounded-xl border-[1.5px] px-4 py-3 text-left"
                style={{
                  background: (active ? SELECTED : IDLE).bg,
                  borderColor: (active ? SELECTED : IDLE).border,
                }}
              >
                {/* One compact row: severity · status · department · flags, with the time pulled out on the right */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={item.severity} />
                    <StatusBadge status={item.status} />
                    <span className="rounded-full bg-gray-100 px-2.5 py-[3px] text-xs font-medium text-gray-600">
                      {item.dept}
                    </span>
                    {item.kind === "taklif" && <Tag tone="success">Taklif</Tag>}
                    {item.routedToManagement && <Tag tone="warning">Rahbariyatga</Tag>}
                    {item.isSystemic && <Tag tone="warning">Tizimli muammo · {item.clusterCount}</Tag>}
                  </div>
                  <time
                    dateTime={item.createdAt}
                    className="flex-shrink-0 pt-0.5 font-heading text-[15px] font-extrabold tabular-nums text-ink"
                  >
                    {formatWhen(item.createdAt)}
                  </time>
                </div>
                <p className="text-[15px] leading-snug text-ink">{item.summary}</p>
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 w-full flex-shrink-0 flex-col rounded-[14px] border border-gray-200 bg-white p-5 sm:p-6 lg:w-[360px] lg:overflow-y-auto">
          {selected ? (
            <div className="flex flex-grow flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={selected.severity} suffix="jiddiylik" />
                {selected.kind === "taklif" && <Tag tone="success">Taklif</Tag>}
                {selected.routedToManagement && <Tag tone="warning">Rahbariyatga</Tag>}
              </div>
              {selected.isSystemic && (
                <div
                  className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm leading-snug"
                  style={{ background: TONE.warning.bg, color: TONE.warning.fg }}
                  data-testid="systemic-notice"
                >
                  <svg viewBox="0 0 24 24" width={18} height={18} className="mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>
                    <b>Bu muammo so&apos;nggi {CLUSTER_WINDOW_DAYS} kunda {selected.clusterCount} marta takrorlangan.</b>{" "}
                    Tizimli sabab bo&apos;lishi mumkin.
                  </span>
                </div>
              )}
              <p className="text-[15px] leading-relaxed text-ink">{selected.excerpt}</p>
              <p className="text-sm leading-relaxed text-gray-500">{selected.summary}</p>
              <div className="flex flex-col gap-2.5 border-t border-gray-200 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bo&apos;lim</span>
                  <span className="font-semibold text-ink">{selected.dept}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Turi</span>
                  <span className="font-semibold text-ink">{selected.kind === "taklif" ? "Taklif" : "Shikoyat"}</span>
                </div>
                {selected.routedToManagement && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Yo&apos;nalish</span>
                    <span className="font-semibold" style={{ color: TONE.warning.fg }}>Rahbariyatga</span>
                  </div>
                )}
                {selected.room && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-gray-500">Xona/palata</span>
                    <span className="text-right font-semibold text-ink">{selected.room}</span>
                  </div>
                )}
                {selected.staffName && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-gray-500">Xodim</span>
                    <span className="text-right font-semibold text-ink">{selected.staffName}</span>
                  </div>
                )}
                {selected.occurredAt && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-gray-500">Qachon (bemor aytgani)</span>
                    <span className="text-right font-semibold text-ink">{selected.occurredAt}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vaqt</span>
                  <span className="font-semibold text-ink">{formatTime(selected.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Kuzatish kodi</span>
                  <span className="font-semibold text-ink">{selected.trackingCode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Holat</span>
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              {selected.status === "korib_chiqilmoqda" && selected.reviewedByName && (
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: TONE.warning.bg }} data-testid="reviewer">
                  <Avatar name={selected.reviewedByName} size={28} />
                  <span className="text-sm" style={{ color: TONE.warning.fg }}>
                    Ko&apos;rib chiqmoqda: <b>{shortName(selected.reviewedByName)}</b>
                  </span>
                </div>
              )}
              {selected.status === "hal_qilindi" && selected.resolvedByName && (
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: TONE.success.bg }} data-testid="reviewer">
                  <Avatar name={selected.resolvedByName} size={28} />
                  <span className="text-sm" style={{ color: TONE.success.fg }}>
                    Hal qildi: <b>{shortName(selected.resolvedByName)}</b>
                  </span>
                </div>
              )}

              {selected.conversation && selected.conversation.length > 0 && (
                <details className="rounded-xl border border-gray-200 bg-[#F7F9F8] p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-ink">To&apos;liq suhbat</summary>
                  <div className="mt-2.5 flex flex-col gap-2">
                    {selected.conversation.map((m, i) => (
                      <p key={i} className="leading-relaxed text-ink">
                        <span className="font-semibold text-gray-500">{m.role === "assistant" ? "Yordamchi" : "Bemor"}: </span>
                        {m.text}
                      </p>
                    ))}
                  </div>
                </details>
              )}

              {/* Pinned to the bottom of the panel so the main action never scrolls out of view */}
              <div className="sticky bottom-0 -mx-5 mt-auto bg-white px-5 pb-1 pt-3 sm:-mx-6 sm:px-6">
                {selected.status === "hal_qilindi" ? (
                  <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-teal">
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={TONE.success.fg} strokeWidth={2}>
                      <path d="M5 12.5l4 4 10-11" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Hal qilindi
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={advancing}
                    onClick={() => advanceStatus(selected)}
                    className="mt-auto w-full rounded-[10px] bg-teal py-3.5 font-heading text-[15px] font-bold text-white disabled:opacity-60"
                  >
                    {NEXT_STATUS_LABEL[selected.status]}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <OverviewPanel overview={data?.overview} byDepartment={byDepartment} />
          )}
        </div>
      </div>
    </div>
  );
}
