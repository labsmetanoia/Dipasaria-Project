"use client";
import { useState, useTransition } from "react";
import { adminSetStandingStatusAction } from "@/actions/admin";

export function StandingStatusToggle({ id, status }: { id: string; status: "active" | "paused" }) {
  const [s, setS] = useState(status);
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { const r = await adminSetStandingStatusAction(id, s === "active" ? "paused" : "active"); if (r.ok) setS(r.data.status); })}
      className={`px-2.5 py-1 text-[11px] font-semibold ${s === "active" ? "bg-success-50 text-success-600" : "bg-sand-200 text-ink/70"}`} title="Ketuk untuk mengubah">
      {s === "active" ? "Aktif" : "Dijeda"}
    </button>
  );
}
