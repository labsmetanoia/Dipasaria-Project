"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";
import { businessLoginAction } from "@/actions/shop";
import { Field } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export function BusinessLogin({ demoHint }: { demoHint?: boolean }) {
 const { t } = useT();
 const [phone, setPhone] = useState("");
 const [code, setCode] = useState("");
 const [err, setErr] = useState<string | null>(null);
 const [pending, start] = useTransition();
 const router = useRouter();
 return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-ocean-950"><KeyRound className="h-5 w-5 text-coral-500" /><h2 className="font-bold">{t.account.login}</h2></div>
      <p className="mt-1 text-sm text-mute">{t.account.loginSub}</p>
      <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(null); start(async () => { const r = await businessLoginAction(phone, code); if (r.ok) { router.push("/belanja"); router.refresh(); } else setErr(r.error); }); }}>
        <Field label={t.checkout.phone}><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx xxxx xxxx" required /></Field>
        <Field label={t.account.code}><input className="input uppercase tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" required /></Field>
        {err && <p className="text-sm text-gold-ink">{err}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.account.enter}</button>
      </form>
      {demoHint && <p className="mt-3 bg-warn-50 px-3 py-2 text-xs text-warn-600">{t.account.demoHint}</p>}
      <p className="mt-4 text-sm text-mute">{t.account.noAccount} <Link href="/akun/daftar" className="font-bold text-gold-ink">{t.account.register}</Link>.</p>
    </div>
  );
}
