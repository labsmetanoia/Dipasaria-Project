import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getT } from "@/lib/i18n/server";

export default async function OfflinePage() {
  const { t } = await getT();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo stacked tagline className="h-40 w-auto" />
      <h1 className="mt-6 text-2xl text-ocean-950">{t.common.offline}</h1>
      <p className="mt-2 max-w-sm text-mute">{t.common.offlineBody}</p>
      <Link href="/belanja" className="btn-primary mt-6">{t.common.tryAgain}</Link>
    </main>
  );
}
