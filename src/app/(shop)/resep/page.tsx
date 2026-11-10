import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { segmentOf } from "@/lib/pricing";
import { recipes } from "@/lib/content/recipes";
import { recipeTotal, resolveRecipe } from "@/lib/content/recipe-items";
import { PageHero } from "@/components/site/Sections";
import { RecipeCard } from "@/components/site/RecipeCard";
import { IMAGES } from "@/lib/content/images";

export const metadata = { title: "Resep", description: "Resep seafood dan ayam dengan semua bahan dalam satu keranjang." };

export default async function ResepPage() {
  const repo = await getRepo();
  const [products, account, { locale }] = await Promise.all([repo.getProducts(), getCurrentAccount(), getT()]);
  const segment = segmentOf(account);
  const en = locale === "en";
  return (
    <>
      <PageHero
        eyebrow={en ? "Recipe bundles" : "Paket resep"}
        title={en ? "Pick a recipe. Every ingredient in one tap." : "Pilih resepnya. Semua bahan dalam satu sentuhan."}
        sub={en ? "Tested home and restaurant recipes, with the right cut, size and preparation already chosen. Adjust the servings and add everything to your cart." : "Resep rumahan dan restoran yang sudah kami uji, lengkap dengan potongan, ukuran, dan cara penyiapan yang tepat. Atur jumlah porsi, lalu masukkan semua bahan ke keranjang."}
        icon="fillet"
        image={IMAGES.kitchen}
      />
      <section className="container-x py-14 md:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => <RecipeCard key={r.slug} recipe={r} locale={locale} total={recipeTotal(resolveRecipe(r, products), segment, account)} />)}
        </div>
      </section>
    </>
  );
}
