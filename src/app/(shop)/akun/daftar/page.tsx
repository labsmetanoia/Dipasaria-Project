import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { BusinessApplyForm } from "@/components/shop/BusinessApplyForm";

export const metadata = { title: "Daftar akun bisnis" };

export default async function DaftarPage() {
  const [areas, { t }] = await Promise.all([(await getRepo()).getAreas(), getT()]);
  return <div className="mx-auto max-w-lg"><h1 className="text-2xl text-ocean-950">{t.account.registerTitle}</h1><p className="mt-1 text-sm text-mute">{t.account.registerSub}</p><div className="card mt-5 p-5"><BusinessApplyForm areas={areas} /></div></div>;
}
