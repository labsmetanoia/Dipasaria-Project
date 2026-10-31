import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { ShopTopBar, BottomTabs } from "@/components/shop/ShopShell";
import { CutoffBar } from "@/components/shop/CutoffBar";
import { CartToast } from "@/components/shop/CartToast";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const repo = await getRepo();
  const [settings, account] = await Promise.all([repo.getSettings(), getCurrentAccount()]);
  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      <div className="sticky top-0 z-40 shadow-soft">
        <ShopTopBar accountName={account?.business_name ?? null} demo={repo.mode === "memory"} />
        <CutoffBar cutoff={settings.cutoff_time} />
      </div>
      <main className="container-x flex-1 pb-32 pt-5 md:pb-16">{children}</main>
      <CartToast />
      <BottomTabs />
    </div>
  );
}
