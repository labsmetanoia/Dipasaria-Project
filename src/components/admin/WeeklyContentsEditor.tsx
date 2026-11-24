"use client";
// Belanja subuh: write this week's contents of each trader's-pick box after seeing the auction. Customers see the text
// on the product page and in their weekly box; the packer sees it on the route sheet.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setWeeklyContentsAction } from "@/actions/admin";

export function WeeklyContentsEditor({ productId, name, ordered, text, textEn, updated }: { productId: string; name: string; ordered: string; text: string; textEn: string; updated: string | null }) {
  const [id, setId] = useState(text);
  const [en, setEn] = useState(textEn);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-2">
      <p className="font-semibold">{name} <span className="font-normal text-mute">· {ordered}{updated ? ` · diperbarui ${updated}` : " · belum diisi"}</span></p>
      <label className="block text-xs font-semibold">Isi minggu ini (dilihat pelanggan)<textarea className="input mt-1 min-h-16" maxLength={400} value={id} onChange={(e) => setId(e.target.value)} placeholder="mis. Kakap merah 1 ekor (±700 g, disiangi), udang windu 500 g, cumi 400 g" /></label>
      <label className="block text-xs font-semibold">Dalam bahasa Inggris (opsional)<textarea className="input mt-1 min-h-12" maxLength={400} value={en} onChange={(e) => setEn(e.target.value)} /></label>
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending} className="btn-secondary" onClick={() => start(async () => { const r = await setWeeklyContentsAction(productId, id, en); setMsg(r.ok ? "Tersimpan. Pelanggan melihat isi ini sekarang." : r.error); if (r.ok) router.refresh(); })}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan isi minggu ini</button>
        {msg && <span className="text-xs" role="status">{msg}</span>}
      </div>
    </div>
  );
}
