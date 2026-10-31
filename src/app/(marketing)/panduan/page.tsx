import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { guides } from "@/lib/content/guides";
import { getT } from "@/lib/i18n/server";
import { PageHero } from "@/components/site/Sections";
import { ImageSlot } from "@/components/site/Decor";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Panduan" };

export default async function PanduanPage() {
  const { locale } = await getT();
  const c = locale === "en"
    ? { eyebrow: "Guides", title: "Know your fish, store it properly, cost your kitchen.", sub: "Short, practical notes from the auction floor and the packing table. New guides every week.", read: "Read" }
    : { eyebrow: "Panduan", title: "Mengenal ikan, menyimpan dengan benar, menghitung biaya dapur.", sub: "Catatan singkat dan praktis dari lantai lelang dan meja packing. Panduan baru setiap minggu.", read: "Baca" };
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} sub={c.sub} icon="fillet" />
      <section className="container-x py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => (
            <Link key={g.slug} href={`/panduan/${g.slug}`} className="group card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-float">
              <ImageSlot alt={g[locale].title} icon={g.icon} className="aspect-[3/2]" />
              <div className="p-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-coral-500">{formatDate(g.date, "short", locale)} · {g.tag[locale]}</p>
                <h2 className="mt-2 text-[18px] leading-snug text-ocean-950">{g[locale].title}</h2>
                <p className="mt-2 line-clamp-2 text-[14px] text-mute">{g[locale].excerpt}</p>
                <p className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-coral-600">{c.read} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
