import type { PushPayload } from "@/lib/push/payload";

// Notifications shown by the dashboard tab itself, straight through the service worker — no push
// service involved. This is what makes "I'm on another tab" work even when the browser's push channel
// doesn't deliver: as long as the dashboard tab is open (in the background), it keeps polling for new
// items and raises the same notification. Web push additionally covers a closed tab.

const FLAG = "bo_notify_enabled";

/** The staff member opted in on this browser (set when they press "Yoqish"). */
export function setNotifyEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG, "1");
    else localStorage.removeItem(FLAG);
  } catch {
    /* storage unavailable: the choice just isn't remembered */
  }
}

export function isNotifyEnabled() {
  try {
    return typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

/**
 * Shows the notification via the service worker. If one with the same tag is already up (e.g. the push
 * got there first) it is left alone, so nothing shows twice — unless `replace` (used by the test button).
 */
export async function showLocalNotification(payload: PushPayload, { replace = false } = {}) {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;

  const existing = await registration.getNotifications({ tag: payload.tag });
  if (existing.length > 0) {
    if (!replace) return false;
    existing.forEach((n) => n.close());
  }

  await registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    lang: "uz",
    tag: payload.tag,
    requireInteraction: payload.urgent,
    data: { url: payload.url },
  });
  return true;
}
