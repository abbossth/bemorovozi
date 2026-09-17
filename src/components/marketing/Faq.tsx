"use client";

import { useState } from "react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-heading text-[15px] font-bold text-ink">{item.q}</span>
              <span className="text-xl text-gray-400">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
