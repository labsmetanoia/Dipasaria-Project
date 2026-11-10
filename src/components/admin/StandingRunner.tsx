"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import type { RunOutcome } from "@/lib/standing";
import { runStandingOrdersAction } from "@/actions/admin";
import { formatDate } from "@/lib/format";

const TONE: Record<RunOutcome["status"], string> = { placed: "bg-success-50 text-success-600", failed: "bg-coral-50 text-gold-ink", skipped: "bg-sand-100 text-ink/70", already: "bg-sand-100 text-ink/70" };
const LABEL: Record<RunOutcome["status"], string> = { placed: "Pesanan dibuat", failed: "Gagal", skipped: "Dilewati pelanggan", already: "Sudah diproses" };

export function StandingRunner({ defaultDate }: { defaultDate: string }) {
  const [date, setDate] = useState(defaultDate);
  const [out, setOut] = useState<RunOutcome[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="card p-5">
      <p className="font-semibold text-ocean-900">Proses pesanan rutin</p>
      <p className="mt-1 text-sm text-mute">Berjalan otomatis setiap hari pukul 19.45 WIB untuk pengiriman esok hari. Gunakan tombol ini untuk memproses lebih awal atau mengulang yang gagal; pesanan yang sudah dibuat tidak akan digandakan.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block"><span className="label">Tanggal pengiriman</span><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <button type="button" disabled={pending} onClick={() => start(async () => { setErr(null); const r = await runStandingOrdersAction(date); if (r.ok) setOut(r.data); else setErr(r.error); })} className="btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Proses untuk {formatDate(date, "short")}
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-gold-ink">{err}</p>}
      {out && (
        <ul className="mt-4 divide-y divide-line border-y border-line text-sm" aria-live="polite">
          {out.length === 0 && <li className="py-2 text-mute">Tidak ada pesanan rutin untuk tanggal ini.</li>}
          {out.map((o) => (
            <li key={o.standing_order_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-medium">{o.account_name}</span>
              <span className="flex items-center gap-2">
                {o.order_code && <Link href={`/admin/pesanan?q=${o.order_code}`} className="font-semibold text-gold-ink">{o.order_code}</Link>}
                <span className={`px-2 py-0.5 text-[11px] font-semibold ${TONE[o.status]}`}>{LABEL[o.status]}</span>
              </span>
              {o.error && <span className="w-full text-xs text-gold-ink">{o.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
