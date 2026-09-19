"use client";

import { forwardRef } from "react";
import type { Severity } from "@/lib/ai/types";
import { IDLE, SELECTED } from "@/lib/ui/tones";

export type RangeKey = "all" | "today" | "week" | "month" | "custom";

export const SEVERITY_FILTERS: { value: "all" | Severity; label: string }[] = [
  { value: "all", label: "Hammasi" },
  { value: "yuqori", label: "Yuqori" },
  { value: "orta", label: "O'rta" },
  { value: "past", label: "Past" },
];

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "all", label: "Barchasi" },
  { value: "today", label: "Bugun" },
  { value: "week", label: "Bu hafta" },
  { value: "month", label: "Bu oy" },
  { value: "custom", label: "Maxsus" },
];

// backgroundColor (not the `background` shorthand): the shorthand would reset the select's chevron image.
const chipStyle = (active: boolean) => ({
  borderColor: (active ? SELECTED : IDLE).border,
  backgroundColor: (active ? SELECTED : IDLE).bg,
  color: (active ? SELECTED : IDLE).fg,
});
const CHIP = "flex-shrink-0 rounded-full border-[1.5px] px-4 py-1.5 text-sm font-semibold";

type Props = {
  severity: "all" | Severity;
  onSeverity: (value: "all" | Severity) => void;
  department: string;
  onDepartment: (value: string) => void;
  departments: string[];
  range: RangeKey;
  onRange: (value: RangeKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (value: string) => void;
  onCustomTo: (value: string) => void;
};

/** Severity chips + department dropdown + date range. They combine: all three narrow the same list. */
export function FilterBar(p: Props) {
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-x-5 gap-y-2.5">
      <div className="flex gap-2" role="group" aria-label="Jiddiylik bo'yicha">
        {SEVERITY_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => p.onSeverity(f.value)}
            aria-pressed={p.severity === f.value}
            className={CHIP}
            style={chipStyle(p.severity === f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <select
        value={p.department}
        onChange={(e) => p.onDepartment(e.target.value)}
        aria-label="Bo'lim bo'yicha"
        className={`${CHIP} max-w-[220px] cursor-pointer appearance-none pr-8`}
        style={{
          ...chipStyle(p.department !== "all"),
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
          backgroundSize: "16px",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234B5563' stroke-width='2.2'%3E%3Cpath d='M6 9l6 6 6-6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        }}
      >
        <option value="all">Barcha bo&apos;limlar</option>
        {p.departments.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sana oralig'i">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => p.onRange(r.value)}
            aria-pressed={p.range === r.value}
            className={CHIP}
            style={chipStyle(p.range === r.value)}
          >
            {r.label}
          </button>
        ))}
        {p.range === "custom" && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <input
              type="date"
              value={p.customFrom}
              max={p.customTo || undefined}
              onChange={(e) => p.onCustomFrom(e.target.value)}
              aria-label="Boshlanish sanasi"
              className="rounded-lg border-[1.5px] border-gray-200 bg-white px-2.5 py-1 text-sm text-ink outline-none focus:border-teal"
            />
            <span>—</span>
            <input
              type="date"
              value={p.customTo}
              min={p.customFrom || undefined}
              onChange={(e) => p.onCustomTo(e.target.value)}
              aria-label="Tugash sanasi"
              className="rounded-lg border-[1.5px] border-gray-200 bg-white px-2.5 py-1 text-sm text-ink outline-none focus:border-teal"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const SearchBox = forwardRef<HTMLInputElement, { value: string; onChange: (value: string) => void }>(function SearchBox(
  { value, onChange },
  ref
) {
  return (
    <div className="relative w-full sm:w-[300px]">
      <svg
        viewBox="0 0 24 24"
        width={16}
        height={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Xabar bo'yicha qidirish…"
        aria-label="Xabarlarni qidirish"
        className="w-full rounded-full border-[1.5px] border-gray-200 bg-white py-2 pl-10 pr-9 text-sm text-ink outline-none placeholder:text-gray-500 focus:border-teal [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Qidiruvni tozalash"
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
});
