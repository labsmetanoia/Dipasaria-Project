import { getRepo } from "@/lib/data";
import { PromosAdmin } from "@/components/admin/PromosAdmin";

export default async function PromoPage() {
  const promos = await (await getRepo()).listPromos();
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Pemasaran</p><h1 className="text-2xl font-semibold text-ocean-900">Kode promo</h1><p className="text-sm text-mute">Jangan bersaing dengan diskon: keunggulan kita adalah ukuran yang jelas, label yang jujur dan keandalan. Gunakan promo hanya untuk pesanan pertama dan batas gratis ongkos kirim.</p></div>
      <PromosAdmin promos={promos} />
    </div>
  );
}
