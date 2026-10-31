import { SiteFrame } from "@/components/site/SiteFrame";
export const dynamic = "force-dynamic";
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
