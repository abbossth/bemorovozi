"use client";

import { useCallback, useRef, useState } from "react";
import type { ConversationView } from "@/lib/conversation/types";

type ApiResponse = {
  token?: string;
  view?: ConversationView;
  trackingCode?: string;
  error?: string;
  expired?: boolean;
};

/**
 * Client side of the ONE conversation engine (POST /api/conversation). Text chat and voice
 * both drive it through this hook — voice just feeds it transcribed speech and reads the
 * assistant's text reply aloud. The token is opaque and signed; all logic lives on the server.
 */
export function useConversation(initial: { token: string; view: ConversationView }) {
  const [token, setToken] = useState(initial.token);
  const [view, setView] = useState(initial.view);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  const tokenRef = useRef(token);
  const busyRef = useRef(false);

  const call = useCallback(async (body: Record<string, unknown>): Promise<boolean> => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current, ...body }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok || !data.token || !data.view) {
        if (data.expired) setExpired(true);
        throw new Error(data.error ?? "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
      }
      tokenRef.current = data.token;
      setToken(data.token);
      setView(data.view);
      if (data.trackingCode) setTrackingCode(data.trackingCode);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  /** Sends what the patient typed or said. Resolves true when the assistant's reply is in. */
  const send = useCallback(
    async (text: string) => {
      setPendingText(text);
      try {
        return await call({ action: "message", text });
      } finally {
        setPendingText(null);
      }
    },
    [call]
  );

  return {
    token,
    view,
    pendingText,
    busy,
    error,
    expired,
    trackingCode,
    send,
    continueTalking: useCallback(() => call({ action: "continue" }), [call]),
    restart: useCallback(async () => {
      const ok = await call({ action: "restart" });
      if (ok) setTrackingCode(null);
      return ok;
    }, [call]),
    confirm: useCallback((channel: "text" | "voice") => call({ action: "confirm", channel }), [call]),
    clearError: useCallback(() => setError(null), []),
  };
}
