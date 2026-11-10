"use client";
import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import type { BusinessAccount, DeliverySlot, Settings } from "@/lib/types";
import { approveAccountAction, regenerateCodeAction, updateAccountAction } from "@/actions/admin";
import { msgAccessCode, waTo } from "@/lib/wa";
import { TERMS_LABEL } from "@/lib/config";
import { formatDateTime, jamRange } from "@/lib/format";
import { Badge, Field } from "@/components/ui";

export function AccountsAdmin({ accounts: initial, slots, settings, focusId }: { accounts: BusinessAccount[]; slots: DeliverySlot[]; settings: Settings; focusId?: string }) {
  const [accounts, setAccounts] = useState(initial);
  const [open, setOpen] = useState<string | null>(focusId ?? initial.find((a) => a.status === "pending")?.id ?? null);
  const update = (a: BusinessAccount) => setAccounts((xs) => xs.map((x) => (x.id === a.id ? a : x)));
  const pending = accounts.filter((a) => a.status === "pending");
  const active = accounts.filter((a) => a.status !== "pending");
  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h2 className="mb-2 text-gold-ink">Menunggu persetujuan ({pending.length})</h2>
          <div className="space-y-3">{pending.map((a) => <AccountCard key={a.id} a={a} slots={slots} settings={settings} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} onChange={update} />)}</div>
        </section>
      )}
      <section>
        <h2 className="mb-2 text-ocean-900">Akun bisnis ({active.length})</h2>
        <div className="space-y-3">{active.map((a) => <AccountCard key={a.id} a={a} slots={slots} settings={settings} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} onChange={update} />)}</div>
      </section>
    </div>
  );
}

function AccountCard({ a, slots, settings, open, onToggle, onChange }: { a: BusinessAccount; slots: DeliverySlot[]; settings: Settings; open: boolean; onToggle: () => void; onChange: (a: BusinessAccount) => void }) {
  const [form, setForm] = useState({ discount_pct: a.discount_pct, payment_terms: a.payment_terms, allow_cod: a.allow_cod, preferred_slot_id: a.preferred_slot_id ?? slots.find((s) => s.segment === "business")?.id ?? null, notes: a.notes });
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const bizSlots = slots.filter((s) => s.segment !== "retail");
  const approve = () => start(async () => { const r = await approveAccountAction(a.id, form); if (r.ok) onChange(r.data); });
  const saveNotes = () => start(async () => { const r = await updateAccountAction(a.id, { notes: form.notes, discount_pct: form.discount_pct, payment_terms: form.payment_terms, allow_cod: form.allow_cod, preferred_slot_id: form.preferred_slot_id }); if (r.ok) onChange(r.data); });
  const toggleSuspend = () => start(async () => { const r = await updateAccountAction(a.id, { status: a.status === "suspended" ? "approved" : "suspended" }); if (r.ok) onChange(r.data); });
  const regen = () => start(async () => { if (!confirm("Buat kode baru? Kode lama dan sesi masuk sebelumnya tidak akan berlaku lagi.")) return; const r = await regenerateCodeAction(a.id); if (r.ok) onChange(r.data); });
  return (
    <div className="card">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-semibold text-ocean-900">{a.business_name} <span className="ml-1 text-xs font-normal text-mute">{a.business_type}</span></p>
          <p className="truncate text-xs text-mute">{a.contact_name} · +{a.phone} · {a.address}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          {a.status === "pending" ? <Badge tone="coral">Menunggu</Badge> : a.status === "suspended" ? <Badge>Ditangguhkan</Badge> : <Badge tone="success">Aktif</Badge>}
          {a.status === "approved" && <span className="hidden text-xs text-mute sm:inline">{TERMS_LABEL[a.payment_terms]}{a.discount_pct ? ` · −${a.discount_pct}%` : ""}</span>}
        </div>
      </button>
      {open && (
        <div className="border-t border-line p-4">
          {a.notes && a.status === "pending" && <p className="mb-3 bg-sand-100 px-3 py-2 text-sm">Catatan pendaftar: “{a.notes}”</p>}
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Diskon akun (%)"><input type="number" step="0.5" min="0" max="20" className="input" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: Number(e.target.value) })} /></Field>
            <Field label="Tempo pembayaran"><select className="input" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value as BusinessAccount["payment_terms"] })}>{Object.entries(TERMS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Jam pengiriman favorit"><select className="input" value={form.preferred_slot_id ?? ""} onChange={(e) => setForm({ ...form, preferred_slot_id: e.target.value || null })}><option value="">—</option>{bizSlots.map((s) => <option key={s.id} value={s.id}>{jamRange(s.start_time, s.end_time)} {s.label}</option>)}</select></Field>
            <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" checked={form.allow_cod} onChange={(e) => setForm({ ...form, allow_cod: e.target.checked })} className="accent-ocean-900" /> Boleh COD</label>
          </div>
          <Field label="Catatan internal"><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Preferensi ukuran, hari pemesanan, kontak dapur…" /></Field>
          <p className="mt-1 text-xs text-mute">Tangga tempo dari rencana bisnis: prabayar → 3 hari setelah 10 pesanan lancar → mingguan setelah 30 pesanan. Daftar {formatDateTime(a.applied_at)}.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {a.status === "pending" ? (
              <button onClick={approve} disabled={pending} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Setujui dan buat kode akses</button>
            ) : (
              <>
                <button onClick={saveNotes} disabled={pending} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}</button>
                <button onClick={toggleSuspend} disabled={pending} className="btn-secondary">{a.status === "suspended" ? "Aktifkan lagi" : "Tangguhkan (stop-ship)"}</button>
              </>
            )}
          </div>
          {a.access_code && a.status !== "pending" && (
            <div className="mt-4 flex flex-wrap items-center gap-3 bg-ocean-900 p-4 text-white">
              <KeyRound className="h-5 w-5 text-tide-400" />
              <div><p className="text-xs text-white/60">Kode akses</p><p className="font-display text-2xl font-semibold tracking-[0.25em]">{a.access_code}</p></div>
              <div className="ml-auto flex flex-wrap gap-2">
                <button onClick={() => { navigator.clipboard?.writeText(a.access_code!); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="btn text-sm text-white ring-1 ring-white/30 hover:bg-white/10">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Salin</button>
                <a href={waTo(a.phone, msgAccessCode(a, settings))} target="_blank" rel="noreferrer" className="btn-accent text-sm"><MessageCircle className="h-4 w-4" /> Kirim melalui WhatsApp</a>
                <button onClick={regen} disabled={pending} className="btn text-sm text-white/80 ring-1 ring-white/20 hover:bg-white/10"><RefreshCw className="h-4 w-4" /> Kode baru</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
