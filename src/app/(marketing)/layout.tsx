import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/dict";

// Pages read the language cookie, so they render per request; data calls are cheap.
export const dynamic = "force-dynamic";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [settings, { locale, t }] = await Promise.all([(await getRepo()).getSettings(), getT()]);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} t={t} locale={locale} />
      <WhatsAppFloat number={settings.whatsapp_number} text={fmt(t.common.chatDefault, { store: settings.store_name })} label={t.common.chatCta} />
    </div>
  );
}
