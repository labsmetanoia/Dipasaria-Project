import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { nowJakarta, rupiah } from "@/lib/format";
import { BUCKETS, buildLedger, termsBlock, type Ledger } from "@/lib/receivables";
import type { BusinessAccount } from "@/lib/types";

export const metadata = { title: "Piutang" };
export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  await requireAdmin();
  const repo = await getRepo();
  const today = nowJakarta().date;
  const [accounts, data, settings] = await Promise.all([repo.listAccounts(), repo.listReceivables(), repo.getSettings()]);
  const rows: Array<{ a: BusinessAccount; l: Ledger; blocked: string | null }> = accounts
    .filter((a) => a.status === "approved" && (a.payment_terms !== "prepaid" || data.orders.some((o) => o.account_id === a.id) || data.payments.some((p) => p.account_id === a.id)))
    .map((a) => { const l = buildLedger(a, data.orders, data.payments, data.allocations, today); return { a, l, blocked: a.payment_terms === "prepaid" ? null : termsBlock(l, a, settings, 0, today) }; })
    .sort((x, y) => y.l.overdue - x.l.overdue || y.l.balance - x.l.balance);
  const sum = (f: (l: Ledger) => number) => rows.reduce((s, r) => s + f(r.l), 0);
  const total = sum((l) => l.outstanding);
  const overdue = sum((l) => l.overdue);
  const credit = sum((l) => l.credit);
  const received = sum((l) => l.received_30d);
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Piutang restoran</p>
        <h1 className="text-2xl text-ocean-900">Tagihan tempo</h1>
        <p className="text-sm text-mute">Siapa berutang berapa, sejak kapan. Catat setiap transfer di halaman restoran: pembayaran dicocokkan ke tagihan paling lama lebih dulu.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-mute">Total piutang</p><p className="text-2xl font-bold">{rupiah(total)}</p><p className="text-[11px] text-mute">termasuk pesanan yang belum dikirim</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Lewat jatuh tempo</p><p className={`text-2xl font-bold ${overdue ? "text-gold-ink" : ""}`}>{rupiah(overdue)}</p><p className="text-[11px] text-mute">{rows.filter((r) => r.l.overdue > 0).length} restoran</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Diterima 30 hari</p><p className="text-2xl font-bold">{rupiah(received)}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Saldo kredit restoran</p><p className="text-2xl font-bold">{rupiah(credit)}</p><p className="text-[11px] text-mute">kelebihan bayar, dipakai otomatis</p></div>
      </div>

      <section className="card overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-sand-50 text-left text-xs text-mute">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Restoran</th>
              {BUCKETS.map(([k, label]) => <th key={k} className="px-3 py-2.5 text-right font-semibold">{label}</th>)}
              <th className="px-3 py-2.5 text-right font-semibold">Belum dikirim</th>
              <th className="px-3 py-2.5 text-right font-semibold">Sisa tagihan</th>
              <th className="px-4 py-2.5 text-right font-semibold">Batas kredit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, l, blocked }) => (
              <tr key={a.id} className="border-t border-line align-top">
                <td className="px-4 py-3">
                  <Link href={`/admin/piutang/${a.id}`} className="font-semibold text-ocean-900">{a.business_name}</Link>
                  <p className="text-xs text-mute">{a.payment_terms === "days3" ? "Tempo 3 hari" : a.payment_terms === "weekly" ? "Tempo 7 hari" : "Bayar di muka"}{l.credit > 0 ? ` · kredit ${rupiah(l.credit)}` : ""}</p>
                  {blocked && <p className="mt-1 text-xs font-semibold text-gold-ink">Tempo ditahan: {blocked.includes("batas kredit") ? "batas kredit penuh" : "tagihan lewat jatuh tempo"}</p>}
                </td>
                {BUCKETS.map(([k]) => <td key={k} className={`px-3 py-3 text-right tabular-nums ${k !== "current" && l.aging[k] > 0 ? "font-semibold text-gold-ink" : l.aging[k] ? "" : "text-mute"}`}>{l.aging[k] ? rupiah(l.aging[k]) : "—"}</td>)}
                <td className="px-3 py-3 text-right tabular-nums text-mute">{l.upcoming ? rupiah(l.upcoming) : "—"}</td>
                <td className="px-3 py-3 text-right font-bold tabular-nums">{rupiah(Math.max(0, l.balance))}</td>
                <td className="px-4 py-3 text-right text-xs">{a.credit_limit === null ? <span className="text-mute">Tanpa batas</span> : <>{rupiah(a.credit_limit)}<span className="block text-mute">sisa {rupiah(l.available ?? 0)}</span></>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={BUCKETS.length + 4} className="px-4 py-6 text-center text-mute">Belum ada restoran dengan tempo.</td></tr>}
          </tbody>
          {rows.length > 1 && (
            <tfoot className="border-t-2 border-ink text-sm font-bold">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                {BUCKETS.map(([k]) => <td key={k} className="px-3 py-2.5 text-right tabular-nums">{rupiah(sum((l) => l.aging[k]))}</td>)}
                <td className="px-3 py-2.5 text-right tabular-nums">{rupiah(sum((l) => l.upcoming))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{rupiah(sum((l) => Math.max(0, l.balance)))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </section>
      <p className="text-xs text-mute">Umur piutang dihitung dari tanggal jatuh tempo (tanggal kirim + tempo). Restoran yang tagihannya lewat jatuh tempo lebih dari {settings.terms_grace_days} hari tidak dapat memesan dengan tempo sampai tagihan itu dilunasi; ubah toleransi di Pengaturan.</p>
    </div>
  );
}
