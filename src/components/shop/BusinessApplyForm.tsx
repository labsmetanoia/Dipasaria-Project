"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { DeliveryArea } from "@/lib/types";
import { applyAccountAction } from "@/actions/shop";
import { BUSINESS_TYPES } from "@/lib/config";
import { Field } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export function BusinessApplyForm({ areas }: { areas: DeliveryArea[] }) {
 const { t } = useT();
 const [done, setDone] = useState(false);
 const [err, setErr] = useState<string | null>(null);
 const [pending, start] = useTransition();
 if (done) return <div className=" bg-success-50 p-5 text-success-600"><CheckCircle2 className="h-6 w-6" /><p className="mt-2 font-bold">{t.apply.doneTitle}</p><p className="mt-1 text-sm">{t.apply.doneBody}</p></div>;
 return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setErr(null); start(async () => { const r = await applyAccountAction({ business_name: String(f.get("business_name")), contact_name: String(f.get("contact_name")), phone: String(f.get("phone")), address: String(f.get("address")), area_id: String(f.get("area_id")) || null, business_type: String(f.get("business_type")), notes: String(f.get("notes")) }); if (r.ok) setDone(true); else setErr(r.error); }); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.apply.businessName}><input name="business_name" className="input" required placeholder="RM Sinar Minang" /></Field>
        <Field label={t.apply.businessType}><select name="business_type" className="input">{BUSINESS_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label={t.apply.contactName}><input name="contact_name" className="input" required placeholder={t.apply.contactPlaceholder} /></Field>
        <Field label={t.apply.phone}><input name="phone" className="input" inputMode="tel" required placeholder="08xx xxxx xxxx" /></Field>
      </div>
      <Field label={t.apply.area}><select name="area_id" className="input"><option value="">{t.apply.chooseArea}</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
      <Field label={t.apply.address}><textarea name="address" className="input" rows={2} required /></Field>
      <Field label={t.apply.notes} hint={t.apply.notesHint}><textarea name="notes" className="input" rows={2} /></Field>
      {err && <p className="text-sm text-gold-ink">{err}</p>}
      <button className="btn-accent w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.apply.submit}</button>
      <p className="text-xs text-mute">{t.apply.consent}</p>
    </form>
  );
}
