"use client";

import { useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { LogoMark } from "@/components/Logo";

type DepartmentItem = { id: string; name: string; url: string; qrDataUrl: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SettingsPage() {
  const { data, mutate, isLoading } = useSWR<{ items: DepartmentItem[] }>("/api/departments", fetcher);
  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const items = data?.items ?? [];
  const selected = items.find((d) => d.id === selectedId) ?? items[0] ?? null;

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error ?? "Xatolik yuz berdi");
      setNewName("");
      setSelectedId(created.id);
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "O'chirib bo'lmadi");
      if (selectedId === id) setSelectedId(null);
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen flex-col gap-7 overflow-hidden px-12 py-10">
      <div>
        <h1 className="font-heading text-[28px] font-extrabold text-ink">Sozlamalar</h1>
        <p className="mt-1 text-sm text-gray-500">Bo&apos;lim va xonalarni boshqaring, ularning QR-kartalarini chop eting</p>
      </div>

      {error && <p className="rounded-lg bg-coral-tint px-3 py-2 text-[13px] text-coral">{error}</p>}

      <div className="flex min-h-0 flex-grow gap-6">
        <div className="flex min-h-0 flex-grow flex-col gap-5">
          <div className="flex items-end gap-3 rounded-[14px] border border-gray-200 bg-white p-5">
            <div className="flex flex-grow flex-col gap-1.5">
              <label htmlFor="newDept" className="text-[13px] font-semibold text-ink">
                Yangi bo&apos;lim yoki xona nomi
              </label>
              <input
                id="newDept"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Masalan: Nevrologiya bo'limi"
                className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm text-ink outline-none focus:border-teal"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy || !newName.trim()}
              className="whitespace-nowrap rounded-[10px] bg-teal px-[22px] py-[13px] font-heading text-sm font-bold text-white disabled:opacity-60"
            >
              + Qo&apos;shish
            </button>
          </div>

          <div className="flex min-h-0 flex-grow flex-col gap-2.5 overflow-y-auto">
            {isLoading && <p className="text-sm text-gray-400">Yuklanmoqda...</p>}
            {!isLoading && items.length === 0 && (
              <p className="text-sm text-gray-400">Hali bo&apos;lim qo&apos;shilmagan.</p>
            )}
            {items.map((dept) => {
              const active = selected?.id === dept.id;
              return (
                <div
                  key={dept.id}
                  className="flex w-full items-center justify-between rounded-xl border-[1.5px] px-[18px] py-4"
                  style={{ background: active ? "#EAF5F2" : "#FFFFFF", borderColor: active ? "#0F6E5C" : "#E4E7EB" }}
                >
                  <button type="button" onClick={() => setSelectedId(dept.id)} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink">
                      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#FFFFFF" strokeWidth={1.6}>
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="3" height="3" />
                        <rect x="18" y="18" width="3" height="3" />
                        <rect x="14" y="18" width="3" height="3" />
                        <rect x="18" y="14" width="3" height="3" />
                      </svg>
                    </div>
                    <span className="text-[15px] font-semibold text-ink">{dept.name}</span>
                  </button>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => setSelectedId(dept.id)} className="text-[13px] font-semibold text-teal">
                      Ko&apos;rish →
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(dept.id)}
                      disabled={busy}
                      className="text-[13px] font-semibold text-gray-400 hover:text-coral disabled:opacity-50"
                    >
                      O&apos;chirish
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 w-[360px] flex-shrink-0 flex-col gap-4 overflow-y-auto">
          <h3 className="font-heading text-base font-bold text-ink">Bosma QR-karta</h3>

          {selected ? (
            <>
              <div className="flex flex-col items-center gap-3.5 rounded-[20px] border border-gray-200 bg-white px-7 py-8 text-center">
                <LogoMark size={40} />
                <span className="font-heading text-base font-extrabold text-ink">BemorOvozi</span>
                <Image
                  src={selected.qrDataUrl}
                  alt={`${selected.name} uchun QR kod`}
                  width={168}
                  height={168}
                  unoptimized
                  className="mt-1 mb-1 rounded-lg"
                />
                <span className="mt-1.5 font-heading text-[17px] font-extrabold text-ink">{selected.name}</span>
                <span className="text-sm font-bold text-teal">Takliflar va shikoyatlar uchun</span>
                <span className="text-xs text-gray-400">Telefon kamerasi bilan skanerlang</span>
                <span className="mt-2 text-[11px] text-gray-300">bemorovozi.uz</span>
              </div>
              <a
                href={`/api/departments/${selected.id}/pdf`}
                className="w-full rounded-[10px] bg-teal py-3.5 text-center font-heading text-[15px] font-bold text-white"
              >
                PDF yuklab olish
              </a>
            </>
          ) : (
            <div className="flex flex-grow items-center justify-center rounded-[20px] border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
              QR karta ko&apos;rish uchun bo&apos;lim tanlang yoki yangi bo&apos;lim qo&apos;shing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
