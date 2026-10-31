import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getGuide, guides } from "@/lib/content/guides";
import { getT } from "@/lib/i18n/server";
import { PageHero } from "@/components/site/Sections";
import { formatDate } from "@/lib/format";

export async function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(slug);
  return { title: g?.id.title ?? "Panduan", description: g?.id.excerpt };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();
  const { locale } = await getT();
  const body = g[locale];
  const others = guides.filter((x) => x.slug !== g.slug).slice(0, 3);
  return (
    <>
      <PageHero eyebrow={`${g.tag[locale]} · ${formatDate(g.date, "long", locale)}`} title={body.title} sub={body.excerpt} icon={g.icon} />
      <article className="container-x py-16">
        <div className="mx-auto max-w-2xl">
          <Link href="/panduan" className="inline-flex items-center gap-1 text-[13.5px] font-bold text-coral-600"><ArrowLeft className="h-3.5 w-3.5" /> {locale === "en" ? "All guides" : "Semua panduan"}</Link>
          <div className="mt-8 space-y-6 text-[17px] leading-[1.75] text-ink/85">{body.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          <div className="mt-12 rounded-3xl bg-ocean-950 p-7 text-white">
            <p className="eyebrow">{locale === "en" ? "Shop" : "Belanja"}</p>
            <p className="mt-2 text-xl">{locale === "en" ? "Named, graded fish delivered cold tomorrow morning." : "Ikan bernama dan bergrade, diantar dingin besok pagi."}</p>
            <Link href="/belanja" className="btn-accent mt-5">{locale === "en" ? "See today's catch" : "Lihat tangkapan hari ini"} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <div className="mx-auto mt-16 max-w-4xl">
          <p className="eyebrow">{locale === "en" ? "More guides" : "Panduan lain"}</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {others.map((o) => <li key={o.slug}><Link href={`/panduan/${o.slug}`} className="card block p-5 hover:border-coral-500"><p className="text-[11px] font-bold uppercase tracking-wider text-coral-500">{o.tag[locale]}</p><p className="mt-2 text-[15px] font-semibold leading-snug text-ocean-950">{o[locale].title}</p></Link></li>)}
          </ul>
        </div>
      </article>
    </>
  );
}
