import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Printer } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { formatDate, nowJakarta, rupiah } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, buildLedger, termsBlock } from "@/lib/receivables";
import { ContractPrices, CreditForm, DeletePaymentButton, PaymentForm, SendStatementButton, type VariantOption } from "@/components/admin/ReceivablesControls";

export const metadata = { title: "Piutang restoran" };
export const dynamic = "force-dynamic";

export default async function AccountReceivablesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const repo = await getRepo();
  const account = await repo.getAccount(id);
  if (!account) notFound();
  const today = nowJakarta().date;
  const [data, settings, contracts, products] = await Promise.all([
    repo.listReceivables({ accountId: id }), repo.getSettings(), repo.listContractPrices(id), repo.getProducts({ includeInactive: true, includeCost: true }),
  ]);
  const l = buildLedger(account, data.orders, data.payments, data.allocations, today);
  const blocked = account.payment_terms === "prepaid" ? null : termsBlock(l, account, settings, 0, today);
  const disc = Math.round((account.discount_pct ?? 0) * 100);
  const variants: VariantOption[] = products.flatMap((p) => p.variants.filter((v) => v.is_active).map((v) => ({
    id: v.id, label: `${p.name} ${v.label}`, standard: Math.round((v.price_business * (10000 - disc)) / 10000), cost: v.cost,
  }))).sort((a, b) => a.label.localeCompare(b.label, "id"));
  const monthStart = `${today.slice(0, 8)}01`;
  const paidRecently = l.invoices.filter((i) => !i.open).slice(-8).reverse();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow"><Link href="/admin/piutang">Piutang</Link></p>
          <h1 className="text-2xl text-ocean-900">{account.business_name}</h1>
          <p className="text-sm text-mute">{account.contact_name} · +{account.phone} · {account.payment_terms === "days3" ? "tempo 3 hari" : account.payment_terms === "weekly" ? "tempo 7 hari" : "bayar di muka"}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link href={`/admin/piutang/${account.id}/rekening?from=${monthStart}&to=${today}`} className="btn-secondary"><Printer className="h-4 w-4" /> Rekening koran</Link>
          <Link href={`/admin/penawaran/baru?akun=${account.id}`} className="btn-secondary">Buat penawaran</Link>
          <SendStatementButton accountId={account.id} />
        </div>
      </div>

      {blocked && <p className="border-l-4 border-coral-500 bg-coral-50 px-4 py-3 text-sm"><b>Pesanan tempo baru ditahan.</b> {blocked.includes("batas kredit") ? "Batas kredit sudah penuh." : blocked.replace("Pembayaran tempo belum dapat dipakai: tagihan", "Tagihan").replace(" Silakan lunasi tagihan tersebut atau pilih metode pembayaran lain.", "")}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-mute">Sisa tagihan</p><p className="text-2xl font-bold">{rupiah(Math.max(0, l.balance))}</p>{l.upcoming > 0 && <p className="text-[11px] text-mute">{rupiah(l.upcoming)} belum dikirim</p>}</div>
        <div className="card p-4"><p className="text-xs text-mute">Lewat jatuh tempo</p><p className={`text-2xl font-bold ${l.overdue ? "text-gold-ink" : ""}`}>{rupiah(l.overdue)}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Sisa batas kredit</p><p className="text-2xl font-bold">{l.available === null ? "—" : rupiah(l.available)}</p><p className="text-[11px] text-mute">{account.credit_limit === null ? "tanpa batas" : `dari ${rupiah(account.credit_limit)}`}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Saldo kredit</p><p className="text-2xl font-bold">{rupiah(l.credit)}</p><p className="text-[11px] text-mute">kelebihan bayar</p></div>
      </div>

      <section className="card overflow-x-auto p-0">
        <h2 className="px-4 pt-4 text-[1.15rem]">Tagihan belum lunas</h2>
        <table className="mt-2 w-full min-w-[720px] text-sm">
          <thead className="bg-sand-50 text-left text-xs text-mute"><tr><th className="px-4 py-2 font-semibold">Pesanan</th><th className="px-3 py-2 font-semibold">Dikirim</th><th className="px-3 py-2 font-semibold">Jatuh tempo</th><th className="px-3 py-2 text-right font-semibold">Tagihan</th><th className="px-3 py-2 text-right font-semibold">Dibayar</th><th className="px-3 py-2 text-right font-semibold">Sisa</th><th className="px-4 py-2" /></tr></thead>
          <tbody>
            {l.open.map((i) => (
              <tr key={i.order.id} className="border-t border-line">
                <td className="px-4 py-2.5"><Link href={`/admin/pesanan/${i.order.id}`} className="font-semibold text-ocean-900">{i.order.code}</Link>{i.estimate && <span className="block text-[11px] text-mute">perkiraan, belum ditimbang</span>}</td>
                <td className="px-3 py-2.5">{formatDate(i.order.delivery_date, "short")}{!i.delivered && <span className="block text-[11px] text-mute">belum dikirim</span>}</td>
                <td className={`px-3 py-2.5 ${i.days_past_due > 0 ? "font-semibold text-gold-ink" : ""}`}>{i.due_date ? formatDate(i.due_date, "short") : "—"}{i.days_past_due > 0 && <span className="block text-[11px]">lewat {i.days_past_due} hari</span>}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{rupiah(i.amount)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-mute">{i.allocated ? rupiah(i.allocated) : "—"}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{rupiah(i.remaining)}</td>
                <td className="px-4 py-2.5 text-right"><Link href={`/admin/pesanan/${i.order.id}/faktur`} className="inline-flex items-center gap-1 text-xs font-semibold text-ocean-900"><FileText className="h-3.5 w-3.5" /> Faktur</Link></td>
              </tr>
            ))}
            {l.open.length === 0 && <tr><td colSpan={7} className="px-4 py-5 text-center text-mute">Tidak ada tagihan terbuka.</td></tr>}
          </tbody>
        </table>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <PaymentForm accountId={account.id} today={today} suggested={Math.max(0, l.overdue || l.balance - l.upcoming)} />
        <section className="card p-4">
          <h2 className="text-[1.15rem]">Riwayat pembayaran</h2>
          {l.payments.length === 0 ? <p className="mt-2 text-xs text-mute">Belum ada pembayaran tercatat.</p> : (
            <ul className="mt-2 divide-y divide-line text-sm">
              {l.payments.slice(0, 20).map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p><b className="tabular-nums">{rupiah(p.amount)}</b> · {formatDate(p.paid_on, "short")} · {PAYMENT_METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ""}</p>
                    <p className="text-xs text-mute">{p.allocations.length ? `Untuk ${p.allocations.map((a) => `${a.code} (${rupiah(a.amount)})`).join(", ")}` : "Belum dipakai"}{p.unapplied > 0 && p.allocations.length ? ` · sisa ${rupiah(p.unapplied)} jadi kredit` : ""}{p.note ? ` · ${p.note}` : ""}</p>
                  </div>
                  <DeletePaymentButton accountId={account.id} paymentId={p.id} label={`${rupiah(p.amount)} tanggal ${formatDate(p.paid_on, "short")}`} />
                </li>
              ))}
            </ul>
          )}
          {paidRecently.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold">Lunas terakhir</h3>
              <p className="mt-1 text-xs text-mute">{paidRecently.map((i) => `${i.order.code} ${rupiah(i.amount)}`).join(" · ")}</p>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <CreditForm account={account} />
        <ContractPrices accountId={account.id} contracts={contracts} variants={variants} today={today} />
      </div>
    </div>
  );
}
