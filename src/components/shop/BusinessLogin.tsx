"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";
import { businessLoginAction } from "@/actions/shop";
import { Field } from "@/components/ui";

export function BusinessLogin({ demoHint }: { demoHint?: boolean }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-ocean-900"><KeyRound className="h-5 w-5 text-tide-600" /><h2 className="font-semibold">Masuk akun bisnis</h2></div>
      <p className="mt-1 text-sm text-mute">Tanpa kata sandi: nomor WhatsApp terdaftar dan kode akses 6 karakter dari kami.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(null);
          start(async () => {
            const r = await businessLoginAction(phone, code);
            if (r.ok) { router.push("/belanja"); router.refresh(); } else setErr(r.error);
          });
        }}
      >
        <Field label="Nomor WhatsApp"><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx xxxx xxxx" required /></Field>
        <Field label="Kode akses"><input className="input uppercase tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" required /></Field>
        {err && <p className="text-sm text-coral-600">{err}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}</button>
      </form>
      {demoHint && <p className="mt-3 rounded-lg bg-warn-50 px-3 py-2 text-xs text-warn-600">Mode demo: coba 081200000001 dengan kode BHR123 (restoran seafood) atau 081200000002 / MNG456 (RM Padang).</p>}
      <p className="mt-4 text-sm text-mute">Belum punya akun? <Link href="/akun/daftar" className="font-semibold text-tide-600">Daftarkan restoran Anda</Link>.</p>
    </div>
  );
}
