// Statement of account (rekening koran) for one restaurant: printable, shown in the back-office and on the signed
// link sent by WhatsApp. Server component; no client JavaScript.
import Link from "next/link";
import type { BusinessAccount, Settings } from "@/lib/types";
import type { Ledger, Statement } from "@/lib/receivables";
import { formatDate, rupiah } from "@/lib/format";
import { Logo } from "@/components/Logo";

const TERMS: Record<BusinessAccount["payment_terms"], string> = { prepaid: "Bayar di muka", days3: "Tempo 3 hari", weekly: "Tempo 7 hari" };

export function StatementDoc({ account, settings, ledger, statement, today, invoiceHref }: {
  account: BusinessAccount;
  settings: Settings;
  ledger: Ledger;
  statement: Statement;
  today: string;
  /** link to an invoice from its order, or null for no link */
  invoiceHref?: (orderId: string, code: string) => string | null;
}) {
  const s = statement;
  return (
    <article className="statement mx-auto max-w-3xl bg-white p-5 text-sm text-ink print:max-w-none print:p-0 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div><Logo size="sm" /><p className="mt-2 text-xs text-mute">{settings.address_line} · WhatsApp +{settings.whatsapp_number}</p></div>
        <div className="sm:text-right"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink">Rekening koran</p><h1 className="mt-1 text-[1.6rem] leading-none">{account.business_name}</h1><p className="mt-1 text-xs text-mute">{formatDate(s.from, "short")} – {formatDate(s.to, "short")} {s.to.slice(0, 4)} · dicetak {formatDate(today, "short")}</p></div>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="text-mute">Kontak</dt><dd className="font-semibold">{account.contact_name}</dd></div>
        <div><dt className="text-mute">Tempo</dt><dd className="font-semibold">{TERMS[account.payment_terms]}</dd></div>
        <div><dt className="text-mute">Batas kredit</dt><dd className="font-semibold">{account.credit_limit === null ? "Tanpa batas" : rupiah(account.credit_limit)}</dd></div>
        <div><dt className="text-mute">Sisa batas</dt><dd className="font-semibold">{ledger.available === null ? "—" : rupiah(ledger.available)}</dd></div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([["Saldo awal", s.opening], ["Tagihan periode ini", s.invoiced], ["Pembayaran diterima", s.received], ["Saldo akhir", s.closing]] as const).map(([k, v], i) => (
          <div key={k} className={`border p-3 ${i === 3 ? "border-ink bg-sand-50" : "border-line"}`}><p className="text-[11px] text-mute">{k}</p><p className={`font-bold tabular-nums ${i === 3 ? "text-lg" : ""}`}>{rupiah(v)}</p></div>
        ))}
      </div>

      <div className="overflow-x-auto"><table className="mt-5 w-full text-xs">
        <thead><tr className="border-b border-ink text-left"><th className="py-1.5 pr-2 font-semibold">Tanggal</th><th className="py-1.5 pr-2 font-semibold">Keterangan</th><th className="hidden py-1.5 pr-2 text-right font-semibold sm:table-cell">Tagihan</th><th className="hidden py-1.5 pr-2 text-right font-semibold sm:table-cell">Bayar</th><th className="py-1.5 pr-2 text-right font-semibold sm:hidden">Jumlah</th><th className="py-1.5 text-right font-semibold">Saldo</th></tr></thead>
        <tbody>
          <tr className="border-b border-line text-mute"><td className="py-1.5 pr-2">{formatDate(s.from, "short")}</td><td className="py-1.5 pr-2" colSpan={1}>Saldo awal</td><td className="hidden sm:table-cell" /><td className="hidden sm:table-cell" /><td className="sm:hidden" /><td className="py-1.5 text-right tabular-nums">{rupiah(s.opening)}</td></tr>
          {s.lines.map((l, i) => {
            const href = l.order_id && invoiceHref ? invoiceHref(l.order_id, l.ref) : null;
            return (
              <tr key={i} className="border-b border-line align-top">
                <td className="py-1.5 pr-2 whitespace-nowrap">{formatDate(l.date, "short")}</td>
                <td className="py-1.5 pr-2">{href && l.kind === "invoice" ? <Link href={href} className="font-semibold text-ocean-900 underline-offset-2 hover:underline">{l.description}</Link> : l.description}</td>
                <td className="hidden py-1.5 pr-2 text-right tabular-nums sm:table-cell">{l.debit ? rupiah(l.debit) : ""}</td>
                <td className="hidden py-1.5 pr-2 text-right tabular-nums sm:table-cell">{l.credit ? rupiah(l.credit) : ""}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums whitespace-nowrap sm:hidden">{l.debit ? rupiah(l.debit) : `−${rupiah(l.credit)}`}</td>
                <td className="py-1.5 text-right tabular-nums">{rupiah(l.balance)}</td>
              </tr>
            );
          })}
          {s.lines.length === 0 && <tr><td colSpan={5} className="py-3 text-center text-mute">Tidak ada transaksi pada periode ini.</td></tr>}
        </tbody>
      </table></div>

      <section className="mt-6">
        <h2 className="text-[1.15rem]">Tagihan belum lunas</h2>
        {ledger.open.length === 0 ? <p className="mt-1 text-xs text-mute">Semua tagihan sudah lunas. Terima kasih.</p> : (
          <div className="overflow-x-auto"><table className="mt-2 w-full text-xs">
            <thead><tr className="border-b border-ink text-left"><th className="py-1.5 pr-2 font-semibold">Pesanan</th><th className="hidden py-1.5 pr-2 font-semibold sm:table-cell">Dikirim</th><th className="py-1.5 pr-2 font-semibold">Jatuh tempo</th><th className="py-1.5 pr-2 text-right font-semibold">Sisa</th></tr></thead>
            <tbody>
              {ledger.open.map((i) => {
                const href = invoiceHref ? invoiceHref(i.order.id, i.order.code) : null;
                return (
                  <tr key={i.order.id} className="border-b border-line">
                    <td className="py-1.5 pr-2">{href ? <Link href={href} className="font-semibold text-ocean-900 underline-offset-2 hover:underline">{i.order.code}</Link> : i.order.code}{i.estimate ? <span className="text-mute"> · perkiraan</span> : null}<span className="block text-mute sm:hidden">dikirim {formatDate(i.order.delivery_date, "short")}{i.delivered ? "" : " (belum)"}</span></td>
                    <td className="hidden py-1.5 pr-2 sm:table-cell">{formatDate(i.order.delivery_date, "short")}{i.delivered ? "" : " (belum dikirim)"}</td>
                    <td className={`py-1.5 pr-2 ${i.days_past_due > 0 ? "font-semibold text-gold-ink" : ""}`}>{i.due_date ? formatDate(i.due_date, "short") : "—"}{i.days_past_due > 0 ? <span className="block sm:inline"> · lewat {i.days_past_due} hari</span> : null}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{rupiah(i.remaining)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
        {ledger.credit > 0 && <p className="mt-2 text-xs">Kelebihan bayar tersimpan sebagai saldo kredit {rupiah(ledger.credit)} dan dipakai otomatis untuk tagihan berikutnya.</p>}
      </section>

      <footer className="mt-6 border-t border-line pt-3 text-xs text-mute">
        <p>Pembayaran ke <b className="text-ink">{settings.bank_name} {settings.bank_account}</b> a.n. {settings.bank_holder}. Cantumkan nama usaha atau nomor pesanan di berita transfer. Pembayaran dicocokkan ke tagihan paling lama lebih dulu.</p>
        <p className="mt-1">Pertanyaan tentang tagihan: WhatsApp +{settings.whatsapp_number}.</p>
      </footer>
    </article>
  );
}
