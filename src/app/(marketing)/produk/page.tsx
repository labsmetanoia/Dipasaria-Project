import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { FishDiagram } from "@/components/site/FishDiagram";
import { Crosshairs } from "@/components/site/Decor";
import { ProductArt } from "@/components/ProductArt";
import { rupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Produk" };

const copy = {
  id: { eyebrow: "Produk", title: "Pilih spesies, ukuran dan cara penyiapannya.", sub: "Setiap ikan membawa nama Indonesia, Inggris dan ilmiah, grade ukuran per ekor, dan opsi penyiapan: siangi, fillet, steak, kupas. Ditimbang setelah disiapkan; Anda membayar berat final.", labels: { head: "Kepala", loin: "Punggung", belly: "Perut", tail: "Ekor", steak: "Steak", fillet: "Fillet" }, searchPh: "Cari produk…", from: "mulai", retail: "retail", open: "Buka di toko", all: "Belanja semua produk" },
  en: { eyebrow: "Products", title: "Choose the species, the size and how it's prepared.", sub: "Every fish carries its Indonesian, English and scientific name, a size grade per fish, and preparation options: gutted, fillet, steak, peeled. Weighed after preparation; you pay the final weight.", labels: { head: "Head", loin: "Loin", belly: "Belly", tail: "Tail", steak: "Steak", fillet: "Fillet" }, searchPh: "Search products…", from: "from", retail: "retail", open: "Open in shop", all: "Shop all products" },
};

export default async function ProdukPage() {
  const repo = await getRepo();
  const { locale, t } = await getT();
  const c = copy[locale];
  const [categories, products] = await Promise.all([repo.getCategories(), repo.getProducts()]);
  return (
    <>
      <section className="relative isolate overflow-hidden bg-ocean-950 text-white">
        <div className="grid-lines absolute inset-0 opacity-70" />
        <Crosshairs className="text-white/60" />
        <div className="container-x grid items-center gap-10 pb-10 pt-36 md:grid-cols-12 md:pb-16 md:pt-44">
          <div className="md:col-span-5">
            <p className="eyebrow">{c.eyebrow}</p>
            <h1 className="mt-4 text-[2rem] leading-[1.08] sm:text-5xl">{c.title}</h1>
            <p className="mt-5 text-[15.5px] leading-relaxed text-white/70">{c.sub}</p>
          </div>
          <div className="md:col-span-7"><FishDiagram labels={c.labels} /></div>
        </div>
        <div className="border-t border-white/10 bg-ocean-900/60 backdrop-blur">
          <div className="container-x flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {categories.map((cat) => <a key={cat.id} href={`#${cat.slug}`} className="flex-none rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-white/80 hover:bg-white/10 hover:text-white">{pick(locale, cat.name, cat.name_en)}</a>)}
            <Link href="/belanja/cari" className="ml-auto hidden flex-none items-center gap-2 rounded-full border border-white/20 px-3.5 py-1.5 text-[13px] text-white/70 hover:bg-white/10 sm:flex"><Search className="h-3.5 w-3.5" /> {c.searchPh}</Link>
          </div>
        </div>
      </section>

      <section className="container-x py-14">
        {categories.map((cat) => {
          const list = products.filter((p) => p.category_id === cat.id);
          if (!list.length) return null;
          return (
            <div key={cat.id} id={cat.slug} className="scroll-mt-28 border-b border-line py-10 first:pt-0">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><h2 className="text-2xl text-ocean-950">{pick(locale, cat.name, cat.name_en)}</h2><p className="mt-1 text-[14px] text-mute">{pick(locale, cat.description, cat.description_en)}</p></div>
                <Link href={`/belanja/kategori/${cat.slug}`} className="text-[13.5px] font-bold text-coral-600">{c.open} →</Link>
              </div>
              <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => {
                  const v = p.variants.filter((x) => !x.business_only)[0] ?? p.variants[0];
                  const price = v?.price_retail || v?.price_business || 0;
                  return (
                    <li key={p.id}>
                      <Link href={`/belanja/produk/${p.slug}`} className="group flex items-center gap-4">
                        <span className="h-20 w-20 flex-none overflow-hidden rounded-xl border border-line"><ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={p.name} /></span>
                        <span className="min-w-0">
                          <span className="block text-[15.5px] font-bold text-ocean-950 group-hover:text-coral-600">{locale === "en" && p.name_en ? p.name_en : p.name}</span>
                          <span className="block truncate text-[13px] text-mute">{locale === "en" ? p.name : p.name_en}{p.scientific_name && <i> · {p.scientific_name}</i>}</span>
                          <span className="mt-1 block text-[12.5px] text-ink/70">{p.variants.map((x) => pick(locale, x.label, x.label_en)).join(" · ")}{p.prep_options.length ? ` · ${p.prep_options.map((o) => pick(locale, o.label, o.label_en)).join(", ")}` : ""}</span>
                          <span className="mt-1 block text-[13px] font-bold text-ocean-950">{c.from} {rupiah(price)}<span className="font-medium text-mute">/{t.unit[v?.unit ?? "kg"]} {v?.business_only ? t.shop.businessOnly.toLowerCase() : c.retail}</span></span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        <div className="pt-10"><Link href="/belanja" className="btn-accent">{c.all} <ArrowRight className="h-4 w-4" /></Link></div>
      </section>
    </>
  );
}
