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
      <div className="absolute h-[58%] w-[58%] rounded-full bg-white/70 blur-2xl" />
      <ProductIcon name={icon} className="relative h-[46%] w-[46%] opacity-90 drop-shadow-[0_10px_14px_rgba(0,0,0,0.12)]" strokeWidth={1.7} />
    </div>
  );
}
