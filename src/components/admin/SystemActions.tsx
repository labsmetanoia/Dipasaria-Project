"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { resolveErrorsAction, runExpiryNowAction } from "@/actions/admin";

export function ResolveButton({ fingerprints, label }: { fingerprints: string[] | "all"; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button disabled={pending} onClick={() => start(async () => { await resolveErrorsAction(fingerprints); router.refresh(); })} className="btn-secondary py-1.5 text-xs">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
    </button>
  );
}

export function SystemActions() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="mt-3">
      <button disabled={pending} onClick={() => start(async () => { const r = await runExpiryNowAction(); setMsg(r.ok ? `${r.data} pesanan dibatalkan otomatis.` : r.error); router.refresh(); })} className="btn-secondary py-1.5 text-xs">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Jalankan pembatalan otomatis sekarang"}
      </button>
      {msg && <p className="mt-2 text-xs text-mute" aria-live="polite">{msg}</p>}
    </div>
  );
}
