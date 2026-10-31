import type { ReactNode } from "react";
import { STORAGE_LABEL } from "@/lib/config";
import type { OrderStatus, PaymentStatus, StorageClass } from "@/lib/types";
import { STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/config";

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "tide" | "coral" | "success" | "warn" | "frozen" | "dark"; className?: string }) {
  const tones = {
    neutral: "bg-sand-100 text-ink/70",
    tide: "bg-tide-100 text-tide-700",
    coral: "bg-coral-100 text-coral-700",
    success: "bg-success-50 text-success-600",
    warn: "bg-warn-50 text-warn-600",
    frozen: "bg-[#eaf1fb] text-[#2f5f9e]",
    dark: "bg-ocean-900 text-white",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]} ${className}`}>{children}</span>;
}

export function StorageBadge({ storage }: { storage: StorageClass }) {
  const tone = storage === "chilled" ? "tide" : storage === "frozen" ? "frozen" : "warn";
  return <Badge tone={tone}>{STORAGE_LABEL[storage]}</Badge>;
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone: Record<OrderStatus, "neutral" | "tide" | "coral" | "success" | "warn" | "dark"> = {
    new: "coral",
    confirmed: "tide",
    packing: "warn",
    delivering: "dark",
    completed: "success",
    cancelled: "neutral",
  };
  return <Badge tone={tone[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone: Record<PaymentStatus, "neutral" | "success" | "warn" | "coral"> = { unpaid: "coral", awaiting_confirmation: "warn", paid: "success", void: "neutral" };
  return <Badge tone={tone[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="block">
        <span className="label">{label}</span>
        {children}
      </label>
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-tide-500">{icon}</div>}
      <p className="font-display text-lg text-ocean-900">{title}</p>
      {children && <div className="mt-2 text-sm text-mute">{children}</div>}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children, light = false }: { eyebrow?: string; title: string; children?: ReactNode; light?: boolean }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className={`eyebrow ${light ? "text-tide-400" : ""}`}>{eyebrow}</p>}
      <h2 className={`mt-2 text-3xl font-semibold leading-tight sm:text-4xl ${light ? "text-white" : "text-ocean-900"}`}>{title}</h2>
      {children && <p className={`mt-3 text-[15px] leading-relaxed sm:text-base ${light ? "text-white/70" : "text-mute"}`}>{children}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-success-600" : tone === "bad" ? "text-coral-600" : "text-ocean-900";
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-mute">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-mute">{sub}</p>}
    </div>
  );
}
