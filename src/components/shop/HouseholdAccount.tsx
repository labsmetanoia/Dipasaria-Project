"use client";
// Household account: profile and consent, address book, delete account. (Order history is rendered by the page.)
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { CustomerAddress, DeliveryArea } from "@/lib/types";
import { deleteAccountAction, deleteAddressAction, saveAddressAction, updateProfileAction } from "@/actions/customer";
import { Field } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export function ProfileCard({ name, marketing }: { name: string; marketing: boolean }) {
  const { locale } = useT();
  const en = locale === "en";
  const [n, setN] = useState(name);
  const [m, setM] = useState(marketing);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="card space-y-3 p-5">
      <h2 className="font-bold text-ocean-950">{en ? "Profile" : "Profil"}</h2>
      <Field label={en ? "Name" : "Nama"}><input className="input" value={n} maxLength={80} onChange={(e) => { setN(e.target.value); setSaved(false); }} /></Field>
      <label className="flex items-start gap-2 text-sm text-ink/80"><input type="checkbox" className="mt-0.5 accent-ocean-950" checked={m} onChange={(e) => { setM(e.target.checked); setSaved(false); }} />{en ? "Send me the daily catch and offers on WhatsApp (at most a few times a week; you can stop any time)." : "Kirimi saya info tangkapan harian dan penawaran di WhatsApp (paling banyak beberapa kali seminggu; bisa berhenti kapan saja)."}</label>
      <button disabled={pending} onClick={() => start(async () => { await updateProfileAction({ name: n, marketing_opt_in: m }); setSaved(true); })} className="btn-secondary text-sm">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? (en ? "Saved" : "Tersimpan") : en ? "Save" : "Simpan"}</button>
    </div>
  );
}

type Draft = { id?: string; label: string; recipient: string; address: string; area_id: string; maps_url: string; is_default: boolean };
const empty: Draft = { label: "", recipient: "", address: "", area_id: "", maps_url: "", is_default: false };

export function AddressBook({ addresses, areas }: { addresses: CustomerAddress[]; areas: DeliveryArea[] }) {
  const { locale } = useT();
  const en = locale === "en";
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const save = () => start(async () => {
    if (!draft) return;
    setErr(null);
    const r = await saveAddressAction({ ...draft, area_id: draft.area_id || null, maps_url: draft.maps_url || null });
    if (!r.ok) { setErr(r.error); return; }
    setDraft(null); router.refresh();
  });
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2"><h2 className="font-bold text-ocean-950">{en ? "Delivery addresses" : "Alamat pengiriman"}</h2>{!draft && addresses.length < 10 && <button onClick={() => setDraft({ ...empty, label: addresses.length ? "" : en ? "Home" : "Rumah" })} className="btn-secondary px-3 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> {en ? "Add" : "Tambah"}</button>}</div>
      {addresses.length === 0 && !draft && <p className="mt-2 text-sm text-mute">{en ? "No saved address yet. Addresses you use at checkout can be saved here." : "Belum ada alamat tersimpan. Alamat yang Anda pakai saat checkout bisa disimpan di sini."}</p>}
      <ul className="mt-3 divide-y divide-line">
        {addresses.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 py-3 text-sm">
            <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-none text-gold-ink" /><div><p className="font-semibold">{a.label}{a.is_default && <span className="ml-2 bg-sand-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{en ? "Default" : "Utama"}</span>}</p><p className="text-mute">{a.recipient ? `${a.recipient} · ` : ""}{a.address}{a.area_id ? ` · ${areas.find((x) => x.id === a.area_id)?.name ?? ""}` : ""}</p></div></div>
            <div className="flex flex-none gap-1">
              {!a.is_default && <button aria-label={en ? "Make default" : "Jadikan utama"} title={en ? "Make default" : "Jadikan utama"} disabled={pending} onClick={() => start(async () => { await saveAddressAction({ ...a, is_default: true }); router.refresh(); })} className="p-1.5 text-mute hover:text-ink"><Star className="h-4 w-4" /></button>}
              <button aria-label={en ? "Edit" : "Ubah"} onClick={() => setDraft({ id: a.id, label: a.label, recipient: a.recipient, address: a.address, area_id: a.area_id ?? "", maps_url: a.maps_url ?? "", is_default: a.is_default })} className="p-1.5 text-mute hover:text-ink"><Pencil className="h-4 w-4" /></button>
              <button aria-label={en ? "Delete" : "Hapus"} disabled={pending} onClick={() => { if (confirm(en ? "Delete this address?" : "Hapus alamat ini?")) start(async () => { await deleteAddressAction(a.id); router.refresh(); }); }} className="p-1.5 text-mute hover:text-gold-ink"><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ul>
      {draft && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={en ? "Address name" : "Nama alamat"}><input className="input" maxLength={30} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder={en ? "Home, Office…" : "Rumah, Kantor…"} /></Field>
            <Field label={en ? "Recipient" : "Penerima"}><input className="input" maxLength={80} value={draft.recipient} onChange={(e) => setDraft({ ...draft, recipient: e.target.value })} /></Field>
          </div>
          <Field label={en ? "Area" : "Wilayah"}><select className="input" value={draft.area_id} onChange={(e) => setDraft({ ...draft, area_id: e.target.value })}><option value="">{en ? "Choose area" : "Pilih wilayah"}</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label={en ? "Full address" : "Alamat lengkap"}><textarea className="input" rows={2} maxLength={400} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
          <Field label={en ? "Location pin (Google Maps, optional)" : "Petunjuk lokasi (Google Maps, opsional)"}><input className="input" value={draft.maps_url} onChange={(e) => setDraft({ ...draft, maps_url: e.target.value })} placeholder="https://maps.app.goo.gl/…" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-ocean-950" checked={draft.is_default} onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })} />{en ? "Use as default address" : "Jadikan alamat utama"}</label>
          {err && <p className="text-sm text-gold-ink" role="alert">{err}</p>}
          <div className="flex gap-2"><button disabled={pending} onClick={save} className="btn-primary text-sm">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : en ? "Save address" : "Simpan alamat"}</button><button onClick={() => { setDraft(null); setErr(null); }} className="btn-secondary text-sm">{en ? "Cancel" : "Batal"}</button></div>
        </div>
      )}
    </div>
  );
}

export function DeleteAccount() {
  const { locale } = useT();
  const en = locale === "en";
  return (
    <form action={deleteAccountAction} onSubmit={(e) => { if (!confirm(en ? "Delete your account? Your profile and saved addresses are removed. Past orders stay in our records for bookkeeping." : "Hapus akun Anda? Profil dan alamat tersimpan akan dihapus. Riwayat pesanan tetap kami simpan untuk pembukuan.")) e.preventDefault(); }}>
      <button className="text-sm font-semibold text-mute underline hover:text-gold-ink">{en ? "Delete my account" : "Hapus akun saya"}</button>
    </form>
  );
}
