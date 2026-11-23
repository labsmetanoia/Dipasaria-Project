"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { resolveClaimAction } from "@/actions/admin";

/** Decide a guarantee report: replace on the next delivery, refund an amount, or decline with a reason. The customer gets a WhatsApp. */
export function ClaimDecision({ id, suggestedRefund }: { id: string; suggestedRefund: number }) {
  const [status, setStatus] = useState<"replace" | "refund" | "declined">("replace");
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState(String(suggestedRefund || ""));
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      <div className="flex flex-wrap gap-2 text-sm">
        {([["replace", "Ganti di pengiriman berikutnya"], ["refund", "Kembalikan dana"], ["declined", "Tolak"]] as const).map(([k, label]) => (
          <label key={k} className={`flex cursor-pointer items-center gap-1.5 border px-2.5 py-1.5 ${status === k ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}><input type="radio" name={`d-${id}`} checked={status === k} onChange={() => setStatus(k)} className="accent-ocean-950" />{label}</label>
        ))}
      </div>
      {status === "refund" && <label className="block text-xs font-semibold">Jumlah dikembalikan (Rp)<input className="input mt-1 py-2 text-sm" inputMode="numeric" value={refund} onChange={(e) => setRefund(e.target.value.replace(/[^\d]/g, ""))} /></label>}
      <input className="input py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={status === "declined" ? "Alasan untuk pelanggan (wajib)" : "Pesan untuk pelanggan (opsional)"} aria-label="Pesan untuk pelanggan" />
      {err && <p className="text-xs text-gold-ink" role="alert">{err}</p>}
      <button disabled={pending} onClick={() => start(async () => { setErr(null); const r = await resolveClaimAction(id, status, note, status === "refund" ? Number(refund) : null); if (!r.ok) setErr(r.error); else router.refresh(); })} className="btn-primary py-2 text-xs">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan keputusan dan kabari pelanggan"}</button>
    </div>
  );
}
