import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ImageSlot, Crosshairs } from "./Decor";

/** Reference pattern: eyebrow + heading on the left, body on the right. */
export function SplitHeading({ eyebrow, title, children, action, dark = false }: { eyebrow: string; title: string; children?: ReactNode; action?: { href: string; label: string }; dark?: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-6">
        <p className={`eyebrow ${dark ? "text-coral-500" : ""}`}>{eyebrow}</p>
        <h2 className={`mt-3 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.6rem] ${dark ? "text-white" : "text-ocean-950"}`}>{title}</h2>
      </div>
      <div className="flex flex-col justify-end gap-5 lg:col-span-6">
        {children && <div className={`text-[15.5px] leading-relaxed ${dark ? "text-white/70" : "text-mute"}`}>{children}</div>}
        {action && <Link href={action.href} className={`${dark ? "btn-light" : "btn-outline"} w-fit`}>{action.label} <ArrowRight className="h-4 w-4" /></Link>}
      </div>
    </div>
  );
}

/** Full-bleed dark page hero with an image slot. */
export function PageHero({ eyebrow, title, sub, icon = "fish", image, children }: { eyebrow: string; title: string; sub?: string; icon?: string; image?: string | null; children?: ReactNode }) {
  return (
    <section className="relative isolate text-white">
      <ImageSlot src={image} alt={title} icon={icon} className="absolute inset-0 -z-10">
        <div className="photo-fade absolute inset-0" />
      </ImageSlot>
      <Crosshairs className="text-white/60" />
      <div className="container-x pb-14 pt-40 md:pb-20 md:pt-52">
        <p className="eyebrow rise">{eyebrow}</p>
        <h1 className="rise rise-2 mt-4 max-w-3xl text-[2rem] leading-[1.08] sm:text-5xl lg:text-[3.4rem]">{title}</h1>
        {sub && <p className="rise rise-3 mt-5 max-w-2xl text-[17px] leading-relaxed text-white/75">{sub}</p>}
        {children && <div className="rise rise-3 mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function Band({ children, tone = "white", className = "" }: { children: ReactNode; tone?: "white" | "light" | "dark"; className?: string }) {
  const bg = tone === "dark" ? "bg-ocean-950 text-white" : tone === "light" ? "bg-sand-50" : "bg-white";
  return (
    <section className={`relative ${bg} ${className}`}>
      <Crosshairs className={tone === "dark" ? "text-white/50" : "text-ocean-950/40"} />
      <div className="container-x py-20 md:py-24">{children}</div>
    </section>
  );
}

export function FactStrip({ facts }: { facts: Array<{ value: string; label: string; sub?: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-5">
      {facts.map((f) => (
        <div key={f.label} className="border-l border-line pl-5">
          <p className="text-3xl font-bold tracking-tight text-tide-500 lg:text-[2.1rem]">{f.value}</p>
          <p className="mt-1 text-[14px] font-semibold text-ocean-950">{f.label}</p>
          {f.sub && <p className="text-xs text-mute">{f.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/** Dark photo "pillar" card, as on the reference site. */
export function PillarCard({ href, title, sub, icon, image }: { href: string; title: string; sub?: string; icon: string; image?: string | null }) {
  return (
    <Link href={href} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl text-white shadow-soft transition hover:-translate-y-1 hover:shadow-float">
      <ImageSlot src={image} alt={title} icon={icon} className="absolute inset-0">
        <div className="photo-fade absolute inset-0" />
      </ImageSlot>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <div><p className="text-[19px] font-semibold leading-tight">{title}</p>{sub && <p className="mt-1 text-[13px] text-white/65">{sub}</p>}</div>
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/15 transition group-hover:bg-coral-500"><ArrowRight className="h-4 w-4" /></span>
      </div>
    </Link>
  );
}
