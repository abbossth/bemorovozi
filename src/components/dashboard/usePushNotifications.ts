"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TEST_PAYLOAD } from "@/lib/push/payload";
import { isNotifyEnabled, setNotifyEnabled, showLocalNotification } from "./localNotify";

// Two layers, both switched on by ONE click (the permission prompt must come from a click):
//  1. Web push — the browser's push service wakes our service worker (public/sw.js), so a
//     notification appears even when the dashboard tab is closed.
//  2. Local notifications — while the dashboard tab is open (even in the background, even with
//     another app in front) it polls and raises the notification itself. It needs no push
//     channel, so it still works where the browser's push delivery is blocked or broken.

export type PushSupport = "checking" | "ok" | "unsupported" | "unconfigured";
export type PushTestResult = "idle" | "waiting" | "delivered" | "not-delivered";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const TEST_WAIT_MS = 12000;

function urlBase64ToUint8Array(base64: string) {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

async function saveOnServer(sub: PushSubscription) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) throw new Error("Serverga saqlab bo'lmadi");
}

type Env = { support: PushSupport; needsInstall: boolean };

// What this browser can do never changes during a visit, so it is read once. The server (and the
// hydration pass) always see "checking", which keeps the first client render identical to the HTML.
const SERVER_ENV: Env = { support: "checking", needsInstall: false };
let cachedEnv: Env | null = null;

function detectEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!capable) {
    // iPhone/iPad only expose push to apps added to the Home Screen.
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    cachedEnv = { support: "unsupported", needsInstall: ios && !standalone };
  } else {
    cachedEnv = { support: PUBLIC_KEY ? "ok" : "unconfigured", needsInstall: false };
  }
  return cachedEnv;
}

const subscribeToNothing = () => () => {};

export function usePushNotifications() {
  const { support, needsInstall } = useSyncExternalStore(subscribeToNothing, detectEnv, () => SERVER_ENV);
  const [permissionOverride, setPermission] = useState<NotificationPermission | null>(null);
  const permission: NotificationPermission =
    permissionOverride ?? (support === "ok" ? Notification.permission : "default");

  // `enabled` = the user turned notifications on in this browser (local layer); `pushConnected` = the
  // web-push subscription exists too (works with the tab closed).
  const [enabledOverride, setEnabled] = useState<boolean | null>(null);
  const enabled = enabledOverride ?? (support === "ok" && isNotifyEnabled());
  const [pushConnected, setPushConnected] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<PushTestResult>("idle");
  const lastPushAtRef = useRef(0);

  // The worker reports every push it receives, so we can tell "server sent it" from "browser got it".
  useEffect(() => {
    if (support !== "ok") return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.source === "bemorovozi-sw" && event.data.type === "push-received") {
        lastPushAtRef.current = Date.now();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    navigator.serviceWorker.startMessages?.();
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [support]);

  useEffect(() => {
    if (support !== "ok") return;

    let cancelled = false;
    (async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;
        if (existing && Notification.permission === "granted") {
          // Re-register with the server every visit: it also moves this browser to whoever is logged in now.
          await saveOnServer(existing).catch(() => {});
          setNotifyEnabled(true);
          setEnabled(true);
          setPushConnected(true);
        }
      } catch {
        /* the service worker failed to register; enable() will surface the problem */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [support]);

  const enable = useCallback(async () => {
    if (!PUBLIC_KEY) return;
    setBusy(true);
    setError(null);
    setTestResult("idle");
    try {
      // requestPermission() has to be called straight from the click.
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setError(
          result === "denied"
            ? "Bildirishnomalarga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering."
            : "Ruxsat so'rovi yopildi."
        );
        return;
      }

      // Permission is enough for the local layer, whatever happens with web push below.
      setNotifyEnabled(true);
      setEnabled(true);

      await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const registration = await navigator.serviceWorker.ready;
      const key = urlBase64ToUint8Array(PUBLIC_KEY);
      try {
        let sub = await registration.pushManager.getSubscription();
        // A subscription made with another server key (after a key change) can never receive our pushes.
        if (sub && !sameKey(sub.options.applicationServerKey, key)) {
          await sub.unsubscribe();
          sub = null;
        }
        sub ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        await saveOnServer(sub);
        setPushConnected(true);
      } catch (e) {
        setError(
          `Push kanalini ulab bo'lmadi (${e instanceof Error ? e.message : "xato"}). Panel ochiq turganda bildirishnomalar baribir ko'rsatiladi.`
        );
      }

      // Show right away that it works.
      void showLocalNotification(TEST_PAYLOAD, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? `Yoqib bo'lmadi: ${e.message}` : "Yoqib bo'lmadi");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    setTestResult("idle");
    setNotifyEnabled(false);
    setEnabled(false);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setPushConnected(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "O'chirib bo'lmadi");
    } finally {
      setBusy(false);
    }
  }, []);

  /**
   * Raises the test notification locally (proves the browser/OS shows them) AND asks the server to push
   * the same one, then reports whether the push actually reached this browser.
   */
  const sendTest = useCallback(async () => {
    setError(null);
    setTestResult("waiting");
    const startedAt = Date.now();
    void showLocalNotification(TEST_PAYLOAD, { replace: true });

    if (!pushConnected) {
      setTestResult("not-delivered");
      return;
    }
    const res = await fetch("/api/push/test", { method: "POST" });
    if (!res.ok) {
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Yuborib bo'lmadi");
      setTestResult("idle");
      return;
    }
    while (Date.now() - startedAt < TEST_WAIT_MS) {
      if (lastPushAtRef.current >= startedAt) {
        setTestResult("delivered");
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setTestResult("not-delivered");
  }, [pushConnected]);

  return { support, needsInstall, permission, enabled, pushConnected, busy, error, testResult, enable, disable, sendTest };
}
