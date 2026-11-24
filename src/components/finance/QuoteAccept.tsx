"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { acceptQuoteAction } from "@/actions/sales";

/** Accept a quotation: a name and a confirmation tick; the prices become the restaurant's contract prices. */
export function QuoteAccept({ token, code, validUntil }: { token: string; code: string; validUntil: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ approved: boolean } | null>(null);
  const [pending, start] = useTransition();
  if (done) {
    return (
      <div className="flex items-start gap-3 bg-success-50 p-5 text-success-600" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
        <p className="text-sm font-semibold">{done.approved ? "Terima kasih. Harga ini sudah berlaku untuk pesanan akun bisnis Anda." : "Terima kasih. Kami akan menghubungi Anda melalui WhatsApp untuk mengaktifkan akun bisnis; harga ini berlaku untuk pesanan Anda setelahnya."}</p>
      </div>
    );
  }
  return (
    <form className="space-y-3 bg-white p-5" data-quote-accept onSubmit={(e) => { e.preventDefault(); setErr(null); start(async () => { const r = await acceptQuoteAction(token, name); if (!r.ok) { setErr(r.error); return; } setDone(r.data); router.refresh(); }); }}>
      <h2 className="text-xl text-ocean-950">Terima penawaran {code}</h2>
      <p className="text-sm text-mute">Dapat diterima sampai {validUntil}. Setelah diterima, harga di atas menjadi harga kontrak untuk pesanan Anda selama masa harga.</p>
      <label className="block text-sm"><span className="label">Nama Anda</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoComplete="name" /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-ocean-950" />Saya menyetujui harga dan ketentuan dalam penawaran ini atas nama usaha kami.</label>
      {err && <p className="text-sm text-gold-ink" role="alert">{err}</p>}
      <button disabled={pending || !agree || name.trim().length < 2} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Terima penawaran"}</button>
    </form>
  );
}
