import { getRepo } from "@/lib/data";
import { AccountsAdmin } from "@/components/admin/AccountsAdmin";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const repo = await getRepo();
  const [accounts, slots, settings] = await Promise.all([repo.listAccounts(), repo.getSlots(), repo.getSettings()]);
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Pelanggan</p><h1 className="text-2xl text-ocean-900">Akun bisnis</h1><p className="text-sm text-mute">Setujui pendaftaran, tetapkan harga dan tempo, kirim kode akses via WhatsApp. Pelanggan rumah tangga tidak memerlukan akun; cari mereka dari halaman Pesanan.</p></div>
      <AccountsAdmin accounts={accounts} slots={slots} settings={settings} focusId={id} />
    </div>
  );
}
