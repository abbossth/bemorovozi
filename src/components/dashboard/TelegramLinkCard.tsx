"use client";

import { useState } from "react";
import useSWR from "swr";

type Status = { connected: boolean; notificationMode: "realtime" | "digest" };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TelegramLinkCard() {
  const { data, mutate, isLoading } = useSWR<Status>("/api/telegram/link-token", fetcher);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link-token", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Xatolik yuz berdi");
      if (!result.deepLink) {
        setError("Bot username sozlanmagan (TELEGRAM_STAFF_BOT_USERNAME) — ma'muriyat bilan bog'laning.");
        return;
      }
      setDeepLink(result.deepLink);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/telegram/link-token", { method: "DELETE" });
      setDeepLink(null);
      await mutate();
    } catch {
      setError("Ulanishni bekor qilib bo'lmadi");
    } finally {
      setBusy(false);
    }
  }

  async function handleModeChange(mode: "realtime" | "digest") {
    setBusy(true);
    try {
      await fetch("/api/telegram/link-token", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationMode: mode }),
      });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-gray-200 bg-white p-6">
      <h3 className="font-heading text-base font-bold text-ink">Telegram bildirishnomalar</h3>
      <p className="mt-1 text-sm text-gray-500">
        Yuqori jiddiylikdagi xabarlar haqida Telegram orqali darhol bildirishnoma oling.
      </p>

      {error && <p className="mt-3 rounded-lg bg-coral-tint px-3 py-2 text-[13px] text-coral">{error}</p>}

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Yuklanmoqda...</p>
      ) : data?.connected ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal">
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#0F6E5C" strokeWidth={2}>
              <path d="M5 12.5l4 4 10-11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Telegram ulangan
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink">Past/o&apos;rta jiddiylik uchun bildirishnoma</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleModeChange("realtime")}
                disabled={busy}
                className="rounded-lg border-[1.5px] px-4 py-2 text-sm font-semibold disabled:opacity-60"
                style={{
                  borderColor: data.notificationMode === "realtime" ? "#0F6E5C" : "#E4E7EB",
                  background: data.notificationMode === "realtime" ? "#EAF5F2" : "#FFFFFF",
                  color: data.notificationMode === "realtime" ? "#0F6E5C" : "#4B5563",
                }}
              >
                Real-vaqt
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("digest")}
                disabled={busy}
                className="rounded-lg border-[1.5px] px-4 py-2 text-sm font-semibold disabled:opacity-60"
                style={{
                  borderColor: data.notificationMode === "digest" ? "#0F6E5C" : "#E4E7EB",
                  background: data.notificationMode === "digest" ? "#EAF5F2" : "#FFFFFF",
                  color: data.notificationMode === "digest" ? "#0F6E5C" : "#4B5563",
                }}
              >
                Kunlik xulosa
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Yuqori jiddiylikdagi xabarlar bu sozlamadan qat&apos;i nazar har doim darhol yuboriladi.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDisconnect}
            disabled={busy}
            className="self-start text-[13px] font-semibold text-gray-500 hover:text-coral disabled:opacity-50"
          >
            Ulanishni bekor qilish
          </button>
        </div>
      ) : deepLink ? (
        <div className="mt-4 flex flex-col gap-3">
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-[10px] bg-teal px-6 py-3 font-heading text-sm font-bold text-white"
          >
            Telegram&apos;da ochish →
          </a>
          <p className="text-xs text-gray-500">
            Havola 10 daqiqa amal qiladi. Botda /start bosgach hisobingiz avtomatik ulanadi.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={busy}
          className="mt-4 rounded-[10px] bg-teal px-6 py-3 font-heading text-sm font-bold text-white disabled:opacity-60"
        >
          Telegram orqali ulash
        </button>
      )}
    </div>
  );
}
