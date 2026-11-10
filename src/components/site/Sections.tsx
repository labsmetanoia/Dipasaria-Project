import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ImageSlot, Sisik } from "./Decor";

/** Section header: eyebrow + big condensed heading, optional right-aligned action (reference pattern). */
export function SectionHead({ eyebrow, title, sub, action, dark = false, center = false }: { eyebrow?: string; title: string; sub?: string; action?: { href: string; label: string }; dark?: boolean; center?: boolean }) {
 return (
    <div className={`flex flex-wrap items-end justify-between gap-6 ${center ? "flex-col items-center text-center" : ""}`}>
      <div className="max-w-2xl">
        {eyebrow && <p className={`eyebrow ${dark ? "text-coral-500" : ""}`}>{eyebrow}</p>}
        <h2 className={`mt-2 text-[2.4rem] sm:text-[3.2rem] lg:text-[3.6rem] ${dark ? "text-white" : "text-ocean-950"}`}>{title}</h2>
        {sub && <p className={`mt-4 max-w-xl font-sans text-[14.5px] leading-relaxed ${dark ? "text-white/70" : "text-mute"}`}>{sub}</p>}
      </div>
      {action && <Link href={action.href} className={dark ? "btn-light" : "btn-outline"}>{action.label}</Link>}
    </div>
  );
}

/** Full-bleed dark page hero (interior pages). */
export function PageHero({ eyebrow, title, sub, icon = "fish", image, children, compact = false }: { eyebrow: string; title: string; sub?: string; icon?: string; image?: string | null; children?: ReactNode; compact?: boolean }) {
 return (
    <section className="relative isolate text-white">
      <ImageSlot src={image} alt={title} icon={icon} className="absolute inset-0 -z-10"><div className="photo-fade absolute inset-0" /><div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10" /></ImageSlot>
      <div className={`container-x ${compact ? "py-16 md:py-20" : "py-20 md:py-28"}`}>
        <p className="eyebrow rise text-coral-500">{eyebrow}</p>
        <h1 className="rise rise-2 mt-3 max-w-4xl text-[2.6rem] sm:text-[4rem] lg:text-[5rem]">{title}</h1>
        {sub && <p className="rise rise-3 mt-5 max-w-2xl font-sans text-[16px] leading-relaxed text-white/80">{sub}</p>}
        {children && <div className="rise rise-3 mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function Band({ children, tone = "white", className = "" }: { children: ReactNode; tone?: "white" | "cream" | "parchment" | "dark" | "gold"; className?: string }) {
 const bg = { white: "bg-white", cream: "bg-sand-50", parchment: "bg-sand-100", dark: "bg-ocean-950 text-white", gold: "bg-coral-500 text-ocean-950" }[tone];
 const pattern = tone === "dark" ? <Sisik opacity={0.09} /> : tone === "gold" ? <Sisik ink opacity={0.07} /> : null;
 return <section className={`relative overflow-hidden ${bg} ${className}`}>{pattern}<div className="container-x relative py-16 md:py-20">{children}</div></section>;
}

/** Gold "how it works" strip with four icon steps. */
export function StepsStrip({ title, steps }: { title: string; steps: Array<{ icon: ReactNode; text: string }> }) {
 return (
    <section className="relative overflow-hidden bg-coral-500 text-ocean-950">
      <Sisik ink opacity={0.07} />
      <div className="container-x relative py-10">
        <h2 className="text-center text-[2rem] sm:text-[2.6rem]">{title}</h2>
        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-ocean-950 text-coral-500">{s.icon}</span>
              <p className="font-sans text-[13px] font-semibold leading-snug">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Dark photo tile with uppercase label and small gold button (shop-by-category). */
export function CategoryTile({ href, title, image, icon, cta, count, countLabel }: { href: string; title: string; image?: string | null; icon: string; cta: string; count?: number; countLabel?: string }) {
 return (
    <Link href={href} className="group relative block aspect-square overflow-hidden bg-ocean-950 text-white">
      <ImageSlot src={image} alt={title} icon={icon} className="absolute inset-0 transition duration-700 group-hover:scale-[1.04]"><div className="photo-fade absolute inset-0" /></ImageSlot>
      {count !== undefined && <span className="absolute right-3 top-3 bg-black/45 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">{count} {countLabel}</span>}
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="font-display text-[1.7rem] font-bold uppercase leading-none sm:text-[2rem]">{title}</p>
        <span className="mt-3 inline-block bg-coral-500 px-3 py-1.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.16em] text-ocean-950 group-hover:bg-white">{cta}</span>
      </div>
    </Link>
  );
}

/** Dark "find your next order" card. */
export function DarkCard({ href, eyebrow, title, sub, cta, image, icon }: { href: string; eyebrow: string; title: string; sub: string; cta: string; image?: string | null; icon: string }) {
 return (
    <Link href={href} className="group relative block aspect-[4/3] overflow-hidden bg-ocean-950 text-white">
      <ImageSlot src={image} alt={title} icon={icon} className="absolute inset-0 transition duration-700 group-hover:scale-[1.04]"><div className="photo-fade absolute inset-0" /></ImageSlot>
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="eyebrow text-coral-500">{eyebrow}</p>
        <p className="mt-2 font-display text-[2rem] font-bold uppercase leading-none">{title}</p>
        <p className="mt-2 max-w-xs font-sans text-[12.5px] text-white/70">{sub}</p>
        <span className="mt-4 inline-flex items-center gap-2 bg-coral-500 px-3.5 py-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.16em] text-ocean-950">{cta} <ArrowRight className="h-3.5 w-3.5" /></span>
      </div>
    </Link>
  );
}
