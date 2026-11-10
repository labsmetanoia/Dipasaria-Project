import { getRepo } from "@/lib/data";
import { SettingsAdmin } from "@/components/admin/SettingsAdmin";

export default async function SettingsPage() {
  const repo = await getRepo();
  const [settings, areas, slots] = await Promise.all([repo.getSettings(), repo.getAreas({ includeInactive: true }), repo.getSlots({ includeInactive: true })]);
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Pengaturan</p><h1 className="text-2xl text-ocean-900">Toko, aturan pesanan & pengiriman</h1></div>
      <SettingsAdmin settings={settings} areas={areas} slots={slots} />
    </div>
  );
}
