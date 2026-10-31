"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { DeliveryArea } from "@/lib/types";
import { applyAccountAction } from "@/actions/shop";
import { BUSINESS_TYPES } from "@/lib/config";
import { Field } from "@/components/ui";

export function BusinessApplyForm({ areas }: { areas: DeliveryArea[] }) {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (done) {
    return (
      <div className="rounded-2xl bg-success-50 p-5 text-success-600">
        <CheckCircle2 className="h-6 w-6" />
        <p className="mt-2 font-semibold">Pendaftaran diterima.</p>
        <p className="mt-1 text-sm">Kami tinjau dalam 1 hari kerja dan kirim kode akses 6 karakter ke WhatsApp Anda. Setelah itu, masuk di halaman Akun dengan nomor WhatsApp dan kode tersebut.</p>
      </div>
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setErr(null);
        start(async () => {
          const r = await applyAccountAction({
            business_name: String(f.get("business_name")),
            contact_name: String(f.get("contact_name")),
            phone: String(f.get("phone")),
            address: String(f.get("address")),
            area_id: String(f.get("area_id")) || null,
            business_type: String(f.get("business_type")),
            notes: String(f.get("notes")),
          });
          if (r.ok) setDone(true); else setErr(r.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama usaha"><input name="business_name" className="input" required placeholder="RM Sinar Minang" /></Field>
        <Field label="Jenis usaha"><select name="business_type" className="input">{BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Nama kontak"><input name="contact_name" className="input" required placeholder="Pemilik / kepala dapur" /></Field>
        <Field label="Nomor WhatsApp"><input name="phone" className="input" inputMode="tel" required placeholder="08xx xxxx xxxx" /></Field>
      </div>
      <Field label="Area pengiriman">
        <select name="area_id" className="input"><option value="">Pilih area…</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      </Field>
      <Field label="Alamat dapur"><textarea name="address" className="input" rows={2} required /></Field>
      <Field label="Yang biasa Anda beli per minggu (opsional)" hint="Jenis ikan, ayam, telur; perkiraan kg; pemasok saat ini."><textarea name="notes" className="input" rows={2} /></Field>
      {err && <p className="text-sm text-coral-600">{err}</p>}
      <button className="btn-accent w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim pendaftaran"}</button>
      <p className="text-xs text-mute">Dengan mendaftar Anda menyetujui kebijakan privasi kami. Tanpa biaya, tanpa komitmen volume.</p>
    </form>
  );
}
