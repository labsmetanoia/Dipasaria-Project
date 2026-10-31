"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { nowJakarta, parseTime, addDays, formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/dict";

export function CutoffBar({ cutoff }: { cutoff: string }) {
  const { t, locale } = useT();
  const [now, setNow] = useState(() => nowJakarta());
  useEffect(() => {
    const id = setInterval(() => setNow(nowJakarta()), 30_000);
    return () => clearInterval(id);
  }, []);
  const remaining = parseTime(cutoff) - now.minutesOfDay;
  const before = remaining > 0;
  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  const nextDate = formatDate(before ? addDays(now.date, 1) : addDays(now.date, 2), "weekday", locale);
  const time = `${h > 0 ? `${h} ${t.shop.hours} ` : ""}${m} ${t.shop.minutes}`;
  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-1.5 text-center text-[12.5px] font-semibold ${before ? "bg-coral-500 text-white" : "bg-ocean-800 text-white/90"}`}>
      <Clock className="h-3.5 w-3.5" />
      <span>{before ? fmt(t.shop.cutoffBefore, { time, date: nextDate }) : fmt(t.shop.cutoffAfter, { cutoff, date: nextDate })}</span>
    </div>
  );
}
