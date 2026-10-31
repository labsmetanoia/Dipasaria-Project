"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageSlot, Crosshairs } from "./Decor";

export interface Slide { eyebrow: string; title: string; sub?: string; cta: { href: string; label: string }; cta2?: { href: string; label: string }; icon: string; image?: string | null }

export function HeroSlider({ slides, counter }: { slides: Slide[]; counter: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), 7000);
    return () => clearInterval(id);
  }, [slides.length]);
  const s = slides[i];
  return (
    <section className="relative isolate min-h-[88svh] text-white">
      {slides.map((sl, k) => (
        <ImageSlot key={k} src={sl.image} alt={sl.title} icon={sl.icon} className={`absolute inset-0 -z-10 transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`}>
          <div className="photo-fade absolute inset-0" />
        </ImageSlot>
      ))}
      <Crosshairs className="text-white/60" />
      <div className="container-x flex min-h-[88svh] flex-col justify-end pb-16 pt-36 md:pb-24">
        <div key={i} className="max-w-3xl">
          <p className="eyebrow rise">{s.eyebrow}</p>
          <h1 className="rise rise-2 mt-4 text-[2.2rem] leading-[1.06] sm:text-5xl lg:text-[3.6rem]">{s.title}</h1>
          {s.sub && <p className="rise rise-3 mt-5 max-w-xl text-[17px] leading-relaxed text-white/75">{s.sub}</p>}
          <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
            <Link href={s.cta.href} className="btn-accent px-6 py-3 text-[15px]">{s.cta.label} <ArrowRight className="h-4 w-4" /></Link>
            {s.cta2 && <Link href={s.cta2.href} className="btn px-6 py-3 text-[15px] text-white ring-1 ring-white/35 hover:bg-white/10">{s.cta2.label}</Link>}
          </div>
        </div>
        <div className="mt-12 flex items-center justify-between text-[12.5px] text-white/60">
          <span>{counter.replace("{i}", String(i + 1)).replace("{n}", String(slides.length))}</span>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">{slides.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} className={`h-1 rounded-full transition-all ${k === i ? "w-8 bg-coral-500" : "w-3 bg-white/40"}`} />)}</div>
            <button onClick={() => setI((i - 1 + slides.length) % slides.length)} className="rounded-full border border-white/25 p-1.5 hover:bg-white/10" aria-label="Previous"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setI((i + 1) % slides.length)} className="rounded-full border border-white/25 p-1.5 hover:bg-white/10" aria-label="Next"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
