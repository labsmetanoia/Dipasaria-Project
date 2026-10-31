"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { lookupOrderAction } from "@/actions/shop";
import { Field } from "@/components/ui";

export function OrderLookup({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        start(async () => {
          const o = await lookupOrderAction(code, phone);
          if (!o) { setErr("Pesanan tidak ditemukan. Periksa nomor pesanan dan nomor WhatsApp yang dipakai saat memesan."); return; }
          router.push(`/pesanan/${o.code}?hp=${o.phone}`);
        });
      }}
    >
      <h2 className="font-semibold text-ocean-900">Lacak pesanan</h2>
      <p className="mt-1 text-sm text-mute">Dari HP mana pun, dengan nomor pesanan dan nomor WhatsApp pemesan.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Nomor pesanan"><input className="input uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="DP-261101-K7M2" required /></Field>
        <Field label="Nomor WhatsApp"><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx" required /></Field>
      </div>
      {err && <p className="mt-2 text-sm text-coral-600">{err}</p>}
      <button className="btn-primary mt-4" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4" /> Lacak</>}</button>
    </form>
  );
}
