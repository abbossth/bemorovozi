"use client";

import { useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { LogoMark } from "@/components/Logo";
import { TelegramLinkCard } from "./TelegramLinkCard";
import { LoadingRegion, Skeleton } from "@/components/Skeleton";
import { PushSettingsCard } from "./PushSettingsCard";
import { greetingFor } from "@/lib/conversation/engine";

type DepartmentItem = { id: string; name: string; url: string; qrDataUrl: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function HospitalNameCard() {
  const { data, mutate } = useSWR<{ name: string; canEdit: boolean }>("/api/hospital", fetcher);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!data) {
    return (
      <LoadingRegion className="flex flex-col gap-3 rounded-[14px] border border-gray-200 bg-white p-4 sm:p-5" label="Shifoxona nomi yuklanmoqda…">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-[46px] w-full rounded-[10px]" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </LoadingRegion>
    );
  }
  if ("error" in data) return null;
  const value = draft ?? data.name;
  const dirty = value.trim() !== data.name;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hospital", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Saqlab bo'lmadi");
      setDraft(null);
      await mutate();
      setMessage({ ok: true, text: "Saqlandi" });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Xatolik yuz berdi" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-grow flex-col gap-1.5">
          <label htmlFor="hospitalName" className="text-[13px] font-semibold text-ink">
            Shifoxona nomi
          </label>
          <input
            id="hospitalName"
            type="text"
            value={value}
            disabled={!data.canEdit}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && dirty && save()}
            maxLength={80}
            className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm text-ink outline-none focus:border-teal disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        {data.canEdit && (
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty || value.trim().length < 2}
            className="whitespace-nowrap rounded-[10px] bg-teal px-[22px] py-[13px] font-heading text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        )}
      </div>
      <p className="rounded-lg bg-[#F7F9F8] px-3 py-2 text-[13px] leading-relaxed text-gray-500">
        AI yordamchi bemorlarni shunday kutib oladi: <span className="font-semibold text-ink">“{greetingFor(value.trim() || "…")}”</span>
      </p>
      {message && (
        <p className={`text-[13px] ${message.ok ? "text-teal" : "text-coral"}`} role="status">
          {message.text}
        </p>
      )}
      {!data.canEdit && <p className="text-xs text-gray-500">Nomni faqat administrator o&apos;zgartira oladi.</p>}
    </div>
  );
}

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
    <div className="flex min-h-screen flex-col gap-5 px-4 py-6 sm:gap-7 sm:px-6 sm:py-8 lg:px-12 lg:py-10">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink lg:text-[28px]">Sozlamalar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Shifoxona nomi, bo&apos;lim va xonalarni boshqaring, ularning QR-kartalarini chop eting
        </p>
      </div>

      {error && <p className="rounded-lg bg-coral-tint px-3 py-2 text-[13px] text-coral">{error}</p>}

      <HospitalNameCard />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-grow flex-col gap-5">
          <div className="flex flex-col items-stretch gap-3 rounded-[14px] border border-gray-200 bg-white p-4 sm:flex-row sm:items-end sm:p-5">
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

          <div className="flex max-h-[420px] flex-col gap-2.5 overflow-y-auto">
            {isLoading && (
              <LoadingRegion className="flex flex-col gap-2.5" label="Bo'limlar yuklanmoqda…">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border-[1.5px] border-gray-200 bg-white px-[18px] py-4">
                    <Skeleton className="h-9 w-9 flex-shrink-0 rounded-lg" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </LoadingRegion>
            )}
            {!isLoading && items.length === 0 && (
              <p className="text-sm text-gray-500">Hali bo&apos;lim qo&apos;shilmagan.</p>
            )}
            {items.map((dept) => {
              const active = selected?.id === dept.id;
              return (
                <div
                  key={dept.id}
                  className="flex w-full items-center justify-between rounded-xl border-[1.5px] px-[18px] py-4"
                  style={{ background: active ? "#EAF5F2" : "#FFFFFF", borderColor: active ? "#0F6E5C" : "#E4E7EB" }}
                >
                  <button type="button" onClick={() => setSelectedId(dept.id)} className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink">
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
                    <span className="truncate text-[15px] font-semibold text-ink">{dept.name}</span>
                  </button>
                  <div className="flex flex-shrink-0 items-center gap-3 pl-3 sm:gap-4">
                    <button type="button" onClick={() => setSelectedId(dept.id)} className="text-[13px] font-semibold text-teal">
                      Ko&apos;rish →
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(dept.id)}
                      disabled={busy}
                      className="text-[13px] font-semibold text-gray-500 hover:text-coral disabled:opacity-50"
                    >
                      O&apos;chirish
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex w-full flex-shrink-0 flex-col gap-4 lg:w-[360px]">
          <h3 className="font-heading text-base font-bold text-ink">Bosma QR-karta</h3>

          {selected ? (
            <>
              <div className="flex flex-col items-center gap-3.5 rounded-[20px] border border-gray-200 bg-white px-7 py-8 text-center">
                <LogoMark size={40} />
                <span className="font-heading text-base font-extrabold text-ink">BemorOvozi</span>
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Bemor formasini yangi tabda ochish"
                  className="mt-1 mb-1 block transition hover:opacity-80"
                >
                  <Image
                    src={selected.qrDataUrl}
                    alt={`${selected.name} uchun QR kod — bosib ko'rish`}
                    width={168}
                    height={168}
                    unoptimized
                    className="rounded-lg"
                  />
                </a>
                <span className="mt-1.5 font-heading text-[17px] font-extrabold text-ink">{selected.name}</span>
                <span className="text-sm font-bold text-teal">Takliflar va shikoyatlar uchun</span>
                <span className="text-xs text-gray-500">Telefon kamerasi bilan skanerlang</span>
                <span className="mt-2 text-[11px] text-gray-500">bemorovozi.uz</span>
              </div>
              <a
                href={`/api/departments/${selected.id}/pdf`}
                className="w-full rounded-[10px] bg-teal py-3.5 text-center font-heading text-[15px] font-bold text-white"
              >
                PDF yuklab olish
              </a>
            </>
          ) : isLoading ? (
            <LoadingRegion
              className="flex flex-col items-center gap-3.5 rounded-[20px] border border-gray-200 bg-white px-7 py-8"
              label="QR karta yuklanmoqda…"
            >
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-[168px] w-[168px] rounded-lg" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-32" />
            </LoadingRegion>
          ) : (
            <div className="flex flex-grow items-center justify-center rounded-[20px] border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              QR karta ko&apos;rish uchun bo&apos;lim tanlang yoki yangi bo&apos;lim qo&apos;shing.
            </div>
          )}
        </div>
      </div>

      <PushSettingsCard />
      <TelegramLinkCard />
    </div>
  );
}
