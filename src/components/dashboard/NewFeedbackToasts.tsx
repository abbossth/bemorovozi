"use client";

import { SEVERITY_META } from "@/components/SeverityBadge";
import type { Severity } from "@/lib/ai/types";

export type Toast = { key: string; id: string; severity: Severity; dept: string; summary: string };

export function NewFeedbackToasts({
  toasts,
  onDismiss,
  onSelect,
}: {
  toasts: Toast[];
  onDismiss: (key: string) => void;
  onSelect: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-6 top-6 z-50 flex w-[340px] flex-col gap-3">
      {toasts.map((toast) => {
        const meta = SEVERITY_META[toast.severity];
        return (
          <div
            key={toast.key}
            className="animate-toast-in flex flex-col gap-2 rounded-xl border-l-4 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,17,0.16)]"
            style={{ borderLeftColor: meta.color }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: meta.color, background: meta.bg }}>
                {meta.label} jiddiylik
              </span>
              <button
                type="button"
                onClick={() => onDismiss(toast.key)}
                aria-label="Yopish"
                className="text-gray-300 hover:text-gray-500"
              >
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="text-sm font-semibold text-ink">{toast.dept}</p>
            <p className="line-clamp-2 text-sm text-gray-600">{toast.summary}</p>
            <button
              type="button"
              onClick={() => {
                onSelect(toast.id);
                onDismiss(toast.key);
              }}
              className="self-start text-[13px] font-bold text-teal"
            >
              Ko&apos;rish →
            </button>
          </div>
        );
      })}
    </div>
  );
}
