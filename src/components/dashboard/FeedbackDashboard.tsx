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
import { SystemicTag, Tag } from "@/components/Tag";
import { Avatar } from "@/components/Avatar";
import { OverviewPanel, type Overview } from "@/components/dashboard/OverviewPanel";
import { FilterBar, SearchBox, type RangeKey } from "@/components/dashboard/FilterBar";
import { ShortcutsHelp } from "@/components/dashboard/ShortcutsHelp";
import { formatClock, formatDayMonth, formatDateTime, shortName } from "@/lib/ui/format";
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
  /** the list hit the server's size cap */
  truncated: boolean;
  /** newest reports regardless of filters — new-report alerts are computed from these */
  latest: FeedbackItem[];
  departments: string[];
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

/** Local-clock date bounds for a range chip ("Bu hafta" starts on Monday). */
function rangeBounds(range: RangeKey, customFrom: string, customTo: string): { from?: Date; to?: Date } {
  const now = new Date();
  const day = (offset = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  if (range === "today") return { from: day() };
  if (range === "week") return { from: day((now.getDay() + 6) % 7) };
  if (range === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (range === "custom") {
    return {
      from: customFrom ? new Date(`${customFrom}T00:00:00`) : undefined,
      to: customTo ? new Date(`${customTo}T23:59:59.999`) : undefined,
    };
  }
  return {};
}

/** Day buckets and "today" follow this browser's clock (minutes east of UTC), not the server's. */
function buildQuery(bounds: { from?: Date; to?: Date }) {
  const params = new URLSearchParams({ tz: String(-new Date().getTimezoneOffset()) });
  if (bounds.from) params.set("from", bounds.from.toISOString());
  if (bounds.to) params.set("to", bounds.to.toISOString());
  return `?${params}`;
}

const normalize = (text: string) => text.toLowerCase().replace(/[’`ʻʼ‘]/g, "'");

function matchesQuery(item: FeedbackItem, query: string) {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = normalize(
    [item.summary, item.excerpt, item.dept, item.trackingCode, item.room, item.staffName, item.occurredAt].filter(Boolean).join(" ")
  );
  return haystack.includes(q);
}

function formatTime(iso: string) {
  return formatClock(new Date(iso));
}

/** "14:25" for today, "Kecha 14:25" for yesterday, "12-sen 14:25" otherwise — the list can now span weeks. */
function formatWhen(iso: string) {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  const time = formatTime(iso);
  if (days <= 0) return time;
  if (days === 1) return `Kecha ${time}`;
  return formatDateTime(date);
}

export function FeedbackDashboard() {
  const [range, setRange] = useState<RangeKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [department, setDepartment] = useState("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const { data, mutate } = useSWR<DashboardResponse>(
    `/api/dashboard/feedback${buildQuery(rangeBounds(range, customFrom, customTo))}`,
    fetcher,
    {
      refreshInterval: 15000,
      // Keep polling while the tab is in the background — that is exactly when a notification is wanted.
      refreshWhenHidden: true,
      revalidateOnFocus: true,
      // Switching the date range keeps the old list on screen until the new one arrives.
      keepPreviousData: true,
    }
  );
  // A clicked push notification opens /dashboard?feedback=<id> — start with that item selected.
  // (The list is fetched client-side, so nothing about it is in the server HTML to mismatch.)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("feedback")
  );
  const [advancing, setAdvancing] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data]);
  // Severity + department + search narrow the list together (the date range is applied by the server).
  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (filter === "all" || i.severity === filter) &&
          (department === "all" || i.dept === department) &&
          matchesQuery(i, query)
      ),
    [items, filter, department, query]
  );
  const filtersActive = filter !== "all" || department !== "all" || query.trim() !== "" || range !== "all";
  const selected = items.find((i) => i.id === selectedId) ?? data?.latest.find((i) => i.id === selectedId) ?? null;
  const byDepartment = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of filtered) counts.set(item.dept, (counts.get(item.dept) ?? 0) + 1);
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);
  const today = formatDayMonth(new Date());

  const [toasts, setToasts] = useState<Toast[]>([]);
  const knownIdsRef = useRef<Set<string> | null>(null);

  // The stats strip gets out of the way while the list is scrolled down (more room for reports) and comes
  // back as soon as the user scrolls up or reaches the top. Only the list column scrolls on large screens;
  // on small ones the whole page scrolls and the strip simply scrolls away with it.
  const [statsHidden, setStatsHidden] = useState(false);
  const lastScrollTopRef = useRef(0);
  const scrollLockUntilRef = useRef(0);
  function handleListScroll(event: React.UIEvent<HTMLDivElement>) {
    const top = event.currentTarget.scrollTop;
    const delta = top - lastScrollTopRef.current;
    lastScrollTopRef.current = top;
    // While the strip animates the list resizes, which can nudge scrollTop — ignore that echo.
    if (Date.now() < scrollLockUntilRef.current) return;
    let hide = statsHidden;
    if (top < 24) hide = false;
    else if (delta > 6) hide = true;
    else if (delta < -6) hide = false;
    if (hide !== statsHidden) {
      scrollLockUntilRef.current = Date.now() + 400;
      setStatsHidden(hide);
    }
  }

  useEffect(() => {
    if (!data) return;
    // Alerts come from the newest reports as a whole — never from the filtered list — so changing the
    // date range or a filter can neither raise false alerts nor hide a real one.
    const live = data.latest ?? data.items;
    const currentIds = new Set(live.map((i) => i.id));

    if (knownIdsRef.current) {
      const newItems = live.filter((i) => !knownIdsRef.current!.has(i.id));
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
  }, [data]);

  // Keyboard: ↑/↓ move focus through the reports, Enter opens the focused one (a card is a button, so
  // Enter is its native click), Esc closes the open report, "/" jumps to search, "?" shows this help.
  // Nothing fires while typing in a field or with a modifier held.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const typing = !!target?.closest("input, textarea, select, [contenteditable='true']");
      const cards = () => [...(listRef.current?.querySelectorAll<HTMLElement>("[data-card]") ?? [])];
      const focusCard = (card: HTMLElement | undefined) => {
        if (!card) return;
        card.focus();
        card.scrollIntoView({ block: "nearest" });
      };

      if (event.key === "Escape") {
        if (helpOpen) setHelpOpen(false);
        else if (typing) target?.blur();
        else if (selectedId) setSelectedId(null);
        return;
      }
      if (typing) {
        // From the search box, ↓ drops straight into the results.
        if (event.key === "ArrowDown" && target === searchRef.current && cards().length > 0) {
          event.preventDefault();
          focusCard(cards()[0]);
        }
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "?") {
        event.preventDefault();
        setHelpOpen((v) => !v);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const list = cards();
        if (list.length === 0) return;
        event.preventDefault();
        let index = list.findIndex((c) => c === document.activeElement);
        if (index === -1 && selectedId) index = list.findIndex((c) => c.dataset.card === selectedId);
        const next = event.key === "ArrowDown" ? index + 1 : index - 1;
        focusCard(list[Math.max(0, Math.min(list.length - 1, next))]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [helpOpen, selectedId]);

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
      <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink lg:text-[28px]">Xabarlar</h1>
          <p className="mt-1 text-sm text-gray-500" suppressHydrationWarning>
            Bugun, {today}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SearchBox ref={searchRef} value={query} onChange={setQuery} />
          <ShortcutsHelp open={helpOpen} onToggle={() => setHelpOpen((v) => !v)} onClose={() => setHelpOpen(false)} />
        </div>
      </div>

      <PushNotificationBanner />

      <div
        className={`grid flex-shrink-0 transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
          statsHidden ? "grid-rows-[0fr] opacity-0 lg:-mb-5" : "grid-rows-[1fr] opacity-100"
        }`}
        aria-hidden={statsHidden}
        data-testid="stats-strip"
        data-hidden={statsHidden}
      >
        <div className="min-h-0 overflow-hidden">
        <div className="grid flex-shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard label="Bugungi xabarlar" value={data?.stats.todayCount ?? "—"} />
          <StatCard label="Yuqori jiddiylik" value={data?.stats.highCount ?? "—"} valueColor={TONE.danger.fg} />
          <StatCard
            label="O'rtacha javob vaqti"
            value={data?.stats.avgResponseMinutes != null ? `${data.stats.avgResponseMinutes} daqiqa` : "—"}
          />
        </div>
        </div>
      </div>

      <FilterBar
        severity={filter}
        onSeverity={setFilter}
        department={department}
        onDepartment={setDepartment}
        departments={data?.departments ?? []}
        range={range}
        onRange={setRange}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={setCustomFrom}
        onCustomTo={setCustomTo}
      />

      <div className="flex min-h-0 flex-col gap-4 lg:flex-grow lg:flex-row lg:gap-6">
        <div ref={listRef} className="flex min-h-0 flex-col gap-3 lg:flex-grow lg:overflow-y-auto lg:pr-1" onScroll={handleListScroll}>
          {data && (
            <div className="flex flex-shrink-0 items-center justify-between gap-3 px-1 text-[13px] text-gray-500" aria-live="polite">
              <span data-testid="result-count">
                {filtersActive ? (
                  <>
                    <b className="text-ink">{filtered.length}</b> / {items.length} ta xabar
                  </>
                ) : (
                  <>{items.length} ta xabar</>
                )}
                {data.truncated && " · oxirgi 500 tasi"}
              </span>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setDepartment("all");
                    setQuery("");
                    setRange("all");
                  }}
                  className="font-bold text-teal"
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          )}
          {filtered.length === 0 && (
            <p className="mt-10 text-center text-sm text-gray-500">
              {filtersActive ? "Filtrga mos xabar topilmadi." : "Hozircha xabarlar yo'q."}
            </p>
          )}
          {filtered.map((item) => {
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                data-card={item.id}
                onClick={() => setSelectedId(item.id)}
                className="flex w-full flex-col gap-2 rounded-xl border-[1.5px] px-4 py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-teal/40"
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
                    {item.isSystemic && <SystemicTag count={item.clusterCount} />}
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
