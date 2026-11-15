import Image from "next/image";

/** Local files and Supabase Storage photos go through the Next.js optimiser (resized AVIF/WebP per device). */
export function optimizable(src: string): boolean {
  return src.startsWith("/") || /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(src);
}

/**
 * A photo that fills its positioned parent. `sizes` tells the browser how wide it will be shown so it downloads
 * the right size; `priority` is for the first image on screen (hero), everything else loads lazily.
 */
export function Photo({ src, alt, sizes = "100vw", priority = false, className = "" }: { src: string; alt: string; sizes?: string; priority?: boolean; className?: string }) {
  if (optimizable(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={72} className={`object-cover ${className}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className={`absolute inset-0 h-full w-full object-cover ${className}`} />;
}
