"use client";

import { useState } from "react";
import { usePushNotifications } from "./usePushNotifications";

const DISMISS_KEY = "bo_push_banner_dismissed";

/**
 * Asks the staff member — once, from a real click — for permission to show notifications.
 * Hidden when already on, when the browser blocked them (Sozlamalar explains how to unblock),
 * or after "Keyinroq".
 */
export function PushNotificationBanner() {
  const push = usePushNotifications();
  // Safe to read storage here: nothing renders until the push support check has run on the client.
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: it just comes back next visit */
    }
  }

  if (dismissed || push.enabled) return null;

  // iPhone/iPad: web push only works once the panel is added to the Home Screen.
  if (push.support === "unsupported" && push.needsInstall) {
    return (
      <div className="flex flex-shrink-0 items-start justify-between gap-3 rounded-xl border border-amber/30 bg-amber-tint px-4 py-3 text-sm text-ink">
        <p className="leading-relaxed">
          <span className="font-bold">iPhone&apos;da bildirishnoma olish uchun:</span> Safari&apos;da «Ulashish» →
          «Bosh ekranga qo&apos;shish», so&apos;ng ilovani shu yerdan oching.
        </p>
        <button type="button" onClick={dismiss} className="flex-shrink-0 font-semibold text-gray-500">
          Yopish
        </button>
      </div>
    );
  }

  if (push.support !== "ok" || push.permission === "denied") return null;

  return (
    <div
      className="flex flex-shrink-0 flex-col gap-3 rounded-xl border border-teal/25 bg-teal-tint px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Bildirishnomalar"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          🔔
        </span>
        <div>
          <p className="text-sm font-bold text-ink">Yangi xabarlar haqida bildirishnoma oling</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-gray-600">
            Boshqa ilovada ishlab turgan bo&apos;lsangiz ham, yangi shikoyat va takliflar ekranda chiqadi.
          </p>
          {push.error && <p className="mt-1 text-[13px] text-coral">{push.error}</p>}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void push.enable()}
          disabled={push.busy}
          className="rounded-[10px] bg-teal px-4 py-2.5 font-heading text-sm font-bold text-white disabled:opacity-60"
        >
          {push.busy ? "Yoqilmoqda..." : "Yoqish"}
        </button>
        <button type="button" onClick={dismiss} className="px-2 py-2.5 text-sm font-semibold text-gray-500">
          Keyinroq
        </button>
      </div>
    </div>
  );
}
