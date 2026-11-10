import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { getRepo } from "@/lib/data";
import { pickDate } from "@/lib/ops";
import { DateSelector } from "@/components/admin/DateSelector";
import { Stat, StatusBadge, PaymentBadge } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/config";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: dp } = await searchParams;
  const date = pickDate(dp);
  const repo = await getRepo();
  const [summary, orders, accounts] = await Promise.all([repo.dailySummary(date), repo.listOrders({ date }), repo.listAccounts()]);
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pesanan" value={summary.orders_total} sub={`${summary.orders_business} bisnis · ${summary.orders_retail} rumah tangga`} />
        <Stat label="Penjualan" value={rupiah(summary.sales, { compact: true })} sub={summary.to_weigh ? `${summary.to_weigh} belum ditimbang (perkiraan)` : "angka akhir"} />
        <Stat label="Laba kotor (est.)" value={`${summary.margin_pct.toFixed(1)}%`} sub={rupiah(summary.est_gross_profit, { compact: true })} tone={marginTone} />
        <Stat label="Non-seafood" value={`${summary.non_seafood_share_pct.toFixed(0)}%`} sub="target Gate B: 15–25%" tone={summary.non_seafood_share_pct >= 15 ? "good" : "neutral"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ActionCard title="Perlu dikonfirmasi" count={toConfirm.length} href={`/admin/pesanan?date=${date}&status=new`} tone="coral">
          {toConfirm.slice(0, 4).map((o) => <Row key={o.id} o={o} />)}
        </ActionCard>
        <ActionCard title="Perlu ditimbang" count={toWeigh.length} href={`/admin/pesanan?date=${date}&weigh=1`} tone="warn" icon={<Scale className="h-4 w-4" />}>
          {toWeigh.slice(0, 4).map((o) => <Row key={o.id} o={o} />)}
        </ActionCard>
        <ActionCard title="Belum lunas" count={orders.filter((o) => o.payment_status !== "paid" && o.status !== "cancelled").length} href={`/admin/pesanan?date=${date}&unpaid=1`} tone="neutral" sub={`${rupiah(summary.unpaid_amount, { compact: true })}${awaiting.length ? ` · ${awaiting.length} menunggu cek bank` : ""}`}>
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
            <Link href={`/admin/rute?date=${date}`} className="btn-secondary justify-between">Rute & packing <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between"><h2 className="text-ocean-900">Pendaftaran akun bisnis</h2><Link href="/admin/pelanggan" className="text-sm font-semibold text-tide-600">Semua</Link></div>
          {pendingAccounts.length === 0 ? <p className="mt-3 text-sm text-mute">Tidak ada pendaftaran menunggu.</p> : (
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

function Row({ o }: { o: { id: string; code: string; customer_name: string; total_est: number; total_final: number | null; status: "new" | "confirmed" | "packing" | "delivering" | "completed" | "cancelled"; payment_status: "unpaid" | "awaiting_confirmation" | "paid" | "void" } }) {
  return (
    <li className="py-2 text-sm">
      <Link href={`/admin/pesanan/${o.id}`} className="flex items-center justify-between gap-2">
        <span className="min-w-0"><span className="block truncate font-medium">{o.customer_name}</span><span className="text-xs text-mute">{o.code}</span></span>
        <span className="flex items-center gap-2"><span className="font-semibold">{rupiah(o.total_final ?? o.total_est, { compact: true })}</span><StatusBadge status={o.status} /><PaymentBadge status={o.payment_status} /></span>
      </Link>
    </li>
  );
}
