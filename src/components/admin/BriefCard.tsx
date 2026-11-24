"use client";
// The owner's morning brief on the dashboard: the same text the 02.00 job sends to the alert chat, to read here or
// send again now.
import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { sendBriefAction } from "@/actions/admin";

export function BriefCard({ date, text, attention, configured }: { date: string; text: string; attention: number; configured: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <details className="card p-4 text-sm" open={attention > 0}>
      <summary className="cursor-pointer font-semibold text-ocean-900">Ringkasan pagi {attention > 0 ? <span className="ml-1 bg-coral-50 px-2 py-0.5 text-xs text-gold-ink">{attention} hal perlu perhatian</span> : <span className="ml-1 text-xs font-normal text-mute">semua beres</span>}</summary>
      <p className="mt-2 text-xs text-mute">{configured ? "Dikirim otomatis setiap hari pukul 02.00 WIB ke chat peringatan Anda." : "Belum dikirim otomatis: chat peringatan (ALERT_WEBHOOK_URL) belum diatur. Isinya tetap bisa dibaca di sini."}</p>
      <pre className="mt-3 whitespace-pre-wrap border border-line bg-sand-50 p-3 font-sans text-[13px] leading-relaxed">{text}</pre>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending || !configured} onClick={() => start(async () => { const r = await sendBriefAction(date); setMsg(r.ok ? "Terkirim ke chat." : r.error); })} className="btn-secondary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim ke chat sekarang</button>
        {msg && <span className="text-xs" role="status">{msg}</span>}
      </div>
    </details>
  );
}
