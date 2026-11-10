"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageSlot } from "./Decor";
import { Seal } from "@/components/Logo";
import { useT } from "@/lib/i18n/client";
import { nobreak } from "@/lib/format";

export interface Slide { eyebrow: string; title: string; sub?: string; cta: { href: string; label: string }; cta2?: { href: string; label: string }; icon: string; image?: string | null }

export function HeroSlider({ slides }: { slides: Slide[] }) {
 const [i, setI] = useState(0);
 const { locale } = useT();
 const en = locale === "en";
 useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % slides.length), 7000); return () => clearInterval(id); }, [slides.length]);
 const s = slides[i];
 return (
    <section className="relative isolate flex min-h-[clamp(560px,84svh,880px)] text-white" aria-roledescription="carousel">
      {slides.map((sl, k) => (
        <ImageSlot key={k} src={sl.image} alt={sl.title} icon={sl.icon} className={`absolute inset-0 -z-10 transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`}><div className="photo-fade absolute inset-0" /><div className="hero-scrim absolute inset-0" /></ImageSlot>
      ))}
      <Seal className="absolute bottom-20 right-[5%] hidden h-32 w-32 rotate-[-8deg] drop-shadow-[0_8px_24px_rgba(0,0,0,.45)] xl:block 2xl:h-36 2xl:w-36" />
      <div className="container-x flex w-full flex-col justify-end pb-16 pt-20 md:pb-20">
        <div key={i} className="max-w-[min(62rem,100%)]">
          <p className="rise flex items-center gap-3 font-sans text-[11.5px] font-bold uppercase tracking-[0.24em] text-coral-500"><span className="h-px w-10 bg-coral-500" />{s.eyebrow}</p>
          <h1 className="hero-title rise rise-2 mt-5">{s.title.split(/(?<=\.)\s+/).map((line, j) => <span key={j} className="block">{line}</span>)}</h1>
          {s.sub && <p className="rise rise-3 mt-5 max-w-xl font-sans text-[15px] leading-relaxed text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,.5)] sm:text-[16.5px]">{nobreak(s.sub)}</p>}
          <div className="rise rise-3 mt-7 flex flex-wrap gap-3">
            <Link href={s.cta.href} className="btn-accent">{s.cta.label}</Link>
            {s.cta2 && <Link href={s.cta2.href} className="btn border border-white/60 text-white hover:bg-white hover:text-ocean-950">{s.cta2.label}</Link>}
          </div>
        </div>
      </div>
      <button onClick={() => setI((i - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-black/30 text-white hover:bg-coral-500 hover:text-ocean-950 md:flex" aria-label={en ? "Previous" : "Sebelumnya"}><ChevronLeft className="h-5 w-5" /></button>
      <button onClick={() => setI((i + 1) % slides.length)} className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-black/30 text-white hover:bg-coral-500 hover:text-ocean-950 md:flex" aria-label={en ? "Next" : "Berikutnya"}><ChevronRight className="h-5 w-5" /></button>
      <div className="container-x absolute inset-x-0 bottom-6 flex gap-2">{slides.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`${en ? "Slide" : "Tampilan"} ${k + 1}`} aria-current={k === i} className="group py-2"><span className={`block h-[3px] w-10 transition ${k === i ? "bg-coral-500" : "bg-white/35 group-hover:bg-white/70"}`} /></button>)}</div>
    </section>
  );
}
