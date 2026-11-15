"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, RotateCcw } from "lucide-react";
import type { WaMessage } from "@/lib/types";
import { TEMPLATES } from "@/lib/notify/templates";
import { formatDateTime, waLink } from "@/lib/format";
import { markWaSentAction, resendWaAction } from "@/actions/admin";

const STATUS: Record<WaMessage["status"], [string, string]> = {
  sent: ["Terkirim", "bg-success-50 text-success-600"],
  queued: ["Dalam antrean", "bg-sand-100 text-ink/70"],
  sending: ["Sedang dikirim", "bg-sand-100 text-ink/70"],
  failed: ["Gagal", "bg-coral-50 text-gold-ink"],
  manual: ["Kirim manual", "bg-warn-50 text-warn-600"],
  skipped: ["Dilewati", "bg-sand-100 text-ink/70"],
};

/** Automatic WhatsApp messages with their status; manual and failed ones can be sent from here with one tap. */
export function WaList({ messages, apiEnabled, showOrder = false, empty }: { messages: WaMessage[]; apiEnabled: boolean; showOrder?: boolean; empty: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  if (!messages.length) return <p className="text-sm text-mute">{empty}</p>;
  return (
    <div>
      {err && <p className="mb-2 text-sm text-gold-ink">{err}</p>}
      <ul className="divide-y divide-line">
        {messages.map((m) => {
          const [label, tone] = STATUS[m.status];
          const code = m.body.match(/DP-\d{6}-[A-Z0-9]{4}/)?.[0];
          return (
            <li key={m.id} className="py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{TEMPLATES[m.kind].label}{showOrder && code ? <> · <Link href={`/admin/pesanan/${m.order_id}`} className="text-gold-ink">{code}</Link></> : null}</span>
                <span className="flex items-center gap-2 text-xs text-mute">{formatDateTime(m.sent_at ?? m.created_at)} <span className={`px-1.5 py-0.5 font-semibold ${tone}`}>{label}{m.status === "sent" && m.provider_id === "manual" ? " (manual)" : ""}</span></span>
              </div>
              <details className="mt-1"><summary className="cursor-pointer text-xs text-mute">Isi pesan</summary><p className="mt-1 whitespace-pre-line bg-sand-100 p-2 text-xs">{m.body}</p></details>
              {m.error && <p className="mt-1 text-xs text-gold-ink">{m.error}</p>}
              {(m.status === "manual" || m.status === "failed") && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <a href={waLink(m.phone, m.body)} target="_blank" rel="noreferrer" onClick={() => start(async () => { await markWaSentAction(m.id); router.refresh(); })} className="btn-secondary py-1.5 text-xs"><MessageCircle className="h-3.5 w-3.5" /> Kirim via WhatsApp</a>
                  {m.status === "failed" && apiEnabled && <button disabled={pending} onClick={() => start(async () => { setErr(null); const r = await resendWaAction(m.id); if (!r.ok) setErr(r.error); router.refresh(); })} className="btn-secondary py-1.5 text-xs">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Kirim ulang</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
