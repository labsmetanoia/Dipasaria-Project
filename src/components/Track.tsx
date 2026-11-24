"use client";
// First-party, anonymous visit funnel. Each step is reported once per visit: the browser remembers what it already
// reported in sessionStorage (cleared when the tab closes) and sends only the step name, plus the product for
// product views and add-to-cart. No cookie, no visitor id, no third-party script.
import { useEffect } from "react";

type Step = "visit" | "product_view" | "add_to_cart" | "checkout_start" | "order_placed";

function send(event: Step, productId?: string) {
  const key = `dp_f:${event}:${productId ?? ""}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  const body = JSON.stringify({ e: event, p: productId });
  if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
    void fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
  }
}

/** Count a step once per visit; with a product, also once per product (for "viewed but not added" in the report). */
export function track(event: Step, productId?: string) {
  try {
    if (navigator.webdriver && !(window as { __dpTrackTests?: boolean }).__dpTrackTests) return; // automated browsers are not customers
    send(event);
    if (productId) send(event, productId);
  } catch { /* storage blocked or offline: skip silently */ }
}

export function TrackView({ event, productId }: { event: Step; productId?: string }) {
  useEffect(() => { track(event, productId); }, [event, productId]);
  return null;
}
