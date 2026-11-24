"use client";
// Refunds on an order: what was given back, when, how, and a photo of the proof. An order waiting for a refund
// ("perlu pengembalian dana") is closed by recording it.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import type { Refund } from "@/lib/types";
import { recordRefundAction } from "@/actions/admin";
import { Field } from "@/components/ui";
import { formatDate, nowJakarta, rupiah } from "@/lib/format";
import { shrinkImage } from "@/lib/shrinkImage";

const METHOD: Record<Refund["method"], string> = { transfer: "Transfer bank", cash: "Tunai", qris: "QRIS / e-wallet", va: "Virtual account", other: "Lainnya" };

export function RefundPanel({ orderId, refunds, due, suggested, claims }: { orderId: string; refunds: Refund[]; due: boolean; suggested: number; claims: Array<{ id: string; amount: number | null }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(suggested || ""));
  // the suggestion changes when the order is cancelled or a claim is decided on the same page
  useEffect(() => { setAmount(String(suggested || "")); }, [suggested]);
  const [on, setOn] = useState(nowJakarta().date);
  const [method, setMethod] = useState<Refund["method"]>("transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const [claimId, setClaimId] = useState(claims.length === 1 ? claims[0].id : "");
  const save = () => start(async () => {
    setErr(null);
    const r = await recordRefundAction(orderId, { amount: Number(amount.replace(/\D/g, "")), refunded_on: on, method, reference, note, proof, claim_id: claimId || null });
    if (!r.ok) { setErr(r.error); return; }
    setAmount(""); setReference(""); setNote(""); setProof(null);
    router.refresh();
  });
  const total = refunds.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="card p-5" data-refunds>
      <h2 className="text-lg text-ocean-900">Pengembalian dana</h2>
      {due && <p className="mt-2 bg-warn-50 px-3 py-2 text-sm text-warn-600">Pesanan ini menunggu pengembalian dana. Setelah dana dikirim, catat di sini; status pembayarannya menjadi “Dibatalkan”.</p>}
      {refunds.length > 0 && (
        <ul className="mt-3 divide-y divide-line text-sm">
          {refunds.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
              <span><b>{rupiah(r.amount)}</b> · {formatDate(r.refunded_on, "short")} · {METHOD[r.method]}{r.reference ? ` · ref. ${r.reference}` : ""}{r.note ? <span className="block text-xs text-mute">{r.note}</span> : null}</span>
              {r.proof && <details><summary className="cursor-pointer text-xs font-semibold text-gold-ink">Lihat bukti</summary>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.proof} alt={`Bukti pengembalian ${rupiah(r.amount)}`} className="mt-2 max-h-80 border border-line" /></details>}
            </li>
          ))}
          <li className="py-2 text-right text-sm">Total dikembalikan: <b>{rupiah(total)}</b></li>
        </ul>
      )}
      <details className="mt-3" open={due}>
        <summary className="cursor-pointer text-sm font-semibold text-gold-ink">Catat pengembalian dana</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Jumlah dikembalikan (Rp)"><input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Tanggal"><input className="input" type="date" value={on} onChange={(e) => setOn(e.target.value)} /></Field>
          <Field label="Cara"><select className="input" value={method} onChange={(e) => setMethod(e.target.value as Refund["method"])}>{(Object.keys(METHOD) as Refund["method"][]).map((m) => <option key={m} value={m}>{METHOD[m]}</option>)}</select></Field>
          <Field label="Nomor referensi bank (opsional)"><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} /></Field>
          {claims.length > 0 && <Field label="Untuk laporan garansi"><select className="input" value={claimId} onChange={(e) => setClaimId(e.target.value)}><option value="">Bukan dari laporan garansi</option>{claims.map((c) => <option key={c.id} value={c.id}>Laporan {c.id}{c.amount ? ` · ${rupiah(c.amount)}` : ""}</option>)}</select></Field>}
          <Field label="Catatan (opsional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer px-3 py-2 text-xs"><Camera className="h-4 w-4" /> {proof ? "Ganti foto bukti" : "Foto bukti transfer"}<input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setProof(await shrinkImage(f)); }} /></label>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {proof && <img src={proof} alt="Bukti" className="h-14 w-14 border border-line object-cover" />}
          <button onClick={save} disabled={pending || !amount} className="btn-primary text-sm">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan pengembalian"}</button>
        </div>
        {err && <p className="mt-2 text-sm text-gold-ink" role="alert">{err}</p>}
      </details>
    </div>
  );
}
