import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getRepo } from "@/lib/data";

// Corporate pages are cached and refreshed every 10 minutes so today's catch and prices stay current.
export const revalidate = 600;

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const settings = await (await getRepo()).getSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
    </div>
  );
}
