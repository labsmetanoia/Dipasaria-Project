"use client";
// Rating after delivery: tap the stars for the whole order; optionally tap stars for a product that stood out (good
// or bad); add a comment; send. One rating per order. A product only receives the stars the customer tapped for it:
// the overall score is never copied onto products (except when the order holds a single product, where they are
// the same thing), so product averages and "which product was the problem" stay truthful.
import { useState, useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import type { Order } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
import { rateOrderAction } from "@/actions/care";

export function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return <span className="inline-flex" aria-hidden>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-coral-500 text-coral-500" : "text-sand-300"}`} />)}</span>;
}

function StarPicker({ value, onChange, label, size = "h-8 w-8" }: { value: number; onChange: (n: number) => void; label: string; size?: string }) {
  return (
    <span role="radiogroup" aria-label={label} className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} / 5`} onClick={() => onChange(n)} className="p-0.5">
          <Star className={`${size} ${n <= value ? "fill-coral-500 text-coral-500" : "text-sand-300"}`} />
        </button>
      ))}
    </span>
  );
}

export function RatingForm({ order, existing, claimOpen }: { order: Order; existing: { stars: number; comment: string } | null; /** the guarantee window is still open: a low rating points to the report form */ claimOpen: boolean }) {
  const { locale } = useT();
  const en = locale === "en";
  const [done, setDone] = useState(existing);
  const [stars, setStars] = useState(0);
  const [perItem, setPerItem] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // one row per product (two sizes of the same product are rated together)
  const lines = order.items.filter((i, k, all) => all.findIndex((x) => x.product_id === i.product_id) === k);
  const send = () => start(async () => {
    setErr(null);
    const items = lines.length === 1 ? [{ item_id: lines[0].id, stars: perItem[lines[0].id] ?? stars }] : lines.filter((i) => perItem[i.id]).map((i) => ({ item_id: i.id, stars: perItem[i.id] }));
    const r = await rateOrderAction(order.code, order.phone, { stars, comment, items });
    if (r.ok) setDone({ stars, comment }); else setErr(r.error);
  });

  if (done) {
    return (
      <div className="card p-5 text-sm">
        <p className="flex flex-wrap items-center gap-2"><Stars value={done.stars} size="h-5 w-5" /><b>{en ? "Thank you for your rating." : "Terima kasih atas penilaian Anda."}</b></p>
        {done.comment && <p className="mt-1 text-mute">“{done.comment}”</p>}
        {done.stars <= 2 && <p className="mt-2 border-l-4 border-coral-500 bg-coral-50 px-3 py-2">{claimOpen
          ? (en ? "We are sorry this order fell short. Report the product with a photo below and we will replace it or refund you." : "Maaf pesanan ini mengecewakan. Laporkan produknya dengan foto di bawah, kami ganti atau kembalikan dananya.")
          : (en ? "We are sorry this order fell short. Tell us what happened on WhatsApp and we will put it right." : "Maaf pesanan ini mengecewakan. Ceritakan lewat WhatsApp apa yang terjadi, kami perbaiki.")}</p>}
      </div>
    );
  }
  return (
    <div className="card p-5 text-sm">
      <h2 className="text-lg text-ocean-950">{en ? "How was your order?" : "Bagaimana pesanan Anda?"}</h2>
      <p className="mt-1 text-xs text-mute">{en ? "Your rating helps us choose better fish and helps other customers decide." : "Penilaian Anda membantu kami memilih ikan yang lebih baik dan membantu pelanggan lain memutuskan."}</p>
      <div className="mt-3"><StarPicker value={stars} onChange={setStars} label={en ? "Rating for the whole order" : "Nilai untuk seluruh pesanan"} /></div>
      {stars > 0 && (
        <>
          {lines.length > 1 && <p className="mt-4 text-xs font-semibold">{en ? "Stars per product (optional)" : "Nilai per produk (opsional)"} <span className="font-normal text-mute">{en ? "· tap only the ones that stood out" : "· ketuk hanya yang menonjol, baik atau buruk"}</span></p>}
          <ul className={`${lines.length > 1 ? "mt-1" : "hidden"} divide-y divide-line border-y border-line`}>
            {lines.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{i.product_name}</span>
                <StarPicker value={perItem[i.id] ?? 0} onChange={(n) => setPerItem((m) => ({ ...m, [i.id]: n }))} label={`${en ? "Rating for" : "Nilai untuk"} ${i.product_name}`} size="h-5 w-5" />
              </li>
            ))}
          </ul>
          <label className="mt-3 block"><span className="label">{en ? "Comment (optional)" : "Komentar (opsional)"}</span><textarea className="input min-h-20" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={en ? "What was good, what could be better?" : "Apa yang sudah baik, apa yang perlu diperbaiki?"} /></label>
          {err && <p className="mt-2 text-xs text-gold-ink" role="alert">{err}</p>}
          <button type="button" disabled={pending} onClick={send} className="btn-primary mt-3">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {en ? "Send rating" : "Kirim penilaian"}</button>
        </>
      )}
    </div>
  );
}
