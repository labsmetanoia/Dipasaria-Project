import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { AccountsAdmin } from "@/components/admin/AccountsAdmin";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdmin();
  const { id } = await searchParams;
  const repo = await getRepo();
  const [accounts, slots, settings, customers] = await Promise.all([repo.listAccounts(), repo.getSlots(), repo.getSettings(), repo.listCustomers(200)]);
  const optIn = customers.filter((c) => c.marketing_opt_in).length;
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Pelanggan</p><h1 className="text-2xl text-ocean-900">Akun bisnis</h1><p className="text-sm text-mute">Setujui pendaftaran, tetapkan harga dan tempo, kirim kode akses melalui WhatsApp.</p></div>
      <AccountsAdmin accounts={accounts} slots={slots} settings={settings} focusId={id} />
      <div className="card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-xl text-ocean-900">Pelanggan rumah tangga</h2><p className="text-xs text-mute">{customers.length} akun · {optIn} setuju menerima info & penawaran di WhatsApp</p></div>
        <p className="mt-1 text-sm text-mute">Akun dibuat sendiri oleh pelanggan dengan kode WhatsApp. Pesanan tamu tetap bisa dibuat tanpa akun.</p>
        {customers.length === 0 ? <p className="mt-3 text-sm text-mute">Belum ada akun rumah tangga.</p> : (
          <div className="mt-3 overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-mute"><th className="py-1.5 pr-3">Nama</th><th className="pr-3">WhatsApp</th><th className="pr-3">Terdaftar</th><th className="pr-3">Terakhir masuk</th><th>Info & penawaran</th></tr></thead>
            <tbody className="divide-y divide-line">{customers.map((c) => (
              <tr key={c.id}><td className="py-2 pr-3">{c.name || "—"}</td><td className="pr-3"><Link className="text-gold-ink" href={`/admin/pesanan?all=1&q=${c.phone}`}>+{c.phone}</Link></td><td className="pr-3">{formatDateTime(c.created_at)}</td><td className="pr-3">{c.last_login_at ? formatDateTime(c.last_login_at) : "—"}</td><td>{c.marketing_opt_in ? "Ya" : "Tidak"}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
