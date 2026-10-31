"use client";
import { Badge } from "./index";
import { useT } from "@/lib/i18n/client";
import { dict } from "@/lib/i18n/dict";
import type { Locale } from "@/lib/i18n";
import type { OrderStatus, PaymentStatus, StorageClass } from "@/lib/types";

function useDict(locale?: Locale) {
  const ctx = useT();
  return locale ? dict[locale] : ctx.t;
}

export function StorageBadge({ storage, locale }: { storage: StorageClass; locale?: Locale }) {
  const t = useDict(locale);
  const tone = storage === "chilled" ? "tide" : storage === "frozen" ? "frozen" : "warn";
  return <Badge tone={tone}>{t.storage[storage]}</Badge>;
}

export function StatusBadge({ status, locale }: { status: OrderStatus; locale?: Locale }) {
  const t = useDict(locale);
  const tone: Record<OrderStatus, "neutral" | "tide" | "coral" | "success" | "warn" | "dark"> = { new: "coral", confirmed: "tide", packing: "warn", delivering: "dark", completed: "success", cancelled: "neutral" };
  return <Badge tone={tone[status]}>{t.status[status]}</Badge>;
}

export function PaymentBadge({ status, locale }: { status: PaymentStatus; locale?: Locale }) {
  const t = useDict(locale);
  const tone: Record<PaymentStatus, "neutral" | "success" | "warn" | "coral"> = { unpaid: "coral", awaiting_confirmation: "warn", paid: "success", void: "neutral" };
  return <Badge tone={tone[status]}>{t.paymentStatus[status]}</Badge>;
}
