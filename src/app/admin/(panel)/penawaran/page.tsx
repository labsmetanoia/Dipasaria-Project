// Quotations for restaurants, hotels and caterers: list, state and value.
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { Badge } from "@/components/ui";
import { formatDate, nowJakarta } from "@/lib/format";
import { QUOTE_STATE_LABEL, quoteState } from "@/lib/sales";

export const dynamic = "force-dynamic";
const TONE = { draft: "neutral", sent: "tide", accepted: "success", declined: "neutral", expired: "warn" } as const;

export default async function QuotesPage() {
  await requireAdmin();
  const quotes = await (await getRepo()).listQuotes();
  const today = nowJakarta().date;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Penjualan</p>
          <h1 className="text-2xl text-ocean-900">Penawaran harga</h1>
          <p className="max-w-3xl text-sm text-mute">Untuk hotel, katering, dan grup restoran yang membeli dengan penawaran. Kirim tautannya lewat WhatsApp; begitu diterima, harganya menjadi harga kontrak akun mereka (calon pelanggan mendapat akun yang menunggu persetujuan Anda).</p>
        </div>
        <Link href="/admin/penawaran/baru" className="btn-primary">Penawaran baru</Link>
      </div>
      {quotes.length === 0 ? <p className="card p-5 text-sm text-mute">Belum ada penawaran.</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="p-3">Nomor</th><th className="p-3">Untuk</th><th className="p-3">Produk</th><th className="p-3">Berlaku sampai</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {quotes.map((q) => { const st = quoteState(q, today); return (
                <tr key={q.id} className="border-b border-line/60">
                  <td className="p-3"><Link href={`/admin/penawaran/${q.id}`} className="font-semibold text-gold-ink">{q.code}</Link></td>
                  <td className="p-3">{q.business_name}{q.account_id ? "" : <span className="ml-1 text-xs text-mute">calon pelanggan</span>}</td>
                  <td className="p-3">{q.lines.length}</td>
                  <td className="p-3">{formatDate(q.valid_until, "short")}</td>
                  <td className="p-3"><Badge tone={TONE[st]}>{QUOTE_STATE_LABEL[st]}</Badge></td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
