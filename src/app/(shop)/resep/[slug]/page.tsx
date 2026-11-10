import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Gauge, Users } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { segmentOf } from "@/lib/pricing";
import { getRecipe, recipes } from "@/lib/content/recipes";
import { recipeTotal, resolveRecipe } from "@/lib/content/recipe-items";
import { RecipeBundle } from "@/components/shop/RecipeBundle";
import { RecipeCard } from "@/components/site/RecipeCard";
import { Band, SectionHead } from "@/components/site/Sections";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = getRecipe(slug);
  return { title: r?.id.title ?? "Resep", description: r?.id.excerpt };
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = getRecipe(slug);
  if (!recipe) notFound();
  const repo = await getRepo();
  const [products, account, { locale }] = await Promise.all([repo.getProducts(), getCurrentAccount(), getT()]);
  const segment = segmentOf(account);
  const en = locale === "en";
  const c = recipe[locale];
  const items = resolveRecipe(recipe, products);
  const others = recipes.filter((r) => r.slug !== recipe.slug).slice(0, 3);
  return (
    <>
      <section className="bg-sand-100">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[300px] bg-ocean-950 lg:min-h-[560px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={recipe.image} alt={c.title} className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="px-5 py-10 sm:px-10 lg:px-14 lg:py-16">
            <Link href="/resep" className="btn-link"><ArrowLeft className="h-3.5 w-3.5" /> {en ? "All recipes" : "Semua resep"}</Link>
            <p className="eyebrow mt-6">{recipe.tag[locale]}</p>
            <h1 className="mt-2 text-[2.6rem] sm:text-[3.6rem]">{c.title}</h1>
            <p className="mt-4 max-w-xl font-sans text-[15px] leading-relaxed text-ink/80">{c.excerpt}</p>
            <dl className="mt-6 grid max-w-md grid-cols-3 gap-3">
              {[[Clock, en ? "Time" : "Waktu", `${recipe.minutes} ${en ? "min" : "menit"}`], [Users, en ? "Serves" : "Porsi", `${recipe.servings} ${en ? "people" : "orang"}`], [Gauge, en ? "Level" : "Tingkat", recipe.level[locale]]].map(([I, k, v]) => { const Icon = I as typeof Clock; return (
                <div key={k as string} className="border-l-2 border-ocean-950 pl-3"><dt className="flex items-center gap-1.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.16em] text-mute"><Icon className="h-3.5 w-3.5" />{k as string}</dt><dd className="mt-1 font-display text-[1.3rem] font-bold uppercase leading-none">{v as string}</dd></div>); })}
            </dl>
          </div>
        </div>
      </section>
      <section className="container-x grid gap-10 py-12 md:py-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="text-[2rem]">{en ? "Method" : "Cara memasak"}</h2>
          <ol className="mt-5 space-y-5">
            {c.steps.map((s, i) => (
              <li key={i} className="flex gap-4"><span className="flex h-9 w-9 flex-none items-center justify-center bg-ocean-950 font-display text-[18px] font-bold text-coral-500">{i + 1}</span><p className="pt-1.5 font-sans text-[15.5px] leading-relaxed text-ink/85">{s}</p></li>
            ))}
          </ol>
          <div className="mt-10 bg-sand-100 p-5">
            <p className="eyebrow">{en ? "From your own kitchen" : "Dari dapur Anda"}</p>
            <p className="mt-2 font-sans text-[14px] text-ink/80">{c.pantry.join(" · ")}</p>
          </div>
        </div>
        <div className="lg:col-span-5"><div className="lg:sticky lg:top-[120px]"><RecipeBundle items={items} baseServings={recipe.servings} title={c.title} segment={segment} account={account} /></div></div>
      </section>
      <Band tone="parchment">
        <SectionHead eyebrow={en ? "More recipes" : "Resep lain"} title={en ? "Cook something else this week" : "Masak menu lain minggu ini"} action={{ href: "/resep", label: en ? "All recipes" : "Semua resep" }} />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((r) => <RecipeCard key={r.slug} recipe={r} locale={locale} total={recipeTotal(resolveRecipe(r, products), segment, account)} />)}
        </div>
      </Band>
    </>
  );
}
