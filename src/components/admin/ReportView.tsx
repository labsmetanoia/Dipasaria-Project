"use client";
import { Download } from "lucide-react";
import type { SalesRow } from "@/lib/data/repo";
import { formatDate, rupiah } from "@/lib/format";

export function ReportView({ rows, from, to }: { rows: SalesRow[]; from: string; to: string }) {
  const tot = rows.reduce((a, r) => ({ orders: a.orders + r.orders, sales: a.sales + r.sales, gp: a.gp + r.gross_profit, ns: a.ns + r.non_seafood_sales }), { orders: 0, sales: 0, gp: 0, ns: 0 });
  const max = Math.max(1, ...rows.map((r) => r.sales));
  const csv = () => {
    const head = "tanggal,pesanan,penjualan,laba_kotor,non_seafood\n";
    const body = rows.map((r) => [r.date, r.orders, r.sales, r.gross_profit, r.non_seafood_sales].join(",")).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `dipasaria-penjualan-${from}-${to}.csv`; a.click();
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Pesanan", String(tot.orders)], ["Penjualan", rupiah(tot.sales, { compact: true })], ["Laba kotor", `${rupiah(tot.gp, { compact: true })} · ${tot.sales ? ((tot.gp / tot.sales) * 100).toFixed(1) : 0}%`], ["Non-seafood", `${tot.sales ? ((tot.ns / tot.sales) * 100).toFixed(0) : 0}%`]].map(([k, v]) => (
          <div key={k} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-mute">{k}</p><p className="mt-1 font-display text-xl font-semibold text-ocean-900">{v}</p></div>
        ))}
      </div>
      <div className="card p-5">
        <div className="flex items-center justify-between"><h2 className="font-semibold text-ocean-900">Penjualan per hari pengiriman</h2><button onClick={csv} className="btn-secondary px-3 py-1.5 text-xs"><Download className="h-3.5 w-3.5" /> CSV untuk akuntan</button></div>
        {rows.length === 0 ? <p className="mt-4 text-sm text-mute">Belum ada pesanan pada rentang ini.</p> : (
          <>
            <div className="mt-4 flex h-40 items-end gap-1">
              {rows.map((r) => (
                <div key={r.date} className="group relative flex-1">
                  <div className="w-full rounded-t bg-tide-500 transition group-hover:bg-ocean-900" style={{ height: `${Math.max(2, (r.sales / max) * 150)}px` }} />
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[10px] text-white group-hover:block">{formatDate(r.date, "short")}: {rupiah(r.sales)}</div>
                </div>
              ))}
            </div>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs text-mute"><tr><th className="py-1 font-medium">Tanggal</th><th className="py-1 text-right font-medium">Pesanan</th><th className="py-1 text-right font-medium">Penjualan</th><th className="py-1 text-right font-medium">Laba kotor</th><th className="py-1 text-right font-medium">Margin</th><th className="py-1 text-right font-medium">Non-seafood</th></tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.date}><td className="py-1.5">{formatDate(r.date, "weekday")}</td><td className="py-1.5 text-right">{r.orders}</td><td className="py-1.5 text-right">{rupiah(r.sales)}</td><td className="py-1.5 text-right">{rupiah(r.gross_profit)}</td><td className={`py-1.5 text-right ${r.sales && r.gross_profit / r.sales < 0.1 ? "text-gold-ink" : ""}`}>{r.sales ? ((r.gross_profit / r.sales) * 100).toFixed(1) : 0}%</td><td className="py-1.5 text-right">{r.sales ? ((r.non_seafood_sales / r.sales) * 100).toFixed(0) : 0}%</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
