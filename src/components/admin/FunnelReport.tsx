// Visit funnel for the reports page: how many visits reached each step, and which products are looked at but not
// added to the cart. Counts are anonymous daily totals (see src/components/Track.tsx).
import type { FunnelEvent, FunnelRow, Product } from "@/lib/types";

const STEPS: Array<[FunnelEvent, string, string]> = [
  ["visit", "Kunjungan", "membuka toko"],
  ["product_view", "Melihat produk", "membuka halaman produk"],
  ["add_to_cart", "Menambah ke keranjang", "menambah minimal satu produk"],
  ["checkout_start", "Mulai checkout", "membuka halaman pengiriman dan pembayaran"],
  ["order_placed", "Pesanan dibuat", "sampai ke halaman pesanan diterima"],
];
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(a / b < 0.1 ? 1 : 0).replace(".", ",")}%` : "—");

export function FunnelReport({ rows, products }: { rows: FunnelRow[]; products: Product[] }) {
  const total = (e: FunnelEvent) => rows.filter((r) => r.event === e && r.product_id === "").reduce((s, r) => s + r.n, 0);
  const counts = STEPS.map(([e]) => total(e));
  const top = Math.max(1, ...counts);
  const per = new Map<string, { views: number; adds: number }>();
  for (const r of rows) {
    if (!r.product_id || (r.event !== "product_view" && r.event !== "add_to_cart")) continue;
    const x = per.get(r.product_id) ?? { views: 0, adds: 0 };
    if (r.event === "product_view") x.views += r.n; else x.adds += r.n;
    per.set(r.product_id, x);
  }
  const list = [...per.entries()].map(([id, x]) => ({ id, name: products.find((p) => p.id === id)?.name ?? id, ...x })).sort((a, b) => b.views - a.views || b.adds - a.adds).slice(0, 10);
  // the biggest drop between two consecutive steps is where to look first
  let worst = -1, worstRate = 1;
  for (let i = 1; i < counts.length; i++) if (counts[i - 1] >= 20) { const rate = counts[i] / counts[i - 1]; if (rate < worstRate) { worstRate = rate; worst = i; } }
  return (
    <section className="card p-5 text-sm" aria-labelledby="corong">
      <h2 id="corong" className="text-ocean-900">Corong kunjungan</h2>
      <p className="mt-1 text-xs text-mute">Dari setiap kunjungan ke toko, berapa yang sampai ke tiap langkah. Dihitung sekali per kunjungan, tanpa cookie dan tanpa data pribadi; kunjungan Anda sendiri saat masuk sebagai pengelola dan mesin perayap tidak dihitung.</p>
      {counts[0] === 0 && counts[4] === 0 ? <p className="mt-3 text-mute">Belum ada kunjungan tercatat pada periode ini.</p> : (
        <>
          <ol className="mt-4 space-y-2">
            {STEPS.map(([e, label, hint], i) => (
              <li key={e} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3">
                <span><b>{label}</b><span className="block text-[11px] text-mute">{hint}</span></span>
                <span className="h-5 bg-sand-100" aria-hidden><span className={`block h-5 ${i === worst ? "bg-coral-500" : "bg-ocean-950"}`} style={{ width: `${Math.max(counts[i] ? 2 : 0, (counts[i] / top) * 100)}%` }} /></span>
                <span className="w-28 text-right tabular-nums"><b>{counts[i].toLocaleString("id-ID")}</b>{i > 0 && <span className="block text-[11px] text-mute">{pct(counts[i], counts[i - 1])} dari langkah sebelumnya</span>}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs">Dari kunjungan menjadi pesanan: <b>{pct(counts[4], counts[0])}</b>.{worst > 0 && <> Penurunan terbesar: dari “{STEPS[worst - 1][1]}” ke “{STEPS[worst][1]}” ({pct(counts[worst], counts[worst - 1])}).</>}</p>
          {list.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs">
                <thead><tr className="border-b border-line text-left text-mute"><th className="py-1.5 pr-2 font-semibold">Produk paling sering dilihat</th><th className="py-1.5 pr-2 text-right font-semibold">Dilihat</th><th className="py-1.5 pr-2 text-right font-semibold">Masuk keranjang</th><th className="py-1.5 text-right font-semibold">Rasio</th></tr></thead>
                <tbody>
                  {list.map((x) => { const low = x.views >= 20 && x.adds / x.views < 0.1; return (
                    <tr key={x.id} className="border-b border-line"><td className="py-1.5 pr-2">{x.name}{low && <span className="block text-[11px] text-gold-ink">Sering dilihat, jarang dibeli: periksa harga, foto, atau ketersediaannya.</span>}</td><td className="py-1.5 pr-2 text-right tabular-nums">{x.views}</td><td className="py-1.5 pr-2 text-right tabular-nums">{x.adds}</td><td className={`py-1.5 text-right tabular-nums ${low ? "font-semibold text-gold-ink" : ""}`}>{pct(x.adds, x.views)}</td></tr>); })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
