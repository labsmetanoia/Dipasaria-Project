"use client";
// On the restaurant's statement link: pay open invoices by virtual account. The amount is chosen first (overdue,
// delivered, or everything including orders not delivered yet); the payment is matched to the oldest invoices.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { VaPay } from "@/components/shop/VaPay";
import { rupiah } from "@/lib/format";

export function StatementPay({ token, banks, overdue, delivered, all, min }: { token: string; banks: Array<{ id: string; label: string }>; overdue: number; delivered: number; all: number; min: number }) {
  const router = useRouter();
  const options = [
    ...(overdue >= min ? [{ k: "overdue", label: "Lewat jatuh tempo", amount: overdue }] : []),
    ...(delivered >= min && delivered !== overdue ? [{ k: "delivered", label: "Semua yang sudah dikirim", amount: delivered }] : []),
    ...(all >= min && all !== delivered ? [{ k: "all", label: "Termasuk pesanan yang belum dikirim", amount: all }] : []),
  ];
  const [amount, setAmount] = useState(options[0]?.amount ?? all);
  const [custom, setCustom] = useState("");
  const [go, setGo] = useState(false);
  const typed = Number(custom.replace(/\D/g, ""));
  const chosen = custom ? typed : amount;
  const valid = chosen >= min && chosen <= all;
  return (
    <section className="no-print mx-auto mb-4 max-w-3xl border border-line bg-white p-5" data-statement-pay>
      <h2 className="text-xl text-ocean-950">Bayar tagihan</h2>
      <p className="text-sm text-mute">Transfer ke virtual account untuk jumlah yang Anda pilih; pembayaran terkonfirmasi otomatis dan dicocokkan ke faktur terlama.</p>
      {!go ? (
        <div className="mt-3 space-y-3">
          <div className="space-y-2" role="radiogroup" aria-label="Jumlah">
            {options.map((o) => (
              <label key={o.k} className={`flex cursor-pointer items-center justify-between border px-3 py-2 text-sm ${!custom && amount === o.amount ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}>
                <span className="flex items-center gap-2"><input type="radio" name="amt" checked={!custom && amount === o.amount} onChange={() => { setAmount(o.amount); setCustom(""); }} className="accent-ocean-950" />{o.label}</span><b>{rupiah(o.amount)}</b>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">Jumlah lain <input className="input w-40 py-1.5" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Rp" aria-label="Jumlah lain" /></label>
          </div>
          {custom && !valid && <p className="text-xs text-gold-ink">Antara {rupiah(min)} dan {rupiah(all)}.</p>}
          <button type="button" disabled={!valid} onClick={() => setGo(true)} className="btn-primary">Bayar {valid ? rupiah(chosen) : ""} dengan virtual account</button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm">Jumlah: <b>{rupiah(chosen)}</b> · <button type="button" onClick={() => setGo(false)} className="font-semibold text-gold-ink underline">ubah</button></p>
          <VaPay banks={banks} target={{ kind: "statement", token, amount: chosen }} onDone={() => setTimeout(() => router.refresh(), 1200)} fallback={<p className="text-sm text-mute">Anda juga dapat transfer ke rekening yang tertera di bawah dan mengirim bukti melalui WhatsApp.</p>} />
        </>
      )}
    </section>
  );
}
