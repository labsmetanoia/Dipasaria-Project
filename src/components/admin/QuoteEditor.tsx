"use client";
// Back-office: write a quotation for a restaurant account or a prospect. Prices start from the wholesale price (or
// the account's current price) and show the margin against cost, so a quotation is never sent below cost by mistake.
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { BusinessAccount, Product, Quotation, QuotationLine } from "@/lib/types";
import { saveQuoteAction } from "@/actions/admin";
import { Field } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { unitPrice } from "@/lib/pricing";
import { UNIT_LABEL, BUSINESS_TYPES } from "@/lib/config";

type Draft = Omit<Quotation, "id" | "code" | "status" | "accepted_at" | "accepted_name" | "created_at">;

export function QuoteEditor({ quote, accounts, products, defaults, prefillAccount = null }: { quote: Quotation | null; accounts: BusinessAccount[]; products: Product[]; defaults: { valid_until: string; price_from: string }; prefillAccount?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fromAccount = (id: string | null): Partial<Draft> => {
    const a = accounts.find((x) => x.id === id);
    return a ? { account_id: a.id, business_name: a.business_name, contact_name: a.contact_name, phone: a.phone, address: a.address, business_type: a.business_type, npwp: a.npwp ?? null, tax_name: a.tax_name ?? null, tax_address: a.tax_address ?? null } : { account_id: null };
  };
  const [q, setQ] = useState<Draft>(() => quote
    ? { account_id: quote.account_id, business_name: quote.business_name, contact_name: quote.contact_name, phone: quote.phone, address: quote.address, business_type: quote.business_type, npwp: quote.npwp, tax_name: quote.tax_name, tax_address: quote.tax_address, lines: quote.lines, valid_until: quote.valid_until, price_from: quote.price_from, price_to: quote.price_to, note: quote.note }
    : { business_name: "", contact_name: "", phone: "", address: "", business_type: BUSINESS_TYPES[0], npwp: null, tax_name: null, tax_address: null, lines: [], price_to: null, note: "", ...defaults, account_id: null, ...fromAccount(prefillAccount) });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setSaved(false); setQ((x) => ({ ...x, [k]: v })); };
  const account = accounts.find((a) => a.id === q.account_id) ?? null;
  const variants = useMemo(() => products.flatMap((p) => p.variants.filter((v) => v.is_active).map((v) => ({ p, v }))), [products]);
  const find = (id: string) => variants.find((x) => x.v.id === id);
  const [pick, setPick] = useState("");
  const addLine = () => {
    const f = find(pick);
    if (!f || q.lines.some((l) => l.variant_id === pick)) return;
    set("lines", [...q.lines, { variant_id: pick, price: unitPrice(f.v, "business", account), note: "" }]);
    setPick("");
  };
  const setLine = (i: number, patch: Partial<QuotationLine>) => set("lines", q.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const save = () => start(async () => {
    setErr(null);
    const r = await saveQuoteAction({ ...q, ...(quote ? { id: quote.id } : {}) });
    if (!r.ok) { setErr(r.error); return; }
    setSaved(true);
    if (!quote) router.push(`/admin/penawaran/${r.data.id}`); else router.refresh();
  });
  return (
    <div className="card space-y-5 p-5" data-quote-editor>
      <div>
        <h2 className="text-lg text-ocean-900">Untuk siapa</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label="Akun bisnis"><select className="input" name="account" value={q.account_id ?? ""} onChange={(e) => { setSaved(false); setQ((x) => ({ ...x, ...(e.target.value ? fromAccount(e.target.value) : { account_id: null }) })); }}><option value="">Calon pelanggan (belum punya akun)</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.business_name}{a.status === "pending" ? " (menunggu)" : ""}</option>)}</select></Field>
          <Field label="Nama usaha"><input className="input" name="business_name" value={q.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Hotel Pantai Indah" disabled={Boolean(account)} /></Field>
          <Field label="Nama kontak"><input className="input" name="contact_name" value={q.contact_name} onChange={(e) => set("contact_name", e.target.value)} disabled={Boolean(account)} /></Field>
          <Field label="Nomor WhatsApp"><input className="input" name="phone" inputMode="tel" value={q.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xx xxxx xxxx" disabled={Boolean(account)} /></Field>
          <Field label="Alamat"><input className="input" value={q.address} onChange={(e) => set("address", e.target.value)} disabled={Boolean(account)} /></Field>
          <Field label="Jenis usaha"><select className="input" value={q.business_type} onChange={(e) => set("business_type", e.target.value)} disabled={Boolean(account)}>{[...new Set([q.business_type, ...BUSINESS_TYPES])].filter(Boolean).map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="NPWP (opsional)"><input className="input" inputMode="numeric" value={q.npwp ?? ""} onChange={(e) => set("npwp", e.target.value || null)} /></Field>
          <Field label="Nama sesuai NPWP"><input className="input" value={q.tax_name ?? ""} onChange={(e) => set("tax_name", e.target.value || null)} /></Field>
        </div>
      </div>

      <div>
        <h2 className="text-lg text-ocean-900">Produk dan harga</h2>
        <p className="text-xs text-mute">Harga awal: harga grosir{account ? " atau harga akun ini saat ini" : ""}. Margin dihitung dari harga modal produk.</p>
        {q.lines.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm" data-quote-lines>
              <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="py-2 pr-2">Produk</th><th className="py-2 pr-2 text-right">Grosir</th><th className="py-2 pr-2">Harga penawaran</th><th className="py-2 pr-2 text-right">Margin</th><th className="py-2 pr-2">Catatan</th><th /></tr></thead>
              <tbody>
                {q.lines.map((l, i) => {
                  const f = find(l.variant_id);
                  const margin = f && l.price > 0 ? ((l.price - f.v.cost) / l.price) * 100 : null;
                  return (
                    <tr key={l.variant_id} className="border-b border-line/60">
                      <td className="py-2 pr-2"><b>{f?.p.name ?? "Produk tidak aktif"}</b> <span className="text-mute">{f?.v.label}</span></td>
                      <td className="py-2 pr-2 text-right text-mute">{f ? rupiah(f.v.price_business) : "—"}</td>
                      <td className="py-2 pr-2"><span className="flex items-center gap-1"><input className="input w-32 py-1.5" inputMode="numeric" aria-label={`Harga ${f?.p.name ?? ""}`} value={l.price || ""} onChange={(e) => setLine(i, { price: Number(e.target.value.replace(/\D/g, "")) })} /><span className="text-xs text-mute">/{f ? UNIT_LABEL[f.v.unit] : ""}</span></span></td>
                      <td className={`py-2 pr-2 text-right ${margin !== null && margin < 8 ? "font-bold text-gold-ink" : ""}`}>{margin === null ? "—" : `${margin.toFixed(1).replace(".", ",")}%`}</td>
                      <td className="py-2 pr-2"><input className="input py-1.5" value={l.note} maxLength={120} onChange={(e) => setLine(i, { note: e.target.value })} placeholder="mis. disiangi, potong steak" /></td>
                      <td className="py-2"><button type="button" onClick={() => set("lines", q.lines.filter((_, j) => j !== i))} aria-label="Hapus baris" className="btn-ghost px-2 py-1 text-gold-ink"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Field label="Tambah produk"><select className="input min-w-72" name="add_variant" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Pilih produk dan ukuran…</option>{variants.filter((x) => !q.lines.some((l) => l.variant_id === x.v.id)).map(({ p, v }) => <option key={v.id} value={v.id}>{p.name} · {v.label} ({rupiah(v.price_business)}/{UNIT_LABEL[v.unit]})</option>)}</select></Field>
          <button type="button" onClick={addLine} disabled={!pick} className="btn-secondary mb-0.5 text-sm"><Plus className="h-4 w-4" /> Tambah</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Berlaku untuk diterima sampai"><input className="input" type="date" name="valid_until" value={q.valid_until} onChange={(e) => set("valid_until", e.target.value)} /></Field>
        <Field label="Harga berlaku mulai"><input className="input" type="date" name="price_from" value={q.price_from} onChange={(e) => set("price_from", e.target.value)} /></Field>
        <Field label="Harga berlaku sampai (opsional)" hint="Kosongkan: sampai ada perubahan"><input className="input" type="date" name="price_to" value={q.price_to ?? ""} onChange={(e) => set("price_to", e.target.value || null)} /></Field>
      </div>
      <Field label="Catatan untuk pelanggan (opsional)"><textarea className="input" rows={3} value={q.note} maxLength={1500} onChange={(e) => set("note", e.target.value)} placeholder="Contoh: harga untuk pengiriman 3 kali seminggu; termasuk penyiangan; tempo mingguan setelah 10 pesanan." /></Field>
      {err && <p className="text-sm text-gold-ink" role="alert">{err}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : quote ? "Simpan perubahan" : "Simpan draf"}</button>
        {saved && <span className="text-sm text-success-600">Tersimpan.</span>}
      </div>
    </div>
  );
}
