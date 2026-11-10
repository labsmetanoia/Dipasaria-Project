"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageSlot } from "./Decor";

export interface Slide { eyebrow: string; title: string; sub?: string; cta: { href: string; label: string }; cta2?: { href: string; label: string }; icon: string; image?: string | null }

export function HeroSlider({ slides }: { slides: Slide[] }) {
 const [i, setI] = useState(0);
 useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % slides.length), 7000); return () => clearInterval(id); }, [slides.length]);
 const s = slides[i];
 return (
    <section className="relative isolate h-[72svh] min-h-[480px] max-h-[760px] text-white">
      {slides.map((sl, k) => (
        <ImageSlot key={k} src={sl.image} alt={sl.title} icon={sl.icon} className={`absolute inset-0 -z-10 transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`}><div className="photo-fade absolute inset-0" /><div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" /></ImageSlot>
      ))}
      <div className="container-x flex h-full flex-col justify-end pb-14 md:pb-20">
        <div key={i} className="max-w-3xl">
          <p className="eyebrow rise text-coral-500">{s.eyebrow}</p>
          <h1 className="rise rise-2 mt-3 text-[2.8rem] sm:text-[4.4rem] lg:text-[5.6rem]">{s.title.split(/(?<=\.)\s+/).map((line, j) => <span key={j} className="block">{line}</span>)}</h1>
          {s.sub && <p className="rise rise-3 mt-4 max-w-xl font-sans text-[15px] leading-relaxed text-white/80 sm:text-[16px]">{s.sub}</p>}
          <div className="rise rise-3 mt-7 flex flex-wrap gap-3">
            <Link href={s.cta.href} className="btn-accent">{s.cta.label}</Link>
            {s.cta2 && <Link href={s.cta2.href} className="btn border border-white/60 text-white hover:bg-white hover:text-ocean-950">{s.cta2.label}</Link>}
          </div>
        </div>
      </div>
      <button onClick={() => setI((i - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-black/30 text-white hover:bg-coral-500 hover:text-ocean-950 md:flex" aria-label="Previous"><ChevronLeft className="h-5 w-5" /></button>
      <button onClick={() => setI((i + 1) % slides.length)} className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-black/30 text-white hover:bg-coral-500 hover:text-ocean-950 md:flex" aria-label="Next"><ChevronRight className="h-5 w-5" /></button>
      <div className="absolute bottom-5 right-6 flex gap-2">{slides.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} className={`h-2.5 w-2.5 rounded-full border border-white/60 ${k === i ? "bg-coral-500" : "bg-white/20"}`} />)}</div>
    </section>
  );
}
