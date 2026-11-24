import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/dict";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppFloat } from "./WhatsAppFloat";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { CartToast } from "@/components/shop/CartToast";
import { JsonLd } from "@/components/JsonLd";
import { storeLd } from "@/lib/seo";
import { slimProducts } from "@/lib/catalogue";
import { TrackView } from "@/components/Track";

/** Shared chrome for every customer-facing page: header, cut-off strip, cart drawer, footer, WhatsApp. */
/**
 * `lite` is for the "page not found" screen. Next.js ships that screen's data inside every page (so it can show it
 * without a round trip); without the cart drawer it adds almost nothing to each page instead of a second catalogue.
 */
export async function SiteFrame({ children, lite = false }: { children: React.ReactNode; lite?: boolean }) {
 const repo = await getRepo();
 const [settings, categories, products, areas, account, { locale, t }] = await Promise.all([repo.getSettings(), repo.getCategories(), repo.getProducts(), repo.getAreas(), getCurrentAccount(), getT()]);
 return (
    <div className="flex min-h-screen flex-col">
      {repo.mode === "memory" && <div role="region" aria-label="Demo" className="bg-ocean-800 px-3 py-1 text-center font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/75">{t.common.demoBanner}</div>}
      <JsonLd data={storeLd(settings)} />
      <Header categories={categories} cutoff={settings.cutoff_time} accountName={account?.business_name ?? null} cartLink={lite} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} t={t} locale={locale} />
      {/* the drawer prices cart lines: it needs names, sizes, prices and stock, not the descriptive texts */}
      {!lite && <CartDrawer products={slimProducts(products)} settings={settings} areas={areas} account={account} />}
      {!lite && <CartToast />}
      {!lite && <TrackView event="visit" />}
      <WhatsAppFloat number={settings.whatsapp_number} text={fmt(t.common.chatDefault, { store: settings.store_name })} label={t.common.chatCta} />
    </div>
  );
}
