import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { SiteFrame } from "@/components/site/SiteFrame";
import { Emblem } from "@/components/Logo";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Halaman tidak ditemukan" };

export default async function NotFound() {
  const { locale } = await getT();
  const en = locale === "en";
  return (
    <SiteFrame>
      <section className="container-x flex flex-col items-center py-20 text-center md:py-28">
        <Emblem className="h-28 w-28" />
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-2 max-w-2xl text-[2.6rem] sm:text-[3.4rem]">{en ? "This page swam away." : "Halaman ini sudah berenang pergi."}</h1>
        <p className="mt-4 max-w-md font-sans text-[15px] text-mute">{en ? "The link may be old or mistyped. Today's catch is still waiting for you." : "Tautannya mungkin sudah lama atau salah ketik. Tangkapan hari ini masih menunggu Anda."}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/belanja" className="btn-accent">{en ? "Shop today's catch" : "Belanja tangkapan hari ini"} <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/belanja/cari" className="btn-outline"><Search className="h-4 w-4" /> {en ? "Search products" : "Cari produk"}</Link>
        </div>
      </section>
    </SiteFrame>
  );
}
