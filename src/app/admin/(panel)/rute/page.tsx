import { safeMapsUrl } from "@/lib/orderRules";
import { requireAdmin } from "@/lib/auth";
import { expireIfDue } from "@/lib/expiry";
import Link from "next/link";
import { MessageCircle, ExternalLink } from "lucide-react";
import { getRepo } from "@/lib/data";
import { pickDate } from "@/lib/ops";
import { DateSelector } from "@/components/admin/DateSelector";
import { PrintButton } from "@/components/admin/PrintButton";
import { Empty, PaymentBadge, StatusBadge } from "@/components/ui";
import { formatDate, rupiah, jamRange } from "@/lib/format";
import { msgOutForDelivery, waTo } from "@/lib/wa";
import { PAYMENT_LABEL, UNIT_LABEL } from "@/lib/config";
import { DeliveryActions } from "@/components/admin/DeliveryActions";

const SUBST: Record<string, string> = { similar: "Bila kosong: ganti sejenis", contact: "Bila kosong: hubungi dulu", remove: "Bila kosong: hapus saja" };

export default async function RoutePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  await expireIfDue("wait"); // unpaid orders past their deadline must not reach the buying list or the route
  const { date: dp } = await searchParams;
  const date = pickDate(dp);
  const repo = await getRepo();
  const [orders, slots, settings, products] = await Promise.all([repo.listOrders({ date }), repo.getSlots({ includeInactive: true }), repo.getSettings(), repo.getProducts()]);
  // what goes into a trader's-pick box this week, for the packer
  const boxContents = new Map(products.filter((p) => p.curated && (p.weekly_contents ?? "").trim()).map((p) => [p.id, (p.weekly_contents ?? "").trim()]));
  const live = orders.filter((o) => o.status !== "cancelled");
  const delivered = live.filter((o) => o.delivered_at);
  const codDue = live.filter((o) => o.payment_method === "cod").reduce((s, o) => s + (o.total_final ?? o.total_est), 0);
  const codIn = live.reduce((s, o) => s + (o.cod_collected ?? 0), 0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">Rute dan pengemasan</p><h1 className="text-2xl text-ocean-900">{formatDate(date, "weekday")} · {live.length} titik antar</h1></div>
        <div className="flex gap-2"><DateSelector date={date} /><PrintButton /></div>
      </div>
      {live.length > 0 && (
        <div className="no-print grid grid-cols-3 gap-2 text-center text-sm">
          <div className="card p-3"><p className="text-xs text-mute">Sudah diterima</p><p className="text-xl font-bold">{delivered.length}/{live.length}</p></div>
          <div className="card p-3"><p className="text-xs text-mute">Tunai COD diterima</p><p className="text-xl font-bold">{rupiah(codIn)}</p></div>
          <div className="card p-3"><p className="text-xs text-mute">Tagihan COD hari ini</p><p className="text-xl font-bold">{rupiah(codDue)}</p></div>
        </div>
      )}
      {live.length === 0 ? <Empty title="Tidak ada pengiriman untuk tanggal ini" /> : slots.map((s) => {
        const list = live.filter((o) => o.slot_id === s.id);
        if (!list.length) return null;
        const byArea = [...new Set(list.map((o) => o.area_name))];
        return (
          <section key={s.id}>
            <h2 className="mb-2 text-ocean-900">{jamRange(s.start_time, s.end_time)} {s.label} <span className="text-sm font-normal text-mute">· {list.length}/{s.capacity} titik antar</span></h2>
            <div className="space-y-3">
              {byArea.map((area) => (
                <div key={area}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-mute">{area}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {list.filter((o) => o.area_name === area).map((o) => {
                      const bags = { chilled: o.items.filter((i) => i.storage_class === "chilled").length, frozen: o.items.filter((i) => i.storage_class === "frozen").length, ambient: o.items.filter((i) => i.storage_class === "ambient").length };
                      const collect = (o.payment_method === "cod") && o.payment_status !== "paid";
                      return (
                        <div key={o.id} className="card p-4 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div><Link href={`/admin/pesanan/${o.id}`} className="font-semibold text-ocean-900">{o.customer_name}</Link><p className="text-xs text-mute">{o.code}</p></div>
                            <div className="flex flex-col items-end gap-1"><StatusBadge status={o.status} /><PaymentBadge status={o.payment_status} /></div>
                          </div>
                          <p className="mt-2">{o.address}</p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs">
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-tide-600">Maps <ExternalLink className="h-3 w-3" /></a>
                            {safeMapsUrl(o.maps_url) && <a href={safeMapsUrl(o.maps_url)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-tide-600">Pin pelanggan <ExternalLink className="h-3 w-3" /></a>}
                            {o.recipient_phone ? <><a href={`tel:+${o.recipient_phone}`} className="text-tide-600">Penerima +{o.recipient_phone}</a><a href={`tel:+${o.phone}`} className="text-mute">Pengirim +{o.phone}</a></> : <a href={`tel:+${o.phone}`} className="text-tide-600">+{o.phone}</a>}
                          </div>
                          {o.gift_message != null && (
                            <div className="mt-2 border-2 border-dashed border-coral-500 bg-coral-50 px-3 py-2 text-xs">
                              <p className="font-bold uppercase tracking-[0.12em] text-gold-ink">🎁 Hadiah · jangan sertakan nota atau harga</p>
                              {o.gift_message ? <p className="mt-1 text-sm">Kartu: “{o.gift_message}”{o.gift_from ? ` — ${o.gift_from}` : ""}</p> : <p className="mt-1">{o.gift_from ? `Kartu tanpa pesan, dari ${o.gift_from}.` : "Tanpa kartu ucapan."}</p>}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                            {bags.chilled > 0 && <span className="rounded-full bg-tide-100 px-2 py-0.5 text-tide-700">❄ Segar {bags.chilled} item</span>}
                            {bags.frozen > 0 && <span className="rounded-full bg-[#eaf1fb] px-2 py-0.5 text-[#2f5f9e]">🧊 Beku {bags.frozen} item</span>}
                            {bags.ambient > 0 && <span className="rounded-full bg-warn-50 px-2 py-0.5 text-warn-600">📦 Suhu ruang {bags.ambient} item</span>}
                          </div>
                          <ul className="mt-2 text-xs text-ink/80">{o.items.map((i) => <li key={i.id}>• {i.product_name} {i.variant_label} — {i.qty_final ?? i.qty_ordered} {UNIT_LABEL[i.unit]}{i.prep_label ? ` (${i.prep_label.toLowerCase()})` : ""}{boxContents.get(i.product_id) ? <span className="block pl-3 text-tide-700">isi: {boxContents.get(i.product_id)}</span> : null}</li>)}</ul>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                            <p className={`text-xs ${collect ? "font-semibold text-gold-ink" : "text-mute"}`}>{collect ? `Tagih di tempat ${rupiah(o.total_final ?? o.total_est)}` : `${PAYMENT_LABEL[o.payment_method]} · ${rupiah(o.total_final ?? o.total_est)}`}</p>
                            <a className="no-print btn-secondary px-2.5 py-1 text-xs" target="_blank" rel="noreferrer" href={waTo(o.phone, msgOutForDelivery(o, settings))}><MessageCircle className="h-3.5 w-3.5" /> WA{o.gift_message != null ? " ke pengirim" : ""}: dalam pengiriman</a>
                          </div>
                          {o.customer_note && <p className="mt-2  bg-warn-50 px-2 py-1 text-xs text-warn-600">“{o.customer_note}”</p>}
                          {o.substitution && o.substitution !== "contact" && <p className="mt-1 text-[11px] font-semibold text-tide-700">{SUBST[o.substitution]}</p>}
                          <DeliveryActions orderId={o.id} cod={o.payment_method === "cod"} due={o.total_final ?? o.total_est} deliveredAt={o.delivered_at ?? null} note={o.delivery_note ?? null}
                            blocked={o.status === "completed" ? "Selesai" : o.has_catch_weight && o.total_final === null ? "Timbang dulu sebelum diantar." : null} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
