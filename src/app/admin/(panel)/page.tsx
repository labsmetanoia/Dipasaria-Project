import { requireAdmin } from "@/lib/auth";
import { expireIfDue } from "@/lib/expiry";
import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { getRepo } from "@/lib/data";
import { pickDate } from "@/lib/ops";
import { DateSelector } from "@/components/admin/DateSelector";
import { Stat, StatusBadge, PaymentBadge } from "@/components/ui";
import { addDays, nowJakarta, rupiah } from "@/lib/format";
import { buildLedger } from "@/lib/receivables";
import { buildBrief } from "@/lib/brief";
import { BriefCard } from "@/components/admin/BriefCard";
import { STATUS_LABEL } from "@/lib/config";
import { RECENT_DAYS, contractAlerts } from "@/lib/dailyPrice";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  await expireIfDue("wait"); // unpaid orders past their deadline must not reach the buying list or the route
  const { date: dp } = await searchParams;
  const date = pickDate(dp);
  const repo = await getRepo();
  const [summary, orders, accounts, errors, openClaims] = await Promise.all([repo.dailySummary(date), repo.listOrders({ date }), repo.listAccounts(), repo.listErrors({ limit: 50 }).catch(() => []), repo.listClaims({ status: "open", limit: 50 })]);
  const receivables = await repo.listReceivables().catch(() => null);
  const today = nowJakarta().date;
  const overdueAccounts = receivables ? accounts.map((a) => buildLedger(a, receivables.orders, receivables.payments, receivables.allocations, today)).filter((l) => l.overdue > 0) : [];
  const overdueTotal = overdueAccounts.reduce((s, l) => s + l.overdue, 0);
  // restaurant contract prices the auction has overtaken (recent purchase cost against the wholesale target)
  const [contracts, costProducts, recentPurchases, settingsNow] = await Promise.all([repo.listContractPrices(), repo.getProducts({ includeCost: true }), repo.listPurchases({ from: addDays(today, -(RECENT_DAYS - 1)), to: today }), repo.getSettings()]);
  const lowContracts = contractAlerts(contracts, accounts, costProducts, recentPurchases, settingsNow, today);
  const brief = await buildBrief(repo, date);
  const lowRatings = (await repo.listRatings({ since: addDays(today, -7), limit: 200 }).catch(() => [])).filter((r) => r.stars <= 2);
  const pendingAccounts = accounts.filter((a) => a.status === "pending");
  const toConfirm = orders.filter((o) => o.status === "new");
  const toWeigh = orders.filter((o) => o.has_catch_weight && !o.weighed_at && o.status !== "cancelled");
  const awaiting = orders.filter((o) => o.payment_status === "awaiting_confirmation");
  const marginTone = summary.margin_pct >= 12 ? "good" : summary.margin_pct >= 10 ? "neutral" : "bad";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">Ringkasan harian</p><h1 className="text-2xl text-ocean-900">Pengiriman</h1></div>
        <DateSelector date={date} />
      </div>
      {lowContracts.length > 0 && <Link href="/admin/harga" className="block bg-coral-50 px-4 py-3 text-sm font-semibold text-gold-ink">{lowContracts.length} harga kontrak restoran di bawah target margin ({lowContracts.slice(0, 2).map((a) => `${a.account_name}: ${a.product_name}`).join(", ")}). Lihat Harga hari ini →</Link>}
      {openClaims.length > 0 && <Link href="/admin/garansi" className="block bg-coral-50 px-4 py-3 text-sm font-semibold text-gold-ink">{openClaims.length} laporan garansi menunggu keputusan →</Link>}
      <BriefCard date={date} text={brief.text} attention={brief.attention} configured={Boolean(process.env.ALERT_WEBHOOK_URL)} />
      {lowRatings.length > 0 && <Link href="/admin/laporan#penilaian-pelanggan" className="block bg-coral-50 px-4 py-3 text-sm font-semibold text-gold-ink">{lowRatings.length} penilaian rendah (1–2 bintang) dalam 7 hari terakhir →</Link>}
      {overdueTotal > 0 && <Link href="/admin/piutang" className="block bg-coral-50 px-4 py-3 text-sm font-semibold text-gold-ink">Piutang lewat jatuh tempo {rupiah(overdueTotal)} dari {overdueAccounts.length} restoran →</Link>}
      {errors.length > 0 && <Link href="/admin/sistem" className="block bg-coral-50 px-4 py-3 text-sm font-semibold text-gold-ink">{errors.length} jenis error belum ditangani ({errors.reduce((s, e) => s + e.count, 0)} kejadian). Lihat Sistem →</Link>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pesanan" value={summary.orders_total} sub={`${summary.orders_business} bisnis · ${summary.orders_retail} rumah tangga`} />
        <Stat label="Penjualan" value={rupiah(summary.sales, { compact: true })} sub={summary.to_weigh ? `${summary.to_weigh} belum ditimbang (perkiraan)` : "angka akhir"} />
        <Stat label="Laba kotor (perkiraan)" value={`${summary.margin_pct.toFixed(1)}%`} sub={rupiah(summary.est_gross_profit, { compact: true })} tone={marginTone} />
        <Stat label="Nonseafood" value={`${summary.non_seafood_share_pct.toFixed(0)}%`} sub="target Gate B: 15–25%" tone={summary.non_seafood_share_pct >= 15 ? "good" : "neutral"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ActionCard title="Perlu dikonfirmasi" count={toConfirm.length} href={`/admin/pesanan?date=${date}&status=new`} tone="coral">
          {toConfirm.slice(0, 4).map((o) => <Row key={o.id} o={o} />)}
        </ActionCard>
        <ActionCard title="Perlu ditimbang" count={toWeigh.length} href={`/admin/pesanan?date=${date}&weigh=1`} tone="warn" icon={<Scale className="h-4 w-4" />}>
          {toWeigh.slice(0, 4).map((o) => <Row key={o.id} o={o} />)}
        </ActionCard>
        <ActionCard title="Belum lunas" count={orders.filter((o) => o.payment_status !== "paid" && o.status !== "cancelled").length} href={`/admin/pesanan?date=${date}&unpaid=1`} tone="neutral" sub={`${rupiah(summary.unpaid_amount, { compact: true })}${awaiting.length ? ` · ${awaiting.length} menunggu pengecekan bank` : ""}`}>
          {awaiting.slice(0, 4).map((o) => <Row key={o.id} o={o} />)}
        </ActionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-ocean-900">Status pesanan hari ini</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(summary.by_status) as Array<keyof typeof summary.by_status>).map((s) => (
              <Link key={s} href={`/admin/pesanan?date=${date}&status=${s}`} className="chip">{STATUS_LABEL[s]} <b className="ml-1">{summary.by_status[s]}</b></Link>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <Link href={`/admin/belanja-subuh?date=${date}`} className="btn-secondary justify-between">Daftar belanja subuh <ArrowRight className="h-4 w-4" /></Link>
            <Link href={`/admin/rute?date=${date}`} className="btn-secondary justify-between">Rute dan pengemasan <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between"><h2 className="text-ocean-900">Pendaftaran akun bisnis</h2><Link href="/admin/pelanggan" className="text-sm font-semibold text-tide-600">Semua</Link></div>
          {pendingAccounts.length === 0 ? <p className="mt-3 text-sm text-mute">Tidak ada pendaftaran yang menunggu persetujuan.</p> : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {pendingAccounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <div><p className="font-medium">{a.business_name}</p><p className="text-xs text-mute">{a.business_type} · {a.contact_name}</p></div>
                  <Link href={`/admin/pelanggan?id=${a.id}`} className="btn-primary px-3 py-1.5 text-xs">Tinjau</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, count, href, tone, children, sub, icon }: { title: string; count: number; href: string; tone: "coral" | "warn" | "neutral"; children: React.ReactNode; sub?: string; icon?: React.ReactNode }) {
  const color = tone === "coral" ? "text-gold-ink" : tone === "warn" ? "text-warn-600" : "text-ocean-900";
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div><p className="flex items-center gap-1.5 text-sm font-semibold text-ink/80">{icon}{title}</p>{sub && <p className="text-xs text-mute">{sub}</p>}</div>
        <span className={`font-display text-3xl font-semibold ${color}`}>{count}</span>
      </div>
      <ul className="mt-3 divide-y divide-line">{children}</ul>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-tide-600">Buka daftar <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}

function Row({ o }: { o: { id: string; code: string; customer_name: string; total_est: number; total_final: number | null; status: "new" | "confirmed" | "packing" | "delivering" | "completed" | "cancelled"; payment_status: import("@/lib/types").PaymentStatus } }) {
  return (
    <li className="py-2 text-sm">
      <Link href={`/admin/pesanan/${o.id}`} className="flex items-center justify-between gap-2">
        <span className="min-w-0"><span className="block truncate font-medium">{o.customer_name}</span><span className="text-xs text-mute">{o.code}</span></span>
        <span className="flex items-center gap-2"><span className="font-semibold">{rupiah(o.total_final ?? o.total_est, { compact: true })}</span><StatusBadge status={o.status} /><PaymentBadge status={o.payment_status} /></span>
      </Link>
    </li>
  );
}
