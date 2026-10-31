import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/dict";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppFloat } from "./WhatsAppFloat";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { CartToast } from "@/components/shop/CartToast";

/** Shared chrome for every customer-facing page: header, cut-off strip, cart drawer, footer, WhatsApp. */
export async function SiteFrame({ children }: { children: React.ReactNode }) {
 const repo = await getRepo();
 const [settings, categories, products, areas, account, { locale, t }] = await Promise.all([repo.getSettings(), repo.getCategories(), repo.getProducts(), repo.getAreas(), getCurrentAccount(), getT()]);
 return (
    <div className="flex min-h-screen flex-col">
      {repo.mode === "memory" && <div className="bg-ocean-800 px-3 py-1 text-center font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/60">{t.common.demoBanner}</div>}
      <Header categories={categories} cutoff={settings.cutoff_time} accountName={account?.business_name ?? null} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} t={t} locale={locale} />
      <CartDrawer products={products} settings={settings} areas={areas} account={account} />
      <CartToast />
      <WhatsAppFloat number={settings.whatsapp_number} text={fmt(t.common.chatDefault, { store: settings.store_name })} label={t.common.chatCta} />
    </div>
  );
}
