"use client";
import { useState } from "react";
import { ProductArt } from "@/components/ProductArt";
import type { StorageClass } from "@/lib/types";

export function ProductGallery({ images, icon, storage, alt, badge }: { images: string[]; icon: string; storage: StorageClass; alt: string; badge?: string }) {
  const list = images.filter(Boolean);
  const [i, setI] = useState(0);
  const main = list[i] ?? null;
  return (
    <div className="flex h-full flex-col">
      <div className="relative aspect-square flex-1 overflow-hidden tile-bg lg:aspect-auto lg:min-h-[560px]">
        <div key={main ?? "none"} className="rise absolute inset-0"><ProductArt icon={icon} storage={storage} image={main} alt={alt} /></div>
        {badge && <span className="absolute left-5 top-5 bg-ocean-950 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-coral-500">{badge}</span>}
        {list.length > 1 && <span className="absolute bottom-4 right-4 bg-black/50 px-2.5 py-1 font-sans text-[11px] font-bold text-white">{i + 1} / {list.length}</span>}
      </div>
      {list.length > 1 && (
        <div className="grid grid-cols-4 gap-2 bg-white p-2">
          {list.map((src, k) => (
            <button key={src} onClick={() => setI(k)} className={`relative aspect-square overflow-hidden border-2 ${k === i ? "border-coral-500" : "border-transparent opacity-70 hover:opacity-100"}`} aria-label={`${alt} ${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
