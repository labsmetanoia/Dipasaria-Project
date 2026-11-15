"use client";
// Household sign-in: phone number → 6-digit code on WhatsApp → signed in for 90 days on this device.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { requestLoginCodeAction, verifyLoginCodeAction } from "@/actions/customer";
import { Field } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { Turnstile, useTurnstileOn } from "@/components/Turnstile";

export function CustomerLogin({ next, available }: { next?: string; available: boolean }) {
  const { locale } = useT();
  const en = locale === "en";
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [pending, start] = useTransition();
  const turnstileOn = useTurnstileOn();
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = () => start(async () => {
    setErr(null);
    const r = await requestLoginCodeAction(phone, { turnstileToken: tsToken });
    setTsReset((n) => n + 1);
    if (!r.ok) { setErr(r.error); return; }
    setSentTo(r.data.phone); setDemoCode(r.data.demoCode ?? null); setCode(""); setWait(60);
  });
  const verify = () => start(async () => {
    setErr(null);
    const r = await verifyLoginCodeAction(sentTo ?? phone, code);
    if (!r.ok) { setErr(r.error); return; }
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/akun");
    router.refresh();
  });

  if (!available) {
    return <div className="card p-5"><h2 className="font-bold text-ocean-950">{en ? "Household account" : "Akun rumah tangga"}</h2><p className="mt-1 text-sm text-mute">{en ? "Sign-in with WhatsApp is not available yet. You can keep ordering as a guest; your details are remembered on this device." : "Masuk dengan WhatsApp belum tersedia. Anda tetap bisa memesan sebagai tamu; data Anda diingat di perangkat ini."}</p></div>;
  }
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-ocean-950"><MessageCircle className="h-5 w-5 text-coral-500" /><h2 className="font-bold">{en ? "Sign in with WhatsApp" : "Masuk dengan WhatsApp"}</h2></div>
      <p className="mt-1 text-sm text-mute">{en ? "See all your orders, reorder in one tap and keep your delivery addresses. No password: we send a 6-digit code to your WhatsApp." : "Lihat semua pesanan, pesan ulang sekali ketuk, dan simpan alamat pengiriman. Tanpa kata sandi: kami kirim kode 6 angka ke WhatsApp Anda."}</p>
      {!sentTo ? (
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <Field label={en ? "WhatsApp number" : "Nomor WhatsApp"}><input className="input" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx xxxx xxxx" required /></Field>
          <Turnstile action="otp" onToken={setTsToken} resetKey={tsReset} />
          {err && <p className="text-sm text-gold-ink" role="alert">{err}</p>}
          <button className="btn-primary w-full" disabled={pending || (turnstileOn && !tsToken)}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : en ? "Send code" : "Kirim kode"}</button>
        </form>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <p className="text-sm">{en ? "Code sent to WhatsApp" : "Kode dikirim ke WhatsApp"} <b>+{sentTo}</b>. <button type="button" className="font-semibold text-gold-ink" onClick={() => { setSentTo(null); setErr(null); }}>{en ? "Change number" : "Ganti nomor"}</button></p>
          {demoCode && <p className="bg-warn-50 px-3 py-2 text-xs text-warn-600">{en ? "Demo mode: no WhatsApp is sent. Your code is" : "Mode demo: WhatsApp tidak dikirim. Kode Anda"} <b className="font-mono text-sm">{demoCode}</b></p>}
          <Field label={en ? "6-digit code" : "Kode 6 angka"}><input className="input text-center font-mono text-lg tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus /></Field>
          {err && <p className="text-sm text-gold-ink" role="alert">{err}</p>}
          <button className="btn-primary w-full" disabled={pending || code.length !== 6}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : en ? "Sign in" : "Masuk"}</button>
          <button type="button" onClick={send} disabled={pending || wait > 0} className="w-full text-center text-sm font-semibold text-gold-ink disabled:text-mute">{wait > 0 ? (en ? `Resend code in ${wait}s` : `Kirim ulang kode dalam ${wait} detik`) : en ? "Resend code" : "Kirim ulang kode"}</button>
        </form>
      )}
    </div>
  );
}
