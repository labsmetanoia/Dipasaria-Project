// "Isi minggu ini" of a trader's-pick box: what the owner chose at this week's auction. Server component.
import type { Product } from "@/lib/types";
import { formatDate, nowJakarta } from "@/lib/format";

/** The contents text in the visitor's language; empty when the owner has not set this week's contents yet. */
export function contentsOf(p: Pick<Product, "weekly_contents" | "weekly_contents_en">, en: boolean): string {
  return ((en && p.weekly_contents_en) || p.weekly_contents || "").trim();
}

export function WeeklyContents({ product, en }: { product: Product; en: boolean }) {
  if (!product.curated) return null;
  const text = contentsOf(product, en);
  const at = product.weekly_contents_at ? nowJakarta(new Date(product.weekly_contents_at)).date : null;
  return (
    <div className="mt-5 border-l-4 border-coral-500 bg-sand-100 px-4 py-3 font-sans text-[14px]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-gold-ink">{en ? "This week's contents" : "Isi minggu ini"}{at ? ` · ${formatDate(at, "short", en ? "en" : "id")}` : ""}</p>
      {text ? <p className="mt-1 whitespace-pre-line">{text}</p> : <p className="mt-1 text-mute">{en ? "We choose the contents at the auction and list them here. Order now and we pick the best of the week for you." : "Isinya kami pilih di lelang dan kami tulis di sini. Pesan sekarang, kami pilihkan yang terbaik minggu ini."}</p>}
    </div>
  );
}
