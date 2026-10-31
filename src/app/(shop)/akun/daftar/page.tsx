import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { BusinessApplyForm } from "@/components/shop/BusinessApplyForm";

export const metadata = { title: "Daftar akun bisnis" };

export default async function DaftarPage() {
  const [areas, { t }] = await Promise.all([(await getRepo()).getAreas(), getT()]);
  return <div className="container-x max-w-lg py-10 md:py-16"><h1 className="text-[2.6rem]">{t.account.registerTitle}</h1><p className="mt-1 font-sans text-sm text-mute">{t.account.registerSub}</p><div className="card mt-5 p-5"><BusinessApplyForm areas={areas} /></div></div>;
}
