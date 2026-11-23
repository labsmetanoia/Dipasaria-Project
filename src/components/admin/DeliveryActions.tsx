"use client";
// Delivery mode on the route sheet: one tap per stop. "Diterima" completes the order (time, who received it,
// cash collected for COD) and sends the customer the delivered message with the guarantee link.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { deliveryFailedAction, markDeliveredAction } from "@/actions/admin";
import { formatDateTime, rupiah } from "@/lib/format";

export function DeliveryActions({ orderId, cod, due, deliveredAt, note, blocked }: { orderId: string; cod: boolean; due: number; deliveredAt: string | null; note: string | null; blocked: string | null }) {
  const [mode, setMode] = useState<"idle" | "done" | "failed">("idle");
  const [who, setWho] = useState("");
  const [cash, setCash] = useState(cod ? String(due) : "");
  const [why, setWhy] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (deliveredAt) return <p className="no-print mt-3 flex items-center gap-1.5 bg-success-50 px-2 py-1.5 text-xs font-semibold text-success-600"><Check className="h-3.5 w-3.5" />Diterima {formatDateTime(deliveredAt)} WIB{note ? ` · ${note}` : ""}</p>;
  if (blocked) return <p className="no-print mt-3 text-xs text-mute">{blocked}</p>;
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => { setErr(null); const r = await fn(); if (!r.ok) setErr(r.error ?? "Gagal."); else { setMode("idle"); router.refresh(); } });
  return (
    <div className="no-print mt-3 border-t border-line pt-3">
      {mode === "idle" && (
        <div className="flex gap-2">
          <button onClick={() => setMode("done")} className="btn-primary flex-1 py-2 text-xs"><Check className="h-4 w-4" /> Diterima</button>
          <button onClick={() => setMode("failed")} className="btn-secondary py-2 text-xs"><X className="h-4 w-4" /> Gagal antar</button>
        </div>
      )}
      {mode === "done" && (
        <div className="space-y-2">
          <input className="input py-2 text-sm" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Diterima oleh (mis. Ibu Rina, satpam)" aria-label="Diterima oleh" maxLength={200} />
          {cod && <label className="block text-xs font-semibold">Uang tunai diterima (tagihan {rupiah(due)})<input className="input mt-1 py-2 text-sm" inputMode="numeric" value={cash} onChange={(e) => setCash(e.target.value.replace(/[^\d]/g, ""))} aria-label="Uang tunai diterima" /></label>}
          <div className="flex gap-2">
            <button disabled={pending} onClick={() => run(() => markDeliveredAction(orderId, who, cod && cash !== "" ? Number(cash) : null))} className="btn-primary flex-1 py-2 text-xs">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan: sudah diterima"}</button>
            <button onClick={() => setMode("idle")} className="btn-secondary py-2 text-xs">Batal</button>
          </div>
        </div>
      )}
      {mode === "failed" && (
        <div className="space-y-2">
          <input className="input py-2 text-sm" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Alasan (mis. tidak ada di rumah, alamat tidak ditemukan)" aria-label="Alasan gagal antar" maxLength={200} />
          <div className="flex gap-2">
            <button disabled={pending} onClick={() => run(() => deliveryFailedAction(orderId, why))} className="btn-primary flex-1 py-2 text-xs">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Catat gagal antar"}</button>
            <button onClick={() => setMode("idle")} className="btn-secondary py-2 text-xs">Batal</button>
          </div>
        </div>
      )}
      {err && <p className="mt-1 text-xs text-gold-ink" role="alert">{err}</p>}
    </div>
  );
}
