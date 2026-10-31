import { ProductIcon } from "@/components/Icons";

/**
 * Photography slot. Shows the photo when a URL is set, otherwise a designed placeholder
 * (near-black with warm light, faint grid and a species mark) that still looks intentional.
 */
export function ImageSlot({ src, alt, icon = "fish", className = "", tone = "dark", children }: { src?: string | null; alt: string; icon?: string; className?: string; tone?: "dark" | "light"; children?: React.ReactNode }) {
 const pos = /\babsolute\b|\bfixed\b/.test(className) ? "" : "relative";
 if (src) {
 return (
      <div className={`${pos} overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
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
