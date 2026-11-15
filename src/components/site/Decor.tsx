import { ProductIcon } from "@/components/Icons";
import { Photo } from "@/components/Photo";

/**
 * Photography slot. Shows the photo when a URL is set, otherwise a designed placeholder
 * (near-black with warm light, faint grid and a species mark) that still looks intentional.
 */
export function ImageSlot({ src, alt, icon = "fish", className = "", tone = "dark", children, sizes = "100vw", priority = false }: { src?: string | null; alt: string; icon?: string; className?: string; tone?: "dark" | "light"; children?: React.ReactNode; sizes?: string; priority?: boolean }) {
 const pos = /\babsolute\b|\bfixed\b/.test(className) ? "" : "relative";
 if (src) {
 return (
      <div className={`${pos} overflow-hidden ${className}`}>
        <Photo src={src} alt={alt} sizes={sizes} priority={priority} />
        {children}
      </div>
    );
  }
 return (
    <div className={`${pos} overflow-hidden ${tone === "dark" ? "hero-art text-coral-500" : "tile-bg text-tide-600"} ${className}`} role="img" aria-label={alt}>
      {tone === "dark" && <div className="grid-lines absolute inset-0" />}
      <ProductIcon name={icon} className="absolute -bottom-[8%] -right-[4%] h-[78%] w-auto opacity-[0.14]" />
      {children}
    </div>
  );
}

/** Big outline marquee text band, as on the reference product page. */
export function MarqueeBand({ text }: { text: string }) {
 const row = Array(6).fill(text).join("  • ");
 return (
    <div className="overflow-hidden border-y border-line bg-white py-4">
      <div className="marquee flex whitespace-nowrap font-display text-[64px] font-extrabold uppercase leading-none outline-text sm:text-[96px]">
        <span className="pr-8">{row}</span><span className="pr-8">{row}</span>
      </div>
    </div>
  );
}

/**
 * "Sisik" — the brand pattern of overlapping scales, read both as fish scales and as waves.
 * Place inside a `relative overflow-hidden` dark (or gold) surface. Purely decorative.
 */
export function Sisik({ className = "", opacity = 0.14, size = 56, ink = false }: { className?: string; opacity?: number; size?: number; ink?: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ backgroundImage: `url(/brand/pattern-sisik${ink ? "-ink" : ""}.svg)`, backgroundSize: `${size}px ${size / 2}px`, opacity }}
    />
  );
}
