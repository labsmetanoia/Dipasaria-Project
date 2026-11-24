"use client";
// Virtual account: a bank account number opened for this one payment, for the exact amount. The customer transfers
// from m-banking, internet banking or an ATM; the gateway confirms it and this panel notices by polling.
// Used for transfer orders (code + phone) and for a restaurant paying its open invoices from the statement link.
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, Loader2, Landmark } from "lucide-react";
import { qrisStatusAction, simulateDemoPaymentAction, simulateStatementPaymentAction, startStatementVaAction, startVaAction, statementPaymentAction } from "@/actions/payments";
import type { PublicPayment } from "@/lib/payments/service";
import { formatDateTime, rupiah } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

type Done = "paid" | "checking";
export type VaTarget = { kind: "order"; code: string; phone: string } | { kind: "statement"; token: string; amount: number };

export function VaPay({ banks, target, onDone, fallback }: { banks: Array<{ id: string; label: string }>; target: VaTarget; onDone: (state: Done) => void; fallback: React.ReactNode }) {
  const { locale } = useT();
  const en = locale === "en";
  const [bank, setBank] = useState<string | null>(null);
  const [pay, setPay] = useState<PublicPayment | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const doneRef = useRef(false);
  const label = (id: string | null) => banks.find((b) => b.id === id)?.label ?? String(id ?? "").toUpperCase();

  const open = async (b: string) => {
    setBank(b); setBusy(true); setErr(null); setPay(null);
    const r = target.kind === "order" ? await startVaAction(target.code, target.phone, b) : await startStatementVaAction(target.token, b, target.amount);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setPay(r.data);
  };

  const finish = useCallback((state: Done) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(state);
    onDone(state);
  }, [onDone]);

  const poll = useCallback(async () => {
    if (!pay || doneRef.current || document.visibilityState !== "visible") return;
    if (target.kind === "order") {
      const r = await qrisStatusAction(target.code, target.phone);
      if (!r.ok) return;
      if (r.data.payment_status === "paid") finish("paid");
      else if (r.data.payment_status === "awaiting_confirmation") finish("checking");
      else if (r.data.payment && r.data.payment.id === pay.id && r.data.payment.status !== "pending") setPay({ ...pay, status: r.data.payment.status });
    } else {
      const r = await statementPaymentAction(target.token, pay.id);
      if (!r.ok) return;
      if (r.data.status === "paid") finish("paid");
      else if (r.data.status !== "pending") setPay(r.data);
    }
  }, [pay, target, finish]);

  useEffect(() => {
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  const simulate = async () => {
    if (!pay) return;
    if (target.kind === "order") await simulateDemoPaymentAction(target.code, target.phone);
    else await simulateStatementPaymentAction(target.token, pay.id);
    await poll();
  };

  if (done) {
    return (
      <div className="mt-3 flex items-start gap-3 bg-success-50 px-4 py-3 text-success-600" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
        <p className="text-sm font-semibold">{target.kind === "statement"
          ? (en ? "Payment received and matched to your oldest invoices. Thank you!" : "Pembayaran diterima dan dicocokkan ke faktur terlama. Terima kasih!")
          : done === "paid" ? (en ? "Payment received. Thank you! We'll pack your order." : "Pembayaran diterima. Terima kasih! Pesanan Anda segera kami siapkan.") : (en ? "Payment received. We are checking the amount and will confirm on WhatsApp." : "Pembayaran diterima. Kami sedang memeriksa nominalnya dan akan mengabari melalui WhatsApp.")}</p>
      </div>
    );
  }

  const expired = pay !== null && (pay.status !== "pending" || (pay.expires_at !== null && Date.parse(pay.expires_at) < Date.now()));
  return (
    <div className="mt-3 space-y-3" data-va>
      <div>
        <p className="text-sm font-semibold">{en ? "Pay by bank transfer to a virtual account" : "Bayar dengan transfer ke virtual account"}</p>
        <p className="text-xs text-mute">{en ? "Confirmed automatically, no need to send proof. Choose the bank you transfer from or to:" : "Terkonfirmasi otomatis, tanpa perlu kirim bukti. Pilih bank tujuan:"}</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={en ? "Bank" : "Bank"}>
          {banks.map((b) => <button key={b.id} type="button" disabled={busy} onClick={() => open(b.id)} className={`chip ${bank === b.id ? "chip-on" : ""}`}>{b.label}</button>)}
        </div>
      </div>
      {busy && <p className="flex items-center gap-2 text-sm text-mute"><Loader2 className="h-4 w-4 animate-spin" />{en ? "Opening your virtual account…" : "Menyiapkan virtual account…"}</p>}
      {err && <div className="space-y-3"><p className="bg-warn-50 px-3 py-2 text-sm text-warn-600">{err}</p>{fallback}</div>}
      {pay && !busy && (
        <div className="border border-line bg-white p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-mute"><Landmark className="h-4 w-4" />{en ? `${label(pay.va_bank)} virtual account` : `Virtual account ${label(pay.va_bank)}`}</p>
          {expired ? (
            <p className="mt-2 text-sm">{en ? "This virtual account has closed. Choose a bank again to open a new one." : "Virtual account ini sudah ditutup. Pilih bank lagi untuk membuat yang baru."}</p>
          ) : (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <p className="font-display text-[1.9rem] font-bold tabular-nums leading-none tracking-wide text-ocean-950" data-va-number>{pay.va_number}</p>
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(pay.va_number ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* copying is a convenience */ } }} className="btn-secondary px-3 py-1.5 text-xs"><Copy className="h-3.5 w-3.5" /> {copied ? (en ? "Copied" : "Tersalin") : (en ? "Copy" : "Salin")}</button>
              </div>
              <p className="mt-2 text-sm">{en ? "Amount" : "Nominal"}: <b>{rupiah(pay.amount)}</b>{pay.expires_at && <span className="text-mute"> · {en ? "open until" : "berlaku sampai"} {formatDateTime(pay.expires_at, locale)} WIB</span>}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-ink/80">
                <li>{en ? `In ${label(pay.va_bank)} m-banking, internet banking or an ATM, choose Transfer → Virtual Account.` : `Di m-banking, internet banking, atau ATM ${label(pay.va_bank)}, pilih Transfer → Virtual Account.`}</li>
                <li>{en ? `From another bank: an interbank transfer to ${label(pay.va_bank)} with this number as the account.` : `Dari bank lain: transfer antarbank ke ${label(pay.va_bank)} dengan nomor ini sebagai rekening tujuan.`}</li>
                <li>{en ? "Transfer the exact amount. This page confirms it by itself." : "Transfer tepat sejumlah nominal. Halaman ini mengonfirmasinya sendiri."}</li>
              </ol>
              {pay.demo && <button type="button" onClick={simulate} className="btn-outline mt-3 py-2 text-xs">{en ? "Simulate transfer (demo)" : "Simulasikan transfer (demo)"}</button>}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-mute" aria-live="polite"><Loader2 className="h-3 w-3 animate-spin" />{en ? "Waiting for the transfer…" : "Menunggu transfer…"}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
