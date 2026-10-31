import Link from "next/link";
import type { Category } from "@/lib/types";

export function CategoryChips({ categories, active }: { categories: Category[]; active?: string }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
      <Link href="/belanja" className={`chip flex-none ${!active ? "chip-on" : ""}`}>Semua</Link>
      {categories.map((c) => (
        <Link key={c.id} href={`/belanja/kategori/${c.slug}`} className={`chip flex-none ${active === c.slug ? "chip-on" : ""}`}>{c.name}</Link>
      ))}
    </div>
  );
}
