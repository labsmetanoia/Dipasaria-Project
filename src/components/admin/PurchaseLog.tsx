"use client";
// Dawn buying log, per product on the buying list: what was actually bought and paid, and what was left or thrown away.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { Purchase } from "@/lib/types";
import { addPurchaseAction, deletePurchaseAction } from "@/actions/admin";
import { rupiah } from "@/lib/format";

const KIND: Record<Purchase["kind"], string> = { purchase: "Beli", leftover: "Sisa", waste: "Buang" };

export function PurchaseLog({ date, productId, unit, unitLabel, suggested, entries }: { date: string; productId: string; unit: string; unitLabel: string; suggested: number; entries: Purchase[] }) {
  const [kind, setKind] = useState<Purchase["kind"]>("purchase");
  const [qty, setQty] = useState(String(suggested).replace(".", ","));
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const bought = entries.filter((e) => e.kind === "purchase");
  const boughtQty = bought.reduce((s, e) => s + e.qty, 0);
  const boughtCost = bought.reduce((s, e) => s + e.total_cost, 0);
  const save = () => start(async () => {
    setErr(null);
    const r = await addPurchaseAction({ delivery_date: date, product_id: productId, kind, qty: Number(qty.replace(",", ".")), unit, total_cost: kind === "purchase" ? Number(cost || 0) : 0, supplier, note: "" });
    if (!r.ok) { setErr(r.error); return; }
    setCost(""); router.refresh();
  });
  return (
    <div className="no-print">
      {entries.length > 0 && (
        <ul className="mb-2 space-y-0.5 text-xs">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2"><span><b>{KIND[e.kind]}</b> {String(e.qty).replace(".", ",")} {unitLabel}{e.kind === "purchase" ? ` · ${rupiah(e.total_cost)} (${rupiah(Math.round(e.total_cost / e.qty))}/${unitLabel})` : ""}{e.supplier ? ` · ${e.supplier}` : ""}</span>
              <button onClick={() => start(async () => { await deletePurchaseAction(e.id); router.refresh(); })} aria-label="Hapus catatan" className="p-1 text-mute hover:text-gold-ink"><Trash2 className="h-3.5 w-3.5" /></button></li>
          ))}
          {bought.length > 1 && <li className="text-mute">Total dibeli {String(boughtQty).replace(".", ",")} {unitLabel} · {rupiah(boughtCost)}</li>}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <select className="input w-auto py-1.5 text-xs" value={kind} onChange={(e) => setKind(e.target.value as Purchase["kind"])} aria-label="Jenis catatan">{(Object.keys(KIND) as Purchase["kind"][]).map((k) => <option key={k} value={k}>{KIND[k]}</option>)}</select>
        <input className="input w-20 py-1.5 text-xs" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} aria-label={`Jumlah (${unitLabel})`} />
        <span className="text-xs text-mute">{unitLabel}</span>
        {kind === "purchase" && <input className="input w-28 py-1.5 text-xs" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ""))} placeholder="Total Rp" aria-label="Total bayar (Rp)" />}
        {kind === "purchase" && <input className="input w-28 py-1.5 text-xs" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Pemasok / lot" aria-label="Pemasok atau lot" maxLength={80} />}
        <button disabled={pending} onClick={save} className="btn-secondary px-2.5 py-1.5 text-xs">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Catat"}</button>
      </div>
      {err && <p className="mt-1 text-xs text-gold-ink" role="alert">{err}</p>}
    </div>
  );
}
