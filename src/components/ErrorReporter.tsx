"use client";
// Sends uncaught browser errors to the error log. At most 5 per page load, each distinct message once,
// and noise from browser extensions or cross-origin scripts ("Script error.") is ignored.
import { useEffect } from "react";
import { reportClientErrorAction } from "@/actions/monitor";

const IGNORE = [/^Script error\.?$/i, /ResizeObserver loop/i, /chrome-extension:|moz-extension:|safari-extension:/i, /Loading chunk \d+ failed/i, /NEXT_REDIRECT|NEXT_NOT_FOUND/];

export function sendClientError(message: string, extra: { stack?: string; digest?: string } = {}) {
  if (typeof window === "undefined") return;
  const w = window as Window & { __dpErr?: Set<string> };
  w.__dpErr ??= new Set();
  if (w.__dpErr.size >= 5 || w.__dpErr.has(message) || IGNORE.some((r) => r.test(message) || (extra.stack && r.test(extra.stack)))) return;
  w.__dpErr.add(message);
  reportClientErrorAction({ message, path: window.location.pathname, stack: extra.stack, digest: extra.digest }).catch(() => {});
}

export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (e.filename && !e.filename.startsWith(window.location.origin)) return; // third-party or extension script
      sendClientError(e.message || "Unknown error", { stack: e.error?.stack });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | string | undefined;
      sendClientError(typeof r === "string" ? r : r?.message || "Unhandled promise rejection", { stack: typeof r === "string" ? undefined : r?.stack });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
