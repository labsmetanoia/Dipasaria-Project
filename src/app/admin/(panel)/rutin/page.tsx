import { requireAdmin } from "@/lib/auth";
import { everyday } from "@/lib/campaigns";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getRepo } from "@/lib/data";
import { availableDates, unitPrice } from "@/lib/pricing";
import { addDays, formatDate, jamRange, nowJakarta, qtyUnit, rupiah, waLink } from "@/lib/format";
import { WEEKDAYS, isDue, upcomingDates } from "@/lib/standing";
import { StandingRunner } from "@/components/admin/StandingRunner";
import { StandingStatusToggle } from "@/components/admin/StandingStatusToggle";

export default async function StandingOrdersAdminPage() {
  await requireAdmin();
  const repo = await getRepo();
  const [list, accounts, products, slots, settings, runs, customers] = await Promise.all([repo.listStandingOrders(), repo.listAccounts(), repo.getProducts().then(everyday), repo.getSlots(), repo.getSettings(), repo.listStandingRuns({ limit: 30 }), repo.listCustomers(1000)]);
  // who a standing order belongs to: a restaurant, or a household with a weekly box
  const owner = (so: (typeof list)[number] | undefined) => {
    if (!so) return null;
    if (so.customer_id) { const c = customers.find((x) => x.id === so.customer_id); return { name: c?.name || (c ? `+${c.phone}` : "Rumah tangga"), contact: c?.name || "Bapak/Ibu", phone: c?.phone ?? null, href: "/admin/pelanggan", box: true }; }
    const a = accounts.find((x) => x.id === so.account_id);
    return { name: a?.business_name ?? so.account_id ?? "—", contact: a?.contact_name ?? "", phone: a?.phone ?? null, href: `/admin/pelanggan?id=${so.account_id}`, box: false };
  };
  const first = availableDates(settings, nowJakarta())[0];
  const due = list.filter((s) => isDue(s, first));
  const variant = (id: string) => { for (const p of products) { const v = p.variants.find((x) => x.id === id); if (v) return { p, v }; } return null; };
  const value = (so: (typeof list)[number]) => {
    const acc = accounts.find((a) => a.id === so.account_id) ?? null;
    return so.lines.reduce((s, l) => { const x = variant(l.variant_id); if (!x) return s; const prep = l.prep_option_id ? x.p.prep_options.find((o) => o.id === l.prep_option_id) : null; return s + Math.round((unitPrice(x.v, so.customer_id ? "retail" : "business", acc) + (prep?.surcharge ?? 0)) * l.qty); }, 0);
  };
  const perWeek = (so: (typeof list)[number]) => (value(so) * so.weekdays.length) / (so.every_weeks || 1);
  const weekly = list.filter((s) => s.status === "active").reduce((s, so) => s + perWeek(so), 0);
  const boxes = list.filter((s) => s.customer_id);
  const boxWeekly = boxes.filter((s) => s.status === "active").reduce((s, so) => s + perWeek(so), 0);
  const second = addDays(first, 1); // household boxes are prepared one evening earlier
  // How recent box orders ended (from the latest runs): paid, skipped by the customer, or cancelled unpaid.
  const boxIds = new Set(boxes.map((s) => s.id));
  const boxOrders = (await Promise.all(runs.filter((r) => boxIds.has(r.standing_order_id) && r.order_id).slice(0, 20).map((r) => repo.getOrder(r.order_id!)))).filter((o) => o !== null);
  const cancelNote = (o: (typeof boxOrders)[number]) => o.history.find((h) => h.status === "cancelled")?.note ?? "";
  const boxPaid = boxOrders.filter((o) => o.payment_status === "paid").length;
  const boxSkipped = boxOrders.filter((o) => o.status === "cancelled" && cancelNote(o).startsWith("Dilewati pelanggan")).length;
  const boxLapsed = boxOrders.filter((o) => o.status === "cancelled" && cancelNote(o).startsWith("Dibatalkan otomatis")).length;
  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Pendapatan berulang</p><h1 className="text-2xl text-ocean-900">Pesanan rutin dan kotak mingguan</h1><p className="text-sm text-mute">Pesanan berulang restoran dibuat otomatis untuk esok hari, dengan harga dan tempo akun masing-masing. Kotak mingguan rumah tangga dibuat satu malam lebih awal (untuk lusa), agar pelanggan punya waktu membayar sampai batas pemesanan esok harinya.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-mute">Aktif</p><p className="text-2xl font-bold">{list.filter((s) => s.status === "active").length}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Jatuh tempo {formatDate(first, "short")}</p><p className="text-2xl font-bold">{due.length}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Nilai rutin per minggu (perkiraan)</p><p className="text-2xl font-bold">{rupiah(weekly, { compact: true })}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Kotak mingguan rumah tangga</p><p className="text-2xl font-bold">{boxes.filter((s) => s.status === "active").length} <span className="text-sm font-normal text-mute">aktif · {rupiah(boxWeekly, { compact: true })}/minggu</span></p>{boxes.some((s) => s.paused_reason === "unpaid") && <p className="text-[11px] text-gold-ink">{boxes.filter((s) => s.paused_reason === "unpaid").length} dijeda karena tidak dibayar</p>}{boxes.filter((s) => isDue(s, second)).length > 0 && <p className="text-[11px] text-mute">{boxes.filter((s) => isDue(s, second)).length} dibuat malam ini untuk {formatDate(second, "short")}</p>}{boxOrders.length > 0 && <p className="text-[11px] text-mute">{boxOrders.length} kotak terakhir: {boxPaid} lunas · {boxSkipped} dilewati · {boxLapsed} tidak dibayar</p>}</div>
      </div>
      <StandingRunner defaultDate={first} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-sand-100 text-left text-xs text-mute"><tr><th className="px-4 py-2">Pelanggan</th><th className="px-4 py-2">Jadwal</th><th className="px-4 py-2">Produk</th><th className="px-4 py-2 text-right">Per kirim</th><th className="px-4 py-2">Berikutnya</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((so) => {
              const who = owner(so)!;
              const slot = slots.find((s) => s.id === so.slot_id);
              const next = upcomingDates(so, first, 6).find((d) => !so.skip_dates.includes(d));
              return (
                <tr key={so.id} className={so.status === "paused" ? "opacity-60" : ""}>
                  <td className="px-4 py-3"><Link href={who.href} className="font-semibold text-ocean-900">{who.name}</Link><p className="text-xs text-mute">{who.box ? "Kotak mingguan · " : ""}{so.name}</p>
                    {who.phone && <a className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold-ink" target="_blank" rel="noreferrer" href={waLink(who.phone, who.box
                      ? (so.paused_reason === "unpaid" ? `Halo ${who.contact}, kotak mingguan "${so.name}" kami jeda karena dua kotak terakhir belum dibayar. Bila masih ingin berlangganan, lanjutkan kapan saja di halaman Akun. Ada yang bisa kami bantu? Terima kasih.` : `Halo ${who.contact}, kotak mingguan "${so.name}" untuk ${next ? formatDate(next) : "pengiriman berikutnya"} kami siapkan dua malam sebelumnya. Balas pesan ini bila ada perubahan. Terima kasih.`)
                      : `Halo ${who.contact}, pesanan rutin "${so.name}" untuk ${next ? formatDate(next) : "pengiriman berikutnya"} akan kami proses pukul 19.45 WIB. Balas pesan ini bila ada perubahan. Terima kasih.`)}><MessageCircle className="h-3.5 w-3.5" />{so.paused_reason === "unpaid" ? "Tanya via WA" : "Pengingat WA"}</a>}</td>
                  <td className="px-4 py-3">{so.weekdays.map((d) => WEEKDAYS.id[d - 1]).join(" · ")}{so.every_weeks === 2 ? " · 2 minggu sekali" : ""}<p className="text-xs text-mute">{slot ? jamRange(slot.start_time, slot.end_time) : ""}</p></td>
                  <td className="px-4 py-3 text-xs">{so.lines.map((l) => { const x = variant(l.variant_id); return x ? `${x.p.name} ${qtyUnit(l.qty, x.v.unit)}` : l.variant_id; }).join(" · ")}</td>
                  <td className="px-4 py-3 text-right font-semibold">{rupiah(value(so))}</td>
                  <td className="px-4 py-3">{next ? formatDate(next, "short") : "—"}{so.skip_dates.length > 0 && <p className="text-xs text-mute">{so.skip_dates.length} dilewati</p>}</td>
                  <td className="px-4 py-3"><StandingStatusToggle id={so.id} status={so.status} />{so.paused_reason && <p className="mt-1 text-[11px] text-gold-ink">{so.paused_reason === "unpaid" ? "Dijeda otomatis: 2 kotak tidak dibayar" : "Dijeda: alamat dihapus"}</p>}</td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-mute">Belum ada pesanan rutin. Restoran dan rumah tangga membuatnya dari halaman Akun masing-masing.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card p-5">
        <p className="font-semibold text-ocean-900">Riwayat proses</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {runs.map((r) => { const so = list.find((s) => s.id === r.standing_order_id); const who = owner(so); const acc = who && who.phone ? { phone: who.phone, contact_name: who.contact } : null; return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{formatDate(r.delivery_date, "short")} · {who?.name ?? "—"}{who?.box ? " (kotak mingguan)" : ""}</span>{r.order_code ? <Link href={`/admin/pesanan?q=${r.order_code}`} className="font-semibold text-gold-ink">{r.order_code}</Link> : <span className="text-xs text-gold-ink">{r.error ?? "Sedang diproses"}</span>}
              {r.note && r.order_code && <span className="flex w-full flex-wrap items-center justify-between gap-2 bg-warn-50 px-2 py-1 text-xs text-warn-600"><span>Dikirim sebagian. {r.note}</span>{acc && <a className="inline-flex items-center gap-1 font-semibold" target="_blank" rel="noreferrer" href={waLink(acc.phone, `Halo ${acc.contact_name}, pesanan rutin untuk ${formatDate(r.delivery_date)} (${r.order_code}) sudah kami buat, tetapi ada produk yang tidak tersedia malam ini: ${r.note} Produk lainnya tetap dikirim sesuai jadwal. Balas pesan ini bila ingin diganti produk lain. Terima kasih.`)}><MessageCircle className="h-3.5 w-3.5" />Kabari via WA</a>}</span>}</li>); })}
          {runs.length === 0 && <li className="py-2 text-mute">Belum ada proses.</li>}
        </ul>
      </div>
    </div>
  );
}
