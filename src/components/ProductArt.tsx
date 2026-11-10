import { ProductIcon } from "./Icons";
import type { StorageClass } from "@/lib/types";

const TINT: Record<StorageClass, string> = { chilled: "text-tide-600", frozen: "text-ocean-700", ambient: "text-tide-700" };

/** Product visual: the photo when image_url is set, otherwise a tonal illustrated mark on the pale tile background. */
export function ProductArt({ icon, storage, image, alt, className = "" }: { icon: string; storage: StorageClass; image?: string | null; alt: string; className?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={alt} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden tile-bg ${TINT[storage]} ${className}`} aria-label={alt} role="img">
      {/* Branded placeholder until the product's own photo arrives: "sisik" pattern + line icon */}
      <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(/brand/pattern-sisik-ink.svg)", backgroundSize: "44px 22px" }} />
      <div className="absolute h-[58%] w-[58%] rounded-full bg-sand-50/80 blur-2xl" />
      <ProductIcon name={icon} className="relative h-[42%] w-[42%] text-ocean-950" strokeWidth={1.4} />
    </div>
  );
}
