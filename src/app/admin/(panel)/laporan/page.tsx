import { getRepo } from "@/lib/data";
import { ReportView } from "@/components/admin/ReportView";
import { addDays, nowJakarta } from "@/lib/format";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = nowJakarta().date;
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : addDays(today, -13);
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : addDays(today, 1);
  const rows = await (await getRepo()).salesReport(from, to);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Laporan</p><h1 className="text-2xl text-ocean-900">Penjualan & margin</h1><p className="text-sm text-mute">Tiga angka yang menjalankan bisnis ini: margin kotor di atas 12%, susut di bawah 4%, kas tertagih dalam 7 hari.</p></div>
        <form className="flex items-end gap-2 text-sm">
          <label><span className="label">Dari</span><input type="date" name="from" defaultValue={from} className="input py-1.5" /></label>
          <label><span className="label">Sampai</span><input type="date" name="to" defaultValue={to} className="input py-1.5" /></label>
          <button className="btn-secondary py-1.5">Tampilkan</button>
        </form>
      </div>
      <ReportView rows={rows} from={from} to={to} />
    </div>
  );
}
