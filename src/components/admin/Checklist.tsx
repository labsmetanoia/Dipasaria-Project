"use client";
import { useState } from "react";

/** Tick-off list kept in this browser only (the dawn buying list on the owner's phone). */
export function CheckRow({ id, children }: { id: string; children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  return (
    <label className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${done ? "bg-success-50/60" : ""}`}>
      <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className="mt-1 h-5 w-5 accent-tide-600 no-print" id={id} />
      <div className={`flex-1 ${done ? "line-through opacity-60" : ""}`}>{children}</div>
    </label>
  );
}
