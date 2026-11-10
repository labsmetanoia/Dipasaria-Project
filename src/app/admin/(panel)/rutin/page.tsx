import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getRepo } from "@/lib/data";
import { availableDates, unitPrice } from "@/lib/pricing";
import { formatDate, jamRange, nowJakarta, qtyUnit, rupiah, waLink } from "@/lib/format";
import { WEEKDAYS, isDue, upcomingDates } from "@/lib/standing";
import { StandingRunner } from "@/components/admin/StandingRunner";
import { StandingStatusToggle } from "@/components/admin/StandingStatusToggle";

export default async function StandingOrdersAdminPage() {
  const repo = await getRepo();
  const [list, accounts, products, slots, settings, runs] = await Promise.all([repo.listStandingOrders(), repo.listAccounts(), repo.getProducts(), repo.getSlots(), repo.getSettings(), repo.listStandingRuns({ limit: 20 })]);
  const first = availableDates(settings, nowJakarta())[0];
  const due = list.filter((s) => isDue(s, first));
  const variant = (id: string) => { for (const p of products) { const v = p.variants.find((x) => x.id === id); if (v) return { p, v }; } return null; };
  const value = (so: (typeof list)[number]) => {
    const acc = accounts.find((a) => a.id === so.account_id) ?? null;
    return so.lines.reduce((s, l) => { const x = variant(l.variant_id); if (!x) return s; const prep = l.prep_option_id ? x.p.prep_options.find((o) => o.id === l.prep_option_id) : null; return s + Math.round((unitPrice(x.v, "business", acc) + (prep?.surcharge ?? 0)) * l.qty); }, 0);
  };
  const weekly = list.filter((s) => s.status === "active").reduce((s, so) => s + value(so) * so.weekdays.length, 0);
  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Pelanggan bisnis</p><h1 className="text-2xl text-ocean-900">Pesanan rutin</h1><p className="text-sm text-mute">Pesanan berulang restoran: dibuat otomatis untuk esok hari, dengan harga dan tempo akun masing-masing.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs text-mute">Aktif</p><p className="text-2xl font-bold">{list.filter((s) => s.status === "active").length}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Jatuh tempo {formatDate(first, "short")}</p><p className="text-2xl font-bold">{due.length}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Nilai rutin per minggu (perkiraan)</p><p className="text-2xl font-bold">{rupiah(weekly, { compact: true })}</p></div>
      </div>
      <StandingRunner defaultDate={first} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-sand-100 text-left text-xs text-mute"><tr><th className="px-4 py-2">Pelanggan</th><th className="px-4 py-2">Jadwal</th><th className="px-4 py-2">Produk</th><th className="px-4 py-2 text-right">Per kirim</th><th className="px-4 py-2">Berikutnya</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((so) => {
              const acc = accounts.find((a) => a.id === so.account_id);
              const slot = slots.find((s) => s.id === so.slot_id);
              const next = upcomingDates(so, first, 6).find((d) => !so.skip_dates.includes(d));
              return (
                <tr key={so.id} className={so.status === "paused" ? "opacity-60" : ""}>
                  <td className="px-4 py-3"><Link href={`/admin/pelanggan?id=${so.account_id}`} className="font-semibold text-ocean-900">{acc?.business_name ?? so.account_id}</Link><p className="text-xs text-mute">{so.name}</p>
                    {acc && <a className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold-ink" target="_blank" rel="noreferrer" href={waLink(acc.phone, `Halo ${acc.contact_name}, pesanan rutin "${so.name}" untuk ${next ? formatDate(next) : "pengiriman berikutnya"} akan kami proses pukul 19.45 WIB. Balas pesan ini bila ada perubahan. Terima kasih.`)}><MessageCircle className="h-3.5 w-3.5" />Pengingat WA</a>}</td>
                  <td className="px-4 py-3">{so.weekdays.map((d) => WEEKDAYS.id[d - 1]).join(" · ")}<p className="text-xs text-mute">{slot ? jamRange(slot.start_time, slot.end_time) : ""}</p></td>
                  <td className="px-4 py-3 text-xs">{so.lines.map((l) => { const x = variant(l.variant_id); return x ? `${x.p.name} ${qtyUnit(l.qty, x.v.unit)}` : l.variant_id; }).join(" · ")}</td>
                  <td className="px-4 py-3 text-right font-semibold">{rupiah(value(so))}</td>
                  <td className="px-4 py-3">{next ? formatDate(next, "short") : "—"}{so.skip_dates.length > 0 && <p className="text-xs text-mute">{so.skip_dates.length} dilewati</p>}</td>
                  <td className="px-4 py-3"><StandingStatusToggle id={so.id} status={so.status} /></td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-mute">Belum ada pesanan rutin. Pelanggan bisnis membuatnya dari halaman Akun bisnis.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card p-5">
        <p className="font-semibold text-ocean-900">Riwayat proses</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {runs.map((r) => { const so = list.find((s) => s.id === r.standing_order_id); const acc = accounts.find((a) => a.id === so?.account_id); return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{formatDate(r.delivery_date, "short")} · {acc?.business_name ?? "—"}</span>{r.order_code ? <Link href={`/admin/pesanan?q=${r.order_code}`} className="font-semibold text-gold-ink">{r.order_code}</Link> : <span className="text-xs text-gold-ink">{r.error ?? "Sedang diproses"}</span>}</li>); })}
          {runs.length === 0 && <li className="py-2 text-mute">Belum ada proses.</li>}
        </ul>
      </div>
    </div>
  );
}
