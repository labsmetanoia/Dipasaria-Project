"use client";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Promo } from "@/lib/types";
import { deletePromoAction, upsertPromoAction } from "@/actions/admin";
import { Badge, Field } from "@/components/ui";
import { rupiah } from "@/lib/format";

const blank = (): Promo => ({ id: "", code: "", type: "percent", value: 10, min_spend: 0, segment: "all", quota: null, used_count: 0, first_order_only: false, starts_at: null, ends_at: null, is_active: true, description: "" });

export function PromosAdmin({ promos: initial }: { promos: Promo[] }) {
  const [promos, setPromos] = useState(initial);
  const [edit, setEdit] = useState<Promo | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const save = () => edit && start(async () => {
    setErr(null);
    const r = await upsertPromoAction({ ...edit, code: edit.code.toUpperCase().trim() });
    if (!r.ok) { setErr(r.error); return; }
    setPromos((ps) => (ps.some((p) => p.id === r.data.id) ? ps.map((p) => (p.id === r.data.id ? r.data : p)) : [...ps, r.data]));
    setEdit(null);
  });
  const del = (id: string) => start(async () => { if (!confirm("Hapus promo?")) return; await deletePromoAction(id); setPromos((ps) => ps.filter((p) => p.id !== id)); });
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => setEdit(blank())} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Promo baru</button></div>
      <div className="grid gap-3 md:grid-cols-2">
        {promos.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-display text-lg font-semibold tracking-wide text-ocean-900">{p.code}</p><p className="text-sm text-mute">{p.description}</p></div>
              <div className="flex gap-1">{p.is_active ? <Badge tone="success">Aktif</Badge> : <Badge>Nonaktif</Badge>}<Badge tone="tide">{p.segment === "all" ? "Semua" : p.segment === "retail" ? "Rumah tangga" : "Bisnis"}</Badge></div>
            </div>
            <p className="mt-2 text-sm">{p.type === "percent" ? `Diskon ${p.value}%` : p.type === "fixed" ? `Potongan ${rupiah(p.value)}` : "Gratis ongkos kirim"} · min. {rupiah(p.min_spend)}{p.first_order_only ? " · pesanan pertama" : ""}</p>
            <p className="text-xs text-mute">Dipakai {p.used_count}{p.quota !== null ? ` / ${p.quota}` : ""}{p.ends_at ? ` · sampai ${p.ends_at.slice(0, 10)}` : ""}</p>
            <div className="mt-3 flex gap-2"><button onClick={() => setEdit(p)} className="btn-secondary px-3 py-1.5 text-xs">Ubah</button><button onClick={() => del(p.id)} className="btn-ghost px-3 py-1.5 text-xs text-gold-ink"><Trash2 className="h-3.5 w-3.5" /></button></div>
          </div>
        ))}
      </div>
      {edit && (
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold text-ocean-900">{edit.id ? `Ubah ${edit.code}` : "Promo baru"}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Kode"><input className="input uppercase" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></Field>
            <Field label="Jenis"><select className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as Promo["type"] })}><option value="percent">Persen</option><option value="fixed">Potongan tetap</option><option value="free_delivery">Gratis ongkos kirim</option></select></Field>
            <Field label={edit.type === "percent" ? "Persen" : "Nilai (Rp)"}><input type="number" className="input" value={edit.value} disabled={edit.type === "free_delivery"} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) })} /></Field>
            <Field label="Minimal belanja (Rp)"><input type="number" className="input" value={edit.min_spend} onChange={(e) => setEdit({ ...edit, min_spend: Number(e.target.value) })} /></Field>
            <Field label="Segmen"><select className="input" value={edit.segment} onChange={(e) => setEdit({ ...edit, segment: e.target.value as Promo["segment"] })}><option value="all">Semua</option><option value="retail">Rumah tangga</option><option value="business">Bisnis</option></select></Field>
            <Field label="Kuota (kosong = tanpa batas)"><input type="number" className="input" value={edit.quota ?? ""} onChange={(e) => setEdit({ ...edit, quota: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
            <Field label="Mulai"><input type="date" className="input" value={edit.starts_at?.slice(0, 10) ?? ""} onChange={(e) => setEdit({ ...edit, starts_at: e.target.value ? `${e.target.value}T00:00:00+07:00` : null })} /></Field>
            <Field label="Berakhir"><input type="date" className="input" value={edit.ends_at?.slice(0, 10) ?? ""} onChange={(e) => setEdit({ ...edit, ends_at: e.target.value ? `${e.target.value}T23:59:59+07:00` : null })} /></Field>
            <Field label="Deskripsi (tampil ke pelanggan)"><input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={edit.first_order_only} onChange={(e) => setEdit({ ...edit, first_order_only: e.target.checked })} className="accent-ocean-900" /> Hanya pesanan pertama (per nomor WhatsApp)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} className="accent-ocean-900" /> Aktif</label>
          </div>
          {err && <p className="text-sm text-gold-ink">{err}</p>}
          <div className="flex gap-2"><button onClick={save} disabled={pending || !edit.code} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}</button><button onClick={() => setEdit(null)} className="btn-ghost">Batal</button></div>
        </div>
      )}
    </div>
  );
}
