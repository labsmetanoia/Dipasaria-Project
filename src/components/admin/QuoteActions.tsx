"use client";
// Send, take back or close a quotation; sending gives the signed link and a ready WhatsApp message.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MessageCircle } from "lucide-react";
import type { Quotation } from "@/lib/types";
import { setQuoteStatusAction } from "@/actions/admin";
import { formatDate, waLink } from "@/lib/format";

export function QuoteActions({ quote, link, storeName }: { quote: Quotation; link: string; storeName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const go = (status: "draft" | "sent" | "declined") => start(async () => {
    setErr(null);
    if (status === "declined" && !confirm("Tandai penawaran ini ditolak? Tautannya tidak dapat diterima lagi.")) return;
    const r = await setQuoteStatusAction(quote.id, status);
    if (!r.ok) { setErr(r.error); return; }
    router.refresh();
  });
  const text = `Halo ${quote.contact_name || quote.business_name}, berikut penawaran harga ${storeName} ${quote.code}. Silakan dibaca dan, bila sesuai, terima langsung dari tautan ini sebelum ${formatDate(quote.valid_until, "long")}: ${link}`;
  return (
    <div className="card space-y-3 p-5" data-quote-actions>
      {quote.status === "draft" && <><p className="text-sm">Periksa isi penawaran, lalu kirim. Setelah dikirim, pelanggan dapat menerimanya dari tautan.</p><button onClick={() => go("sent")} disabled={pending || quote.lines.length === 0} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tandai terkirim dan buat tautan"}</button></>}
      {quote.status === "sent" && (
        <>
          <p className="text-sm">Tautan penawaran (bisa dibuka tanpa masuk; dapat diterima sampai {formatDate(quote.valid_until, "long")}):</p>
          <p className="break-all bg-sand-50 px-3 py-2 font-mono text-xs" data-quote-link>{link}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* convenience only */ } }} className="btn-secondary text-sm"><Copy className="h-4 w-4" /> {copied ? "Tersalin" : "Salin tautan"}</button>
            {quote.phone && <a href={waLink(quote.phone, text)} target="_blank" rel="noreferrer" className="btn-secondary text-sm"><MessageCircle className="h-4 w-4" /> Kirim lewat WhatsApp</a>}
            <a href={link} target="_blank" rel="noreferrer" className="btn-secondary text-sm">Buka / cetak PDF</a>
            <button onClick={() => go("draft")} disabled={pending} className="btn-ghost text-sm">Ubah lagi (kembali ke draf)</button>
            <button onClick={() => go("declined")} disabled={pending} className="btn-ghost text-sm text-gold-ink">Tandai ditolak</button>
          </div>
        </>
      )}
      {quote.status === "declined" && <><p className="text-sm">Penawaran ini ditandai ditolak.</p><button onClick={() => go("draft")} disabled={pending} className="btn-secondary text-sm">Buka lagi sebagai draf</button></>}
      {quote.status === "accepted" && <p className="text-sm">Diterima oleh <b>{quote.accepted_name}</b>. Harganya sudah menjadi harga kontrak akun ini (lihat Piutang → akun → Harga kontrak).</p>}
      {err && <p className="text-sm text-gold-ink" role="alert">{err}</p>}
    </div>
  );
}
