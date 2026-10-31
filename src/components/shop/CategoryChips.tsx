import Link from "next/link";
import type { Category } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import { dict } from "@/lib/i18n/dict";

export function CategoryChips({ categories, active, locale = "id" }: { categories: Category[]; active?: string; locale?: Locale }) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
      <Link href="/belanja" className={`chip flex-none ${!active ? "chip-on" : ""}`}>{dict[locale].shop.all}</Link>
      {categories.map((c) => <Link key={c.id} href={`/belanja/kategori/${c.slug}`} className={`chip flex-none ${active === c.slug ? "chip-on" : ""}`}>{pick(locale, c.name, c.name_en)}</Link>)}
    </div>
  );
}
