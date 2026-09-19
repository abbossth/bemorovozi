"use client";

import { forwardRef } from "react";
import type { Severity } from "@/lib/ai/types";
import { SEVERITY_META } from "@/components/SeverityBadge";
import { SELECTED } from "@/lib/ui/tones";

export type RangeKey = "all" | "today" | "week" | "month" | "custom";

const SEVERITY_OPTIONS: { value: "all" | Severity; label: string; dot?: string }[] = [
  { value: "all", label: "Hammasi" },
  { value: "yuqori", label: "Yuqori", dot: SEVERITY_META.yuqori.color },
  { value: "orta", label: "O'rta", dot: SEVERITY_META.orta.color },
  { value: "past", label: "Past", dot: SEVERITY_META.past.color },
];

// "Barcha vaqt" (not "Barchasi"): the two groups used to start with near-identical chips, which made it
// impossible to tell at a glance which of the two "all" buttons belonged to which filter.
const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "all", label: "Barcha vaqt" },
  { value: "today", label: "Bugun" },
  { value: "week", label: "Bu hafta" },
  { value: "month", label: "Bu oy" },
  { value: "custom", label: "Maxsus" },
];

const CONTROL_HEIGHT = "h-[38px]";

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1.5">
      <span className="px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500">{label}</span>
      {children}
    </div>
  );
}

/**
 * One grey track holding all options, the chosen one lifted out of it (teal outline + tint). Reads as a
 * single control with one answer instead of a row of unrelated pills.
 */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; dot?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-[#E6EBE9] p-[3px] ${CONTROL_HEIGHT}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-full flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
              selected ? "" : "text-gray-600 hover:bg-white/70 hover:text-ink"
            }`}
            style={
              selected
                ? { backgroundColor: SELECTED.bg, color: SELECTED.fg, boxShadow: `inset 0 0 0 1.5px ${SELECTED.border}` }
                : undefined
            }
          >
            {option.dot && <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: option.dot }} aria-hidden />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

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

/** Severity + department + date range. They combine: all three narrow the same list. */
export function FilterBar(p: Props) {
  const departmentChosen = p.department !== "all";
  return (
    <div className="flex flex-shrink-0 flex-wrap items-end gap-x-6 gap-y-3" role="search" aria-label="Filtrlar">
      <Group label="Jiddiylik">
        <Segmented label="Jiddiylik bo'yicha" value={p.severity} options={SEVERITY_OPTIONS} onChange={p.onSeverity} />
      </Group>

      <Group label="Bo'lim">
        <select
          value={p.department}
          onChange={(e) => p.onDepartment(e.target.value)}
          aria-label="Bo'lim bo'yicha"
          className={`${CONTROL_HEIGHT} w-[210px] max-w-full cursor-pointer appearance-none rounded-full border-[1.5px] pl-4 pr-9 text-[13px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-teal/30`}
          style={{
            borderColor: departmentChosen ? SELECTED.border : "#E4E7EB",
            backgroundColor: departmentChosen ? SELECTED.bg : "#FFFFFF",
            color: departmentChosen ? SELECTED.fg : "#4B5563",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234B5563' stroke-width='2.2'%3E%3Cpath d='M6 9l6 6 6-6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            backgroundSize: "16px",
          }}
        >
          <option value="all">Barcha bo&apos;limlar</option>
          {p.departments.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </Group>

      <Group label="Sana">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Sana oralig'i" value={p.range} options={RANGE_OPTIONS} onChange={p.onRange} />
          {p.range === "custom" && (
            <div className={`flex items-center gap-1.5 text-sm text-gray-500 ${CONTROL_HEIGHT}`}>
              <input
                type="date"
                value={p.customFrom}
                max={p.customTo || undefined}
                onChange={(e) => p.onCustomFrom(e.target.value)}
                aria-label="Boshlanish sanasi"
                className="h-full rounded-full border-[1.5px] border-gray-200 bg-white px-3 text-[13px] text-ink outline-none focus:border-teal"
              />
              <span>—</span>
              <input
                type="date"
                value={p.customTo}
                min={p.customFrom || undefined}
                onChange={(e) => p.onCustomTo(e.target.value)}
                aria-label="Tugash sanasi"
                className="h-full rounded-full border-[1.5px] border-gray-200 bg-white px-3 text-[13px] text-ink outline-none focus:border-teal"
              />
            </div>
          )}
        </div>
      </Group>
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
