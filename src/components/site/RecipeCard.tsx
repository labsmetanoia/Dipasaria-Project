import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";
import type { Recipe } from "@/lib/content/recipes";
import type { Locale } from "@/lib/i18n";
import { rupiah } from "@/lib/format";

export function RecipeCard({ recipe, locale, total }: { recipe: Recipe; locale: Locale; total: number }) {
  const en = locale === "en";
  const c = recipe[locale];
  return (
    <Link href={`/resep/${recipe.slug}`} className="group card flex flex-col overflow-hidden transition hover:shadow-float">
      <div className="relative aspect-[4/3] overflow-hidden bg-ocean-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={recipe.image} alt={c.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
        <span className="absolute left-3 top-3 bg-coral-500 px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ocean-950">{recipe.tag[locale]}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-4 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{recipe.minutes} {en ? "min" : "menit"}</span>
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{recipe.servings} {en ? "people" : "orang"}</span>
        </p>
        <h3 className="mt-2 text-[1.55rem] leading-none">{c.title}</h3>
        <p className="mt-2 line-clamp-2 font-sans text-[13.5px] text-mute">{c.excerpt}</p>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-mute">{en ? "Ingredients from" : "Bahan mulai"}</p>
            <p className="font-display text-[22px] font-bold leading-none">{rupiah(total)}</p>
          </div>
          <span className="btn-link">{en ? "Cook this" : "Masak ini"} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
        </div>
      </div>
    </Link>
  );
}
