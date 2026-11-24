// A quotation opened from its signed link (no sign-in): read it, print it to PDF, and accept it.
import type { Metadata } from "next";
import { getRepo } from "@/lib/data";
import { nowJakarta, formatDate } from "@/lib/format";
import { quoteState } from "@/lib/sales";
import { verifyQuoteToken } from "@/lib/quoteLink";
import { QuoteDoc } from "@/components/finance/QuoteDoc";
import { QuoteAccept } from "@/components/finance/QuoteAccept";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata: Metadata = { title: "Penawaran harga", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = verifyQuoteToken(token);
  const repo = await getRepo();
  const quote = id ? await repo.getQuote(id) : null;
  // a draft has not been sent yet: the link shows nothing until it is
  if (!quote || quote.status === "draft") return <Message title="Penawaran tidak ditemukan" body="Tautan ini tidak lengkap, atau penawarannya belum dikirim. Hubungi kami melalui WhatsApp." />;
  const [products, settings] = await Promise.all([repo.getProducts(), repo.getSettings()]);
  const st = quoteState(quote, nowJakarta().date);
  return (
    <main className="min-h-screen bg-sand-50 px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-3 flex max-w-3xl justify-end"><PrintButton /></div>
      <QuoteDoc quote={quote} products={products} settings={settings} />
      <div className="no-print mx-auto mt-4 max-w-3xl">
        {st === "sent" && <QuoteAccept token={token} code={quote.code} validUntil={formatDate(quote.valid_until, "long")} />}
        {st === "expired" && <p className="bg-white p-5 text-sm">Masa berlaku penawaran ini sudah lewat. Hubungi kami melalui WhatsApp untuk penawaran baru.</p>}
        {st === "declined" && <p className="bg-white p-5 text-sm">Penawaran ini tidak berlaku lagi. Hubungi kami melalui WhatsApp untuk penawaran baru.</p>}
      </div>
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4">
      <div className="max-w-md bg-white p-6 text-center text-sm"><h1 className="text-2xl">{title}</h1><p className="mt-2 text-mute">{body}</p></div>
    </main>
  );
}
