// The owner's morning brief: one message, sent at 02.00 WIB to the alert chat (ALERT_WEBHOOK_URL), with the day's
// exceptions before the auction. It only reads: today's orders and buying list, standing orders and weekly boxes
// that failed, guarantee reports and low ratings waiting, receivables past due, WhatsApp messages waiting to be sent
// by hand, unresolved errors, and yesterday's real margin and shrinkage from the buying log.
import type { Repo } from "./data/repo";
import { addDays, formatDate, nowJakarta, rupiah } from "./format";
import { SITE_URL, UNIT_LABEL } from "./config";
import { buildLedger } from "./receivables";
import { dayCost } from "./daycost";
import { campaignState, campaignSummary, dayRange } from "./campaigns";

/** Telegram accepts 4096 characters per message; the brief stays well under it. */
const MAX_CHARS = 3500;
const BUY_LINES = 10;

const juta = (n: number) => (Math.abs(n) >= 1_000_000 ? `Rp${(n / 1_000_000).toFixed(1).replace(".", ",")} juta` : rupiah(n));
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
const qty = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

export interface Brief { date: string; text: string; attention: number }

/** Build the brief for the deliveries of `date` (normally today, Jakarta time). */
export async function buildBrief(repo: Repo, date: string, now: Date = new Date()): Promise<Brief> {
  const yesterday = addDays(date, -1);
  const since24h = new Date(now.getTime() - 86400_000).toISOString().slice(0, 10);
  const [summary, orders, lines, runs, runsNext, runsBox, standing, accounts, customers, claims, ratings, receivables, wa, errors, yOrders, yPurchases, ySummary] = await Promise.all([
    repo.dailySummary(date), repo.listOrders({ date }), repo.buyingList(date),
    repo.listStandingRuns({ date }), repo.listStandingRuns({ date: addDays(date, 1) }), repo.listStandingRuns({ date: addDays(date, 2) }),
    repo.listStandingOrders(), repo.listAccounts(), repo.listCustomers(5000),
    repo.listClaims({ status: "open", limit: 100 }), repo.listRatings({ since: since24h, limit: 200 }),
    repo.listReceivables(), repo.listWaRecent(200, ["manual"]), repo.listErrors({ limit: 50 }).catch(() => []),
    repo.listOrders({ date: yesterday }), repo.listPurchases({ date: yesterday }), repo.dailySummary(yesterday),
  ]);
  const live = orders.filter((o) => o.status !== "cancelled");
  // seasonal pre-orders still taking orders or still to deliver: what is sold, what is paid
  const [campaigns, products, settings] = await Promise.all([repo.getCampaigns(), repo.getProducts(), repo.getSettings()]);
  const jnow = nowJakarta(now);
  const seasons = campaigns.filter((c) => ["open", "closed"].includes(campaignState(c, jnow, settings.cutoff_time)));
  const seasonOrders = await Promise.all(seasons.map((c) => repo.listOrders({ campaignId: c.id, limit: 5000 })));
  const out: string[] = [];
  out.push(`Ringkasan pagi · ${formatDate(date, "long")}`);

  // ---------- today's deliveries ----------
  if (!live.length) out.push("Tidak ada pengiriman hari ini.");
  else {
    const households = live.filter((o) => o.segment === "retail").length;
    out.push(`Pengiriman: ${live.length} pesanan · ${juta(summary.sales)} (${households} rumah tangga, ${live.length - households} restoran)`);
    // only money that should arrive before delivery: tempo is billed later and COD is collected at the door
    const prepaidDue = live.filter((o) => (o.payment_method === "qris" || o.payment_method === "transfer") && (o.payment_status === "unpaid" || o.payment_status === "awaiting_confirmation")).reduce((s, o) => s + (o.total_final ?? o.total_est), 0);
    const cod = live.filter((o) => o.payment_method === "cod" && o.payment_status !== "paid").reduce((s, o) => s + (o.total_final ?? o.total_est), 0);
    const gifts = live.filter((o) => o.gift_message !== null && o.gift_message !== undefined).length;
    const facts = [
      summary.to_weigh ? `perlu ditimbang ${summary.to_weigh}` : "",
      prepaidDue ? `QRIS/transfer belum dibayar ${juta(prepaidDue)}` : "",
      cod ? `COD ditagih ${juta(cod)}` : "",
      gifts ? `${gifts} hadiah (tanpa nota harga)` : "",
    ].filter(Boolean);
    if (facts.length) out.push(facts.join(" · "));
  }

  // ---------- seasonal pre-orders ----------
  seasons.forEach((c, i) => {
    const sum = campaignSummary(seasonOrders[i], new Set(products.filter((p) => p.campaign_id === c.id).map((p) => p.id)));
    const open = campaignState(c, jnow, settings.cutoff_time) === "open";
    out.push(`Pre-order ${c.name}: ${sum.orders} pesanan (${sum.paidOrders} lunas/tempo) · ${juta(sum.paidSales)} pasti · ${open ? `tutup ${formatDate(c.order_by, "short")}` : "sudah ditutup"}, kirim ${dayRange(c.deliver_from, c.deliver_to)}`);
  });

  // ---------- buying list, fresh first ----------
  if (lines.length) {
    const order = { chilled: 0, frozen: 1, ambient: 2 } as const;
    const sorted = [...lines].sort((a, b) => order[a.storage_class] - order[b.storage_class] || b.qty_with_buffer - a.qty_with_buffer);
    const fresh = lines.filter((l) => l.storage_class === "chilled").length;
    out.push("", `Belanja subuh (${lines.length} baris, ${fresh} segar):`);
    for (const l of sorted.slice(0, BUY_LINES)) out.push(`• ${l.product_name} ${l.variant_label}: ${qty(l.qty_with_buffer)} ${UNIT_LABEL[l.unit] ?? l.unit}${l.prep_notes.length ? ` (${l.prep_notes.length} catatan penyiapan)` : ""}`);
    if (lines.length > BUY_LINES) out.push(`• dan ${lines.length - BUY_LINES} baris lain`);
    out.push(`${SITE_URL}/admin/belanja-subuh?date=${date}`);
  }

  // ---------- what needs attention ----------
  const attention: string[] = [];
  const failed = [...runs, ...runsNext, ...runsBox].filter((r) => r.error && !r.order_id);
  if (failed.length) {
    const label = (soId: string) => {
      const so = standing.find((s) => s.id === soId);
      if (!so) return "pesanan rutin";
      if (so.customer_id) { const c = customers.find((x) => x.id === so.customer_id); return `kotak ${c?.name || (c ? `+${c.phone}` : "rumah tangga")}`; }
      return accounts.find((a) => a.id === so.account_id)?.business_name ?? "restoran";
    };
    attention.push(`${failed.length} pesanan rutin/kotak gagal dibuat: ${failed.slice(0, 3).map((r) => `${label(r.standing_order_id)} (${formatDate(r.delivery_date, "short")}): ${(r.error ?? "").slice(0, 90)}`).join("; ")}`);
  }
  if (claims.length) attention.push(`${claims.length} laporan garansi menunggu keputusan`);
  // money received for cancelled orders, not yet given back (closed by recording the refund on the order)
  const refundDue = (await repo.listOrders({ status: "cancelled", limit: 500 })).filter((o) => o.payment_status === "refund_due");
  if (refundDue.length) attention.push(`${refundDue.length} pesanan menunggu pengembalian dana: ${refundDue.slice(0, 3).map((o) => o.code).join(", ")}`);
  const low = ratings.filter((r) => r.stars <= 2 && r.created_at >= new Date(now.getTime() - 86400_000).toISOString());
  if (low.length) attention.push(`${low.length} penilaian rendah dalam 24 jam: ${low.slice(0, 2).map((r) => `${r.order_code ?? ""} ${r.stars}★${r.comment ? ` “${r.comment.slice(0, 60)}”` : ""}`).join("; ")}`);
  const overdue = accounts.map((a) => ({ a, l: buildLedger(a, receivables.orders, receivables.payments, receivables.allocations, date) })).filter((x) => x.l.overdue > 0);
  if (overdue.length) attention.push(`Piutang lewat jatuh tempo ${juta(overdue.reduce((s, x) => s + x.l.overdue, 0))}: ${overdue.slice(0, 3).map((x) => x.a.business_name).join(", ")}`);
  if (wa.length) attention.push(`${wa.length} pesan WhatsApp menunggu dikirim manual`);
  if (errors.length) attention.push(`${errors.length} jenis error belum ditangani (lihat Sistem)`);
  out.push("", attention.length ? "Perlu perhatian:" : "Tidak ada yang perlu ditindaklanjuti.");
  for (const a of attention) out.push(`• ${a}`);

  // ---------- yesterday ----------
  if (yOrders.some((o) => o.status !== "cancelled")) {
    const names = new Map(yOrders.flatMap((o) => o.items).map((i) => [i.product_id, i.product_name]));
    const c = dayCost(yOrders, yPurchases, ySummary, (pid) => names.get(pid) ?? pid);
    const logged = yPurchases.some((p) => p.kind === "purchase");
    const parts = [`penjualan ${juta(c.net)}`, c.marginPct === null ? "" : `margin kotor ${pct(c.marginPct)}${logged ? "" : " (modal perkiraan; pembelian belum dicatat)"}`];
    if (c.lossPct !== null) {
      const worst = [...c.shrink].sort((a, b) => b.lossValue - a.lossValue)[0];
      parts.push(`susut ${pct(c.lossPct)}${worst && worst.lossValue > 0 ? ` (terbesar: ${worst.name})` : ""}`);
    }
    out.push("", `Kemarin (${formatDate(yesterday, "short")}): ${parts.filter(Boolean).join(" · ")}`);
  }

  let text = out.join("\n");
  if (text.length > MAX_CHARS) text = `${text.slice(0, MAX_CHARS - 40)}\n… (selengkapnya di ${SITE_URL}/admin)`;
  return { date, text, attention: attention.length };
}
