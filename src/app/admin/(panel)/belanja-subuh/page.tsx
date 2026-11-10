import { getRepo } from "@/lib/data";
import { pickDate } from "@/lib/ops";
import { DateSelector } from "@/components/admin/DateSelector";
import { PrintButton } from "@/components/admin/PrintButton";
import { CheckRow } from "@/components/admin/Checklist";
import { Empty } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { STORAGE_LABEL, UNIT_LABEL } from "@/lib/config";
import type { StorageClass } from "@/lib/types";

const GROUPS: Array<{ key: StorageClass; title: string; hint: string }> = [
  { key: "chilled", title: "Lelang Muara Baru dan ikan segar", hint: "Beli sesuai daftar ditambah cadangan; periksa mata, insang, aroma, dan suhu inti ≤4 °C; foto per lot." },
  { key: "frozen", title: "Ambil dari freezer", hint: "FEFO: ambil kedaluwarsa terdekat; kantong terinsulasi terpisah." },
  { key: "ambient", title: "Rak suhu ruang", hint: "Telur dan bumbu dikemas dalam wadah terpisah." },
];

export default async function BuyingListPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: dp } = await searchParams;
  const date = pickDate(dp);
  const repo = await getRepo();
  const [lines, settings] = await Promise.all([repo.buyingList(date), repo.getSettings()]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">Belanja subuh</p><h1 className="text-2xl text-ocean-900">Daftar belanja · {formatDate(date, "weekday")}</h1><p className="text-xs text-mute">Cadangan ikan segar {settings.catch_weight_buffer_pct}% untuk memilih ekor yang pas dan susut pembersihan.</p></div>
        <div className="flex gap-2"><DateSelector date={date} /><PrintButton /></div>
      </div>
      {lines.length === 0 ? <Empty title="Belum ada pesanan untuk tanggal ini" /> : GROUPS.map((g) => {
        const rows = lines.filter((l) => l.storage_class === g.key);
        if (!rows.length) return null;
        return (
          <section key={g.key} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-sand-100 px-4 py-2.5"><h2 className="text-ocean-900">{g.title} <span className="ml-1 text-xs font-normal text-mute">{STORAGE_LABEL[g.key]}</span></h2><span className="text-xs text-mute">{rows.length} baris</span></div>
            <p className="px-4 pt-2 text-xs text-mute">{g.hint}</p>
            <div className="divide-y divide-line">
              {rows.map((l) => (
                <CheckRow key={`${l.product_id}-${l.variant_label}`} id={`${l.product_id}-${l.variant_label}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div><p className="font-semibold">{l.product_name} <span className="font-normal text-mute">{l.variant_label}</span></p>{l.scientific_name && <p className="text-xs italic text-mute">{l.scientific_name}</p>}</div>
                    <p className="font-display text-xl font-semibold text-ocean-900">{l.qty_with_buffer} <span className="text-sm font-normal text-mute">{UNIT_LABEL[l.unit]}</span>{l.qty_with_buffer !== l.qty && <span className="ml-2 text-xs font-normal text-mute">(dipesan {l.qty}, {l.order_count} pesanan)</span>}</p>
                  </div>
                  {l.prep_notes.length > 0 && <ul className="mt-1 space-y-0.5 text-xs text-warn-600">{l.prep_notes.map((n, i) => <li key={i}>✂ {n}</li>)}</ul>}
                </CheckRow>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
