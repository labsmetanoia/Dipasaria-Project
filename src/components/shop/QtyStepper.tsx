"use client";
import { Minus, Plus } from "lucide-react";

export function QtyStepper({ value, min, step, onChange, unit, size = "md" }: { value: number; min: number; step: number; onChange: (v: number) => void; unit: string; size?: "sm" | "md" }) {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString("id-ID", { maximumFractionDigits: 2 }));
  const dec = () => onChange(Math.max(0, Math.round((value - step) * 1000) / 1000));
  const inc = () => onChange(Math.round((value + step) * 1000) / 1000);
  const btn = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-white">
      <button type="button" onClick={dec} className={`${btn} flex items-center justify-center rounded-l-xl text-ocean-900 hover:bg-sand-100`} aria-label="Kurangi"><Minus className="h-4 w-4" /></button>
      <span className={`min-w-[4.5rem] text-center font-semibold ${size === "sm" ? "text-sm" : ""}`}>{fmt(value)} <span className="text-xs font-medium text-mute">{unit}</span></span>
      <button type="button" onClick={inc} className={`${btn} flex items-center justify-center rounded-r-xl text-ocean-900 hover:bg-sand-100`} aria-label="Tambah"><Plus className="h-4 w-4" /></button>
    </div>
  );
}
