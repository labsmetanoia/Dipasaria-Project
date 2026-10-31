import { ProductIcon } from "@/components/Icons";

/** Corner crosshair marks, as on the reference site. */
export function Crosshairs({ className = "text-ocean-950" }: { className?: string }) {
  return (
    <>
      <span className={`crosshair left-6 top-6 ${className}`} aria-hidden />
      <span className={`crosshair bottom-6 right-6 ${className}`} aria-hidden />
    </>
  );
}

/**
 * Photography slot. Shows the photo when a URL is set, otherwise a designed illustrated
 * placeholder (deep navy, soft light, faint grid, species mark) that still looks intentional.
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
    <div className={`${pos} overflow-hidden ${tone === "dark" ? "hero-art text-tide-400" : "bg-tide-50 text-tide-600"} ${className}`} role="img" aria-label={alt}>
      <div className="grid-lines absolute inset-0" />
      <ProductIcon name={icon} className="absolute -bottom-[10%] -right-[6%] h-[80%] w-auto opacity-[0.16]" />
      {children}
    </div>
  );
}
