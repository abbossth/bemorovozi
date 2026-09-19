"use client";

import { usePushNotifications } from "./usePushNotifications";

export function PushSettingsCard() {
  const push = usePushNotifications();

  let status: string;
  if (push.support === "checking") status = "Tekshirilmoqda...";
  else if (push.support === "unconfigured") status = "Server tomonida sozlanmagan (VAPID kalitlari yo'q).";
  else if (push.support === "unsupported")
    status = push.needsInstall
      ? "iPhone'da avval sahifani Bosh ekranga qo'shing (Ulashish → Bosh ekranga qo'shish), so'ng shu yerdan yoqing."
      : "Bu brauzer bildirishnomalarni qo'llab-quvvatlamaydi.";
  else if (push.permission === "denied")
    status = "Brauzer bildirishnomalarni bloklagan. Manzil satridagi qulf belgisi → Bildirishnomalar → «Ruxsat berish».";
  else if (push.enabled)
    status =
      push.pushConnected && push.testResult !== "not-delivered"
        ? "Yoqilgan — yangi xabarlar boshqa tab yoki ilova ustida ham ko'rinadi (panel yopiq bo'lsa ham)."
        : "Yoqilgan — panel tabi ochiq turganda (boshqa tab yoki ilova ustida ishlasangiz ham) yangi xabarlar ko'rinadi.";
  else status = "O'chiq. Yoqsangiz, yangi xabarlar operatsion tizim bildirishnomasi bo'lib keladi.";

  const canToggle = push.support === "ok" && push.permission !== "denied";

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-[15px] font-extrabold text-ink">🔔 Bildirishnomalar (shu qurilmada)</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{status}</p>
        </div>
        {canToggle && (
          <button
            type="button"
            onClick={() => void (push.enabled ? push.disable() : push.enable())}
            disabled={push.busy}
            className={`flex-shrink-0 rounded-[10px] px-4 py-2.5 font-heading text-sm font-bold disabled:opacity-60 ${
              push.enabled ? "border-[1.5px] border-gray-200 bg-white text-ink" : "bg-teal text-white"
            }`}
          >
            {push.busy ? "..." : push.enabled ? "O'chirish" : "Yoqish"}
          </button>
        )}
      </div>

      {push.enabled && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void push.sendTest()}
              disabled={push.testResult === "waiting"}
              className="text-sm font-bold text-teal disabled:opacity-60"
            >
              {push.testResult === "waiting" ? "Kutilmoqda..." : "Test bildirishnoma yuborish"}
            </button>
          </div>
          {push.testResult === "delivered" && (
            <p className="text-[13px] text-teal">✅ Push kanali ishlayapti: bildirishnoma serverdan brauzerga yetib keldi.</p>
          )}
          {push.testResult === "not-delivered" && (
            <p className="rounded-lg bg-amber-tint px-3 py-2 text-[13px] leading-relaxed text-ink">
              ⚠️ Bildirishnoma shu brauzerda ko&apos;rsatildi, lekin server push&apos;i brauzerga yetib kelmadi
              (brauzerning push kanali ulanmagan bo&apos;lishi mumkin). Panel tabi ochiq turgan paytda yangi xabarlar
              baribir bildirishnoma bo&apos;lib chiqadi — tabni yopib qo&apos;ymang.
            </p>
          )}
        </div>
      )}
      {push.error && (
        <p className="text-[13px] text-coral" role="alert">
          {push.error}
        </p>
      )}
    </div>
  );
}
