import { ProductIcon } from "./Icons";
import type { StorageClass } from "@/lib/types";

const TINT: Record<StorageClass, { bg: string; fg: string }> = {
  chilled: { bg: "bg-tide-50", fg: "text-tide-600" },
  frozen: { bg: "bg-[#eaf1fb]", fg: "text-[#2f5f9e]" },
  ambient: { bg: "bg-sand-100", fg: "text-[#9a6b2f]" },
};

/** Product visual: real photo when image_url is set, otherwise a line icon tinted by storage class. */
export function ProductArt({ icon, storage, image, alt, className = "" }: { icon: string; storage: StorageClass; image?: string | null; alt: string; className?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={alt} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  const t = TINT[storage];
  return (
    <div className={`flex h-full w-full items-center justify-center ${t.bg} ${t.fg} ${className}`} aria-label={alt} role="img">
      <ProductIcon name={icon} className="h-[46%] w-[46%]" />
    </div>
  );
}
