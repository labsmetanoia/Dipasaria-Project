"use client";
// Back-office controls on a restaurant's receivables page: record a payment, credit settings, contract prices,
// WhatsApp statement. Each calls a server action and refreshes the page.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Trash2 } from "lucide-react";
import {
  addContractPriceAction, deleteAccountPaymentAction, deleteContractPriceAction, recordAccountPaymentAction, sendStatementAction, updateCreditAction,
} from "@/actions/receivables";
import type { AccountPaymentMethod, BusinessAccount, ContractPrice } from "@/lib/types";
import { PAYMENT_METHOD_LABEL } from "@/lib/receivables";
import { formatDate, rupiah } from "@/lib/format";

const digits = (s: string) => s.replace(/[^\d]/g, "");
const grouped = (s: string) => (s ? Number(s).toLocaleString("id-ID") : "");

function useAction() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string, after?: () => void) =>
    start(async () => {
      setErr(null); setMsg(null);
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Gagal menyimpan.");
      else { if (done) setMsg(done); after?.(); router.refresh(); }
    });
  return { pending, err, msg, run };
}

export function PaymentForm({ accountId, today, suggested }: { accountId: string; today: string; suggested: number }) {
  const [amount, setAmount] = useState(suggested > 0 ? String(suggested) : "");
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState<AccountPaymentMethod>("transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const { pending, err, msg, run } = useAction();
  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={(e) => { e.preventDefault(); run(() => recordAccountPaymentAction(accountId, { amount, paid_on: paidOn, method, reference, note }), "Pembayaran dicatat dan dicocokkan ke tagihan paling lama.", () => { setAmount(""); setReference(""); setNote(""); }); }}
    >
      <h2 className="text-[1.15rem]">Catat pembayaran</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold">Jumlah diterima (Rp)<input className="input mt-1" inputMode="numeric" value={grouped(amount)} onChange={(e) => setAmount(digits(e.target.value))} placeholder="0" required /></label>
        <label className="block text-xs font-semibold">Tanggal diterima<input className="input mt-1" type="date" value={paidOn} max={today} onChange={(e) => setPaidOn(e.target.value)} required /></label>
        <label className="block text-xs font-semibold">Cara bayar<select className="input mt-1" value={method} onChange={(e) => setMethod(e.target.value as AccountPaymentMethod)}>{(Object.keys(PAYMENT_METHOD_LABEL) as AccountPaymentMethod[]).map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}</select></label>
        <label className="block text-xs font-semibold">Referensi (opsional)<input className="input mt-1" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} placeholder="mis. BCA 23/11 Hendra" /></label>
      </div>
      <label className="block text-xs font-semibold">Catatan (opsional)<input className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></label>
      {err && <p className="text-xs text-gold-ink" role="alert">{err}</p>}
      {msg && <p className="text-xs text-success-600" role="status">{msg}</p>}
      <button disabled={pending} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan pembayaran"}</button>
      <p className="text-[11px] text-mute">Pembayaran dicocokkan otomatis ke tagihan dengan jatuh tempo paling awal. Kelebihan bayar disimpan sebagai saldo kredit untuk tagihan berikutnya.</p>
    </form>
  );
}

export function DeletePaymentButton({ accountId, paymentId, label }: { accountId: string; paymentId: string; label: string }) {
  const { pending, err, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} aria-label={`Hapus pembayaran ${label}`} title="Hapus (salah catat)" className="text-mute hover:text-ink"
        onClick={() => { if (confirm(`Hapus pembayaran ${label}? Tagihan yang dilunasinya akan terbuka lagi.`)) run(() => deleteAccountPaymentAction(accountId, paymentId)); }}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
      {err && <span className="text-xs text-gold-ink" role="alert">{err}</span>}
    </span>
  );
}

export function CreditForm({ account }: { account: BusinessAccount }) {
  const [limit, setLimit] = useState(account.credit_limit === null ? "" : String(account.credit_limit));
  const [terms, setTerms] = useState(account.payment_terms);
  const { pending, err, msg, run } = useAction();
  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); run(() => updateCreditAction(account.id, { credit_limit: limit, payment_terms: terms }), "Tersimpan."); }}>
      <h2 className="text-[1.15rem]">Tempo dan batas kredit</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold">Tempo pembayaran<select className="input mt-1" value={terms} onChange={(e) => setTerms(e.target.value as BusinessAccount["payment_terms"])}><option value="prepaid">Bayar di muka (tanpa tempo)</option><option value="days3">Tempo 3 hari</option><option value="weekly">Tempo 7 hari</option></select></label>
        <label className="block text-xs font-semibold">Batas kredit (Rp)<input className="input mt-1" inputMode="numeric" value={grouped(limit)} onChange={(e) => setLimit(digits(e.target.value))} placeholder="Kosong = tanpa batas" /></label>
      </div>
      <p className="text-[11px] text-mute">Pesanan tempo baru ditolak bila sisa tagihan (termasuk pesanan yang belum dikirim) ditambah pesanan itu melebihi batas, atau bila ada tagihan yang lewat jatuh tempo melebihi toleransi di Pengaturan. Restoran tetap bisa membayar dengan transfer atau QRIS.</p>
      {err && <p className="text-xs text-gold-ink" role="alert">{err}</p>}
      {msg && <p className="text-xs text-success-600" role="status">{msg}</p>}
      <button disabled={pending} className="btn-secondary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}</button>
    </form>
  );
}

export interface VariantOption { id: string; label: string; standard: number; cost: number }

export function ContractPrices({ accountId, contracts, variants, today }: { accountId: string; contracts: ContractPrice[]; variants: VariantOption[]; today: string }) {
  const [variantId, setVariantId] = useState("");
  const [price, setPrice] = useState("");
  const [starts, setStarts] = useState(today);
  const [ends, setEnds] = useState("");
  const [note, setNote] = useState("");
  const { pending, err, msg, run } = useAction();
  const byId = new Map(variants.map((v) => [v.id, v]));
  const chosen = byId.get(variantId);
  const p = Number(price || 0);
  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-[1.15rem]">Harga kontrak</h2>
      <p className="text-xs text-mute">Harga yang disepakati per produk menggantikan harga grosir dan diskon akun pada tanggal kirim yang berlaku. Restoran melihat harga ini di toko dan di checkout.</p>
      {contracts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-line text-left text-mute"><th className="py-1.5 pr-2 font-semibold">Produk</th><th className="py-1.5 pr-2 text-right font-semibold">Kontrak</th><th className="py-1.5 pr-2 text-right font-semibold">Grosir</th><th className="py-1.5 pr-2 text-right font-semibold">Margin</th><th className="py-1.5 pr-2 font-semibold">Berlaku</th><th /></tr></thead>
            <tbody>
              {contracts.map((c) => {
                const v = byId.get(c.variant_id);
                const expired = c.ends_on !== null && c.ends_on < today;
                const margin = v && v.cost > 0 ? (c.price - v.cost) / c.price : null;
                return (
                  <tr key={c.id} className={`border-b border-line ${expired ? "text-mute" : ""}`}>
                    <td className="py-1.5 pr-2">{v?.label ?? c.variant_id}{c.note ? <span className="block text-mute">{c.note}</span> : null}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{rupiah(c.price)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{v ? rupiah(v.standard) : "—"}</td>
                    <td className={`py-1.5 pr-2 text-right tabular-nums ${margin !== null && margin < 0.1 ? "font-semibold text-gold-ink" : ""}`}>{margin === null ? "—" : `${Math.round(margin * 100)}%`}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{formatDate(c.starts_on, "short")} – {c.ends_on ? formatDate(c.ends_on, "short") : "seterusnya"}{expired ? " (berakhir)" : c.starts_on > today ? " (mulai nanti)" : ""}</td>
                    <td className="py-1.5 text-right"><button type="button" aria-label={`Hapus harga kontrak ${v?.label ?? ""}`} className="text-mute hover:text-ink" onClick={() => { if (confirm("Hapus harga kontrak ini? Pesanan yang sudah dibuat tidak berubah.")) run(() => deleteContractPriceAction(accountId, c.id)); }}><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="text-xs">Belum ada harga kontrak.</p>}
      <form className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => addContractPriceAction(accountId, { variant_id: variantId, price, starts_on: starts, ends_on: ends, note }), "Harga kontrak ditambahkan.", () => { setPrice(""); setNote(""); }); }}>
        <label className="block text-xs font-semibold sm:col-span-2">Produk<select className="input mt-1" value={variantId} onChange={(e) => setVariantId(e.target.value)} required><option value="">Pilih produk dan ukuran…</option>{variants.map((v) => <option key={v.id} value={v.id}>{v.label} · grosir {rupiah(v.standard)}</option>)}</select></label>
        <label className="block text-xs font-semibold">Harga kontrak per satuan (Rp)<input className="input mt-1" inputMode="numeric" value={grouped(price)} onChange={(e) => setPrice(digits(e.target.value))} required />
          {chosen && p > 0 && <span className="mt-1 block font-normal text-mute">{p < chosen.standard ? `${Math.round((1 - p / chosen.standard) * 100)}% di bawah grosir` : p > chosen.standard ? "di atas harga grosir" : "sama dengan grosir"}{chosen.cost > 0 ? ` · margin ${Math.round(((p - chosen.cost) / p) * 100)}%` : ""}</span>}
        </label>
        <label className="block text-xs font-semibold">Catatan (opsional)<input className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="mis. Kontrak Q1 2027" /></label>
        <label className="block text-xs font-semibold">Mulai<input className="input mt-1" type="date" value={starts} onChange={(e) => setStarts(e.target.value)} required /></label>
        <label className="block text-xs font-semibold">Berakhir (opsional)<input className="input mt-1" type="date" value={ends} min={starts} onChange={(e) => setEnds(e.target.value)} /></label>
        {err && <p className="text-xs text-gold-ink sm:col-span-2" role="alert">{err}</p>}
        {msg && <p className="text-xs text-success-600 sm:col-span-2" role="status">{msg}</p>}
        <div className="sm:col-span-2"><button disabled={pending} className="btn-secondary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tambah harga kontrak"}</button></div>
      </form>
    </section>
  );
}

export function SendStatementButton({ accountId }: { accountId: string }) {
  const [pending, start] = useTransition();
  const [out, setOut] = useState<{ error?: string; status?: string; link?: string | null } | null>(null);
  const router = useRouter();
  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} className="btn-primary" onClick={() => start(async () => { const r = await sendStatementAction(accountId); setOut(r.ok ? r.data : { error: r.error }); if (r.ok) router.refresh(); })}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim ringkasan tagihan via WhatsApp
      </button>
      {out?.error && <p className="text-xs text-gold-ink" role="alert">{out.error}</p>}
      {out?.status === "sent" && <p className="text-xs text-success-600" role="status">Terkirim lewat WhatsApp.</p>}
      {out?.status === "manual" && out.link && <p className="text-xs" role="status">Pesan siap. <a href={out.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-ocean-900 underline">Buka WhatsApp untuk mengirim</a> (API WhatsApp belum diatur).</p>}
      {out?.status && out.status !== "sent" && out.status !== "manual" && <p className="text-xs" role="status">Pesan masuk antrean WhatsApp.</p>}
    </div>
  );
}
