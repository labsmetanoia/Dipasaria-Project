"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { nowJakarta, parseTime, addDays, formatDate } from "@/lib/format";

export function CutoffBar({ cutoff }: { cutoff: string }) {
  const [now, setNow] = useState(() => nowJakarta());
  useEffect(() => {
    const t = setInterval(() => setNow(nowJakarta()), 30_000);
    return () => clearInterval(t);
  }, []);
  const remaining = parseTime(cutoff) - now.minutesOfDay;
  const before = remaining > 0;
  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  const nextDate = before ? addDays(now.date, 1) : addDays(now.date, 2);
  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-1.5 text-center text-[12.5px] font-medium ${before ? "bg-coral-500 text-white" : "bg-ocean-800 text-white/90"}`}>
      <Clock className="h-3.5 w-3.5" />
      {before ? (
        <span>Pesan dalam <b>{h > 0 ? `${h} jam ` : ""}{m} menit</b> untuk pengiriman besok, {formatDate(nextDate, "weekday")}</span>
      ) : (
        <span>Batas pesan {cutoff} WIB terlewati · pengiriman terdekat {formatDate(nextDate, "weekday")}</span>
      )}
    </div>
  );
}
