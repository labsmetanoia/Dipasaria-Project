import { SiteFrame } from "@/components/site/SiteFrame";
export const dynamic = "force-dynamic";
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
