"use client";
// "Kabari saya": a sold-out product keeps the customer instead of losing them. One WhatsApp message when it is back.
import { useState, useTransition } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { stockAlertAction } from "@/actions/care";
import { useCart } from "@/store/cart";
import { useT } from "@/lib/i18n/client";

export function StockAlert({ productId }: { productId: string }) {
  const { locale } = useT();
  const en = locale === "en";
  const saved = useCart((s) => s.customer.phone);
  const [phone, setPhone] = useState(saved ?? "");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (done) return <p className="flex items-center gap-2 bg-success-50 px-3 py-2 font-sans text-sm text-success-600" role="status"><Check className="h-4 w-4" />{en ? "We'll message you on WhatsApp when it's back." : "Kami kabari lewat WhatsApp begitu tersedia lagi."}</p>;
  return (
    <form className="border border-line bg-sand-50 p-3" onSubmit={(e) => { e.preventDefault(); setErr(null); start(async () => { const r = await stockAlertAction(productId, phone); if (r.ok) setDone(true); else setErr(r.error); }); }}>
      <p className="flex items-center gap-2 font-sans text-sm font-semibold"><BellRing className="h-4 w-4 text-gold-ink" />{en ? "Tell me when it's back" : "Kabari saya saat tersedia lagi"}</p>
      <div className="mt-2 flex gap-2">
        <input className="input flex-1 py-2" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx xxxx xxxx" aria-label={en ? "WhatsApp number" : "Nomor WhatsApp"} required />
        <button className="btn-primary px-4 py-2 text-xs" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : en ? "Notify me" : "Kabari"}</button>
      </div>
      {err && <p className="mt-1 text-xs text-gold-ink" role="alert">{err}</p>}
    </form>
  );
}
