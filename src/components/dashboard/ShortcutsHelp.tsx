"use client";

import { useEffect, useRef } from "react";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["↑", "↓"], label: "Xabarlar bo'ylab yurish" },
  { keys: ["Enter"], label: "Tanlangan xabarni ochish" },
  { keys: ["Esc"], label: "Xabarni yopish (umumiy ko'rinishga qaytish)" },
  { keys: ["/"], label: "Qidiruvga o'tish" },
  { keys: ["?"], label: "Shu yordamni ochish/yopish" },
];

function Key({ children }: { children: string }) {
  return (
    <kbd className="min-w-[26px] rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-center font-sans text-xs font-bold text-ink shadow-[0_1px_0_#E4E7EB]">
      {children}
    </kbd>
  );
}

/** Small "?" button that opens the list of keyboard shortcuts. Open state lives in the parent so the "?" key can toggle it. */
export function ShortcutsHelp({ open, onToggle, onClose }: { open: boolean; onToggle: () => void; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Klaviatura yorliqlari"
        aria-expanded={open}
        title="Klaviatura yorliqlari (?)"
        className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-gray-200 bg-white text-sm font-extrabold text-gray-600 transition hover:border-teal hover:text-teal"
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Klaviatura yorliqlari"
          className="absolute right-0 top-11 z-30 w-[300px] rounded-xl border border-gray-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,17,0.14)]"
          data-testid="shortcuts-help"
        >
          <p className="mb-3 font-heading text-sm font-extrabold text-ink">Klaviatura yorliqlari</p>
          <ul className="flex flex-col gap-2.5">
            {SHORTCUTS.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 text-[13px] text-gray-600">
                <span>{s.label}</span>
                <span className="flex flex-shrink-0 gap-1">
                  {s.keys.map((k) => (
                    <Key key={k}>{k}</Key>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
