"use client";
import { Minus, Plus } from "lucide-react";

export function QtyStepper({ value, min, step, onChange, unit, size = "md" }: { value: number; min: number; step: number; onChange: (v: number) => void; unit: string; size?: "sm" | "md" }) {
 const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString("id-ID", { maximumFractionDigits: 2 }));
 const btn = size === "sm" ? "h-8 w-8" : "h-11 w-11";
 return (
    <div className="inline-flex items-center border border-ocean-950 bg-white">
      <button type="button" onClick={() => onChange(Math.max(0, Math.round((value - step) * 1000) / 1000))} className={`${btn} flex items-center justify-center hover:bg-sand-100`} aria-label="Kurangi"><Minus className="h-3.5 w-3.5" /></button>
      <span className={`min-w-[4.5rem] text-center font-sans font-bold ${size === "sm" ? "text-[13px]" : "text-[15px]"}`}>{fmt(value)} <span className="text-[11px] font-semibold text-mute">{unit}</span></span>
      <button type="button" onClick={() => onChange(Math.round((value + step) * 1000) / 1000)} className={`${btn} flex items-center justify-center hover:bg-sand-100`} aria-label="Tambah"><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}
