import { ProductIcon } from "./Icons";
import type { StorageClass } from "@/lib/types";

const TINT: Record<StorageClass, string> = {
  chilled: "from-[#dcecf5] via-[#eaf4f9] to-white text-tide-600",
  frozen: "from-[#dfe8f4] via-[#edf2f9] to-white text-[#3a6ea8]",
  ambient: "from-[#f3e9d8] via-[#f8f1e6] to-white text-[#9a6b2f]",
};

/** Product visual: the photo when image_url is set, otherwise a tinted illustrated mark. */
export function ProductArt({ icon, storage, image, alt, className = "" }: { icon: string; storage: StorageClass; image?: string | null; alt: string; className?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={alt} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${TINT[storage]} ${className}`} aria-label={alt} role="img">
      <div className="absolute inset-0 opacity-40 grid-lines" style={{ backgroundSize: "28px 28px" }} />
      <div className="absolute h-[62%] w-[62%] rounded-full bg-white/60 blur-2xl" />
      <ProductIcon name={icon} className="relative h-[48%] w-[48%] drop-shadow-[0_8px_12px_rgba(1,22,36,0.12)]" strokeWidth={1.8} />
    </div>
  );
}
