"use client";
// Cloudflare Turnstile: a free, mostly invisible "are you human" check. Renders nothing unless
// TURNSTILE_SITE_KEY is set on the server (read at runtime by the root layout, so changing it needs no rebuild).
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SiteKey = createContext("");
export function TurnstileProvider({ siteKey, children }: { siteKey: string; children: React.ReactNode }) {
  return <SiteKey.Provider value={siteKey}>{children}</SiteKey.Provider>;
}
/** True when the bot check is configured: forms then wait for a token before enabling submit. */
export function useTurnstileOn(): boolean {
  return useContext(SiteKey).length > 0;
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window !== "undefined" && window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error("turnstile script blocked")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/**
 * Calls onToken with a fresh token once the visitor passes, and with null when it expires or fails.
 * Bump `resetKey` after a failed submit: a token can be used only once.
 */
export function Turnstile({ onToken, resetKey = 0, action }: { onToken: (token: string | null) => void; resetKey?: number; action?: string }) {
  const siteKey = useContext(SiteKey);
  const { locale } = useT();
  const [failed, setFailed] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!siteKey) return;
    let gone = false;
    loadScript()
      .then(() => {
        if (gone || !el.current || !window.turnstile) return;
        widget.current = window.turnstile.render(el.current, {
          sitekey: siteKey,
          action,
          size: "flexible",
          theme: "light",
          language: "auto",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => { cb.current(null); if (!gone) setFailed(true); });
    return () => {
      gone = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [action, siteKey]);

  useEffect(() => {
    if (resetKey && widget.current && window.turnstile) {
      cb.current(null);
      window.turnstile.reset(widget.current);
    }
  }, [resetKey]);

  if (!siteKey) return null;
  return (
    <div>
      <div ref={el} className="min-h-[65px]" />
      {failed && <p role="alert" className="mt-1 bg-warn-50 px-3 py-2 text-xs text-warn-600">{locale === "en" ? "The security check could not load. Check your connection and reload the page, or order through WhatsApp." : "Verifikasi keamanan tidak dapat dimuat. Periksa koneksi lalu muat ulang halaman, atau pesan melalui WhatsApp."}</p>}
    </div>
  );
}
