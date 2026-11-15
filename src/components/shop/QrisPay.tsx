"use client";
// Dynamic QRIS for the exact final amount, confirmed automatically by the payment gateway.
// The QR is drawn in the browser from the QRIS payload; the page polls until the payment is confirmed.
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Download, Loader2, RefreshCw, Smartphone } from "lucide-react";
import { qrisStatusAction, simulateDemoPaymentAction, startQrisAction } from "@/actions/payments";
import type { PublicPayment } from "@/lib/payments/service";
import { formatDateTime, rupiah } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

type Done = "paid" | "checking";

export function QrisPay({ code, phone, onDone, fallback }: { code: string; phone: string; onDone: (state: Done) => void; fallback: React.ReactNode }) {
  const { locale } = useT();
  const en = locale === "en";
  const [pay, setPay] = useState<PublicPayment | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState<Done | null>(null);
  const doneRef = useRef(false);

  const issue = useCallback(async () => {
    setBusy(true);
    setErr(null);
    const r = await startQrisAction(code, phone);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setPay(r.data);
    setImg(r.data.qr_string ? await QRCode.toDataURL(r.data.qr_string, { width: 560, margin: 2, errorCorrectionLevel: "M" }) : null);
  }, [code, phone]);

  const finish = useCallback((state: Done) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(state);
    onDone(state);
  }, [onDone]);

  const poll = useCallback(async () => {
    if (doneRef.current || document.visibilityState !== "visible") return;
    const r = await qrisStatusAction(code, phone);
    if (!r.ok) return;
    if (r.data.payment_status === "paid") finish("paid");
    else if (r.data.payment_status === "awaiting_confirmation") finish("checking");
    else if (r.data.payment && (r.data.payment.status === "expired" || r.data.payment.status === "cancelled")) setPay((p) => (p && p.id === r.data.payment!.id ? { ...p, status: r.data.payment!.status } : p));
  }, [code, phone, finish]);

  useEffect(() => { issue(); }, [issue]);
  useEffect(() => {
    const a = setInterval(poll, 4000);
    const b = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [poll]);

  if (done) {
    return (
      <div className="mt-3 flex items-start gap-3 bg-success-50 px-4 py-3 text-success-600" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
        <p className="text-sm font-semibold">{done === "paid" ? (en ? "Payment received. Thank you! We'll pack your order." : "Pembayaran diterima. Terima kasih! Pesanan Anda segera kami siapkan.") : (en ? "Payment received. We are checking the amount and will confirm on WhatsApp." : "Pembayaran diterima. Kami sedang memeriksa nominalnya dan akan mengabari melalui WhatsApp.")}</p>
      </div>
    );
  }
  if (err) return <div className="mt-3 space-y-3"><p className="bg-warn-50 px-3 py-2 text-sm text-warn-600">{err}</p>{fallback}</div>;
  if (!pay) return <div className="mt-3 flex h-48 items-center justify-center bg-sand-100 text-sm text-mute"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{en ? "Preparing your QRIS…" : "Menyiapkan QRIS…"}</div>;

  const left = pay.expires_at ? Math.max(0, Math.floor((Date.parse(pay.expires_at) - now) / 1000)) : null;
  const expired = pay.status !== "pending" || left === 0;
  const mmss = left !== null ? `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}` : "";

  return (
    <div className="mt-3">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative flex-none border border-line bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img && <img src={img} alt={`QRIS ${rupiah(pay.amount)}`} width={232} height={232} className={`h-[232px] w-[232px] ${expired ? "opacity-15" : ""}`} />}
          {expired && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center"><p className="text-sm font-semibold">{en ? "This QR has expired." : "QR ini sudah kedaluwarsa."}</p><button onClick={issue} disabled={busy} className="btn-primary py-2 text-xs">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {en ? "New QR" : "Buat QR baru"}</button></div>}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-display text-[1.7rem] font-bold leading-none text-ocean-950">{rupiah(pay.amount)}</p>
          {!expired && pay.expires_at && <p className="text-mute">{en ? "Valid until" : "Berlaku sampai"} {formatDateTime(pay.expires_at, locale)} WIB · <span className="font-semibold tabular-nums text-ink">{mmss}</span></p>}
          <ol className="list-decimal space-y-1 pl-4 text-ink/80">
            <li>{en ? "Open any bank or e-wallet app (GoPay, OVO, DANA, ShopeePay, m-banking) and choose Scan / Pay QRIS." : "Buka aplikasi bank atau e-wallet apa pun (GoPay, OVO, DANA, ShopeePay, m-banking), pilih Scan / Bayar QRIS."}</li>
            <li>{en ? "Scan this code. The amount is filled in for you." : "Pindai kode ini. Nominal sudah terisi otomatis."}</li>
            <li>{en ? "This page confirms the payment by itself within seconds." : "Halaman ini mengonfirmasi pembayaran sendiri dalam beberapa detik."}</li>
          </ol>
          <p className="flex items-start gap-1.5 text-xs text-mute"><Smartphone className="mt-0.5 h-3.5 w-3.5 flex-none" />{en ? "Paying on this phone? Save the QR image, then pick it from your gallery in the payment app." : "Membayar dari ponsel ini? Simpan gambar QR, lalu pilih dari galeri di aplikasi pembayaran."}</p>
          {img && !expired && <a href={img} download={`QRIS-${code}.png`} className="btn-secondary py-2 text-xs"><Download className="h-4 w-4" /> {en ? "Save QR image" : "Simpan gambar QR"}</a>}
          {pay.demo && !expired && <button onClick={async () => { await simulateDemoPaymentAction(code, phone); await poll(); }} className="btn-outline ml-2 py-2 text-xs">{en ? "Simulate payment (demo)" : "Simulasikan pembayaran (demo)"}</button>}
          <p className="flex items-center gap-1.5 text-xs text-mute" aria-live="polite"><Loader2 className="h-3 w-3 animate-spin" />{en ? "Waiting for payment…" : "Menunggu pembayaran…"}</p>
        </div>
      </div>
    </div>
  );
}
