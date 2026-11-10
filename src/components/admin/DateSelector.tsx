"use client";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDate, nowJakarta, relativeDayLabel } from "@/lib/format";

export function DateSelector({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (d: string) => router.push(`${pathname}?date=${d}`);
  const today = nowJakarta().date;
  return (
    <div className="no-print inline-flex items-center gap-1 border border-line bg-white p-1">
      <button onClick={() => go(addDays(date, -1))} className="p-1.5 hover:bg-sand-100" aria-label="Hari sebelumnya"><ChevronLeft className="h-4 w-4" /></button>
      <label className="relative px-2 text-sm font-semibold text-ocean-900">
        {relativeDayLabel(date, today)} <span className="font-normal text-mute">· {formatDate(date, "short")}</span>
        <input type="date" value={date} onChange={(e) => e.target.value && go(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pilih tanggal" />
      </label>
      <button onClick={() => go(addDays(date, 1))} className="p-1.5 hover:bg-sand-100" aria-label="Hari berikutnya"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}
