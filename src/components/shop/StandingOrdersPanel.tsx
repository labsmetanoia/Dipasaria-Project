"use client";
import { useMemo, useState, useTransition } from "react";
import { CalendarClock, Loader2, Pause, Pencil, Play, Plus, Repeat, Trash2, X } from "lucide-react";
import type { BusinessAccount, DeliverySlot, PaymentMethod, Product, StandingOrder, StandingOrderLine, StandingOrderRun } from "@/lib/types";
import { unitPrice } from "@/lib/pricing";
import { formatDate, jamRange, qtyUnit, rupiah } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { WEEKDAYS, upcomingDates } from "@/lib/standing";
import { deleteStandingOrderAction, saveStandingOrderAction, setStandingSkipAction, setStandingStatusAction } from "@/actions/shop";

interface Preset { label: string; lines: StandingOrderLine[] }
interface Draft { id?: string; name: string; weekdays: number[]; slot_id: string; payment_method: PaymentMethod; lines: StandingOrderLine[]; note: string }

export function StandingOrdersPanel({ initial, runs, products, slots, payments, account, firstDate, presets }: {
  initial: StandingOrder[]; runs: StandingOrderRun[]; products: Product[]; slots: DeliverySlot[]; payments: PaymentMethod[];
  account: BusinessAccount; firstDate: string; presets: Preset[];
}) {
  const { t, locale } = useT();
  const en = locale === "en";
  const [list, setList] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const days = WEEKDAYS[locale];

  const variantInfo = useMemo(() => {
    const m = new Map<string, { product: Product; v: Product["variants"][number] }>();
    for (const p of products) for (const v of p.variants) if (v.is_active) m.set(v.id, { product: p, v });
    return m;
  }, [products]);
  const lineLabel = (l: StandingOrderLine) => {
    const info = variantInfo.get(l.variant_id);
    if (!info) return "—";
    const prep = l.prep_option_id ? info.product.prep_options.find((o) => o.id === l.prep_option_id) : null;
    return `${en && info.product.name_en ? info.product.name_en : info.product.name} ${qtyUnit(l.qty, info.v.unit, locale)}${prep ? ` · ${pick(locale, prep.label, prep.label_en).split(" (")[0]}` : ""}`;
  };
  const estimate = (lines: StandingOrderLine[]) => lines.reduce((s, l) => {
    const info = variantInfo.get(l.variant_id);
    if (!info) return s;
    const prep = l.prep_option_id ? info.product.prep_options.find((o) => o.id === l.prep_option_id) : null;
    return s + Math.round((unitPrice(info.v, "business", account) + (prep?.surcharge ?? 0)) * l.qty);
  }, 0);
  const slotLabel = (id: string) => { const s = slots.find((x) => x.id === id); return s ? `${pick(locale, s.label, s.label)} ${jamRange(s.start_time, s.end_time)}` : "—"; };

  const replace = (so: StandingOrder) => setList((xs) => (xs.some((x) => x.id === so.id) ? xs.map((x) => (x.id === so.id ? so : x)) : [...xs, so]));
  const act = (fn: () => Promise<{ ok: boolean; data?: unknown; error?: string }>, after?: (d: unknown) => void) => start(async () => {
    setError(null);
    const r = await fn();
    if (!r.ok) { setError(r.error ?? "Terjadi kesalahan."); return; }
    after?.(r.data);
  });

  const newDraft = (lines: StandingOrderLine[] = presets[0]?.lines ?? []) => setDraft({
    name: en ? "Kitchen standing order" : "Pesanan rutin dapur", weekdays: [1, 3, 5],
    slot_id: account.preferred_slot_id && slots.some((s) => s.id === account.preferred_slot_id) ? account.preferred_slot_id : slots[0]?.id ?? "",
    payment_method: payments[0] ?? "transfer", lines: lines.map((l) => ({ ...l })), note: "",
  });
  const save = () => draft && act(() => saveStandingOrderAction({ ...draft, note: draft.note || null }), (d) => { replace(d as StandingOrder); setDraft(null); });
  const addable = products.flatMap((p) => p.variants.filter((v) => v.is_active).map((v) => ({ id: v.id, label: `${en && p.name_en ? p.name_en : p.name} · ${pick(locale, v.label, v.label_en)}`, min: v.min_qty })));

  return (
    <section className="card p-5 sm:p-6" id="pesanan-rutin">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" />{en ? "Standing orders" : "Pesanan rutin"}</p>
          <h2 className="mt-1 text-[1.9rem] leading-none">{en ? "Your kitchen, restocked automatically" : "Stok dapur terisi otomatis"}</h2>
          <p className="mt-2 max-w-xl font-sans text-[13.5px] text-mute">{en ? "Set the items and days once. Each evening at 19.45 WIB we place the next day's order for you; change or skip a delivery until 19.30." : "Atur produk dan hari pengirimannya sekali saja. Setiap malam pukul 19.45 WIB kami membuatkan pesanan untuk esok hari; ubah atau lewati pengiriman paling lambat pukul 19.30."}</p>
        </div>
        {!draft && <button type="button" onClick={() => newDraft()} className="btn-accent text-[12px]"><Plus className="h-4 w-4" /> {en ? "New standing order" : "Buat pesanan rutin"}</button>}
      </div>
      {error && <p role="alert" className="mt-4 bg-coral-50 px-4 py-3 font-sans text-sm text-gold-ink">{error}</p>}

      {draft && (
        <div className="mt-5 border border-ocean-950 bg-sand-50 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">{en ? "Name" : "Nama"}</span><input className="input" value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            {presets.length > 0 && !draft.id && (
              <label className="block"><span className="label">{en ? "Start from an order" : "Mulai dari pesanan"}</span>
                <select className="input" onChange={(e) => { const p = presets[Number(e.target.value)]; if (p) setDraft({ ...draft, lines: p.lines.map((l) => ({ ...l })) }); }} defaultValue="0">
                  {presets.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
                </select>
              </label>
            )}
          </div>
          <fieldset className="mt-4"><legend className="label">{en ? "Delivery days" : "Hari pengiriman"}</legend>
            <div className="flex flex-wrap gap-2">
              {days.map((d, i) => { const n = i + 1; const on = draft.weekdays.includes(n); return (
                <button key={d} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, weekdays: on ? draft.weekdays.filter((x) => x !== n) : [...draft.weekdays, n] })}
                  className={`h-10 w-12 border font-sans text-[12px] font-bold uppercase tracking-[0.1em] ${on ? "border-ocean-950 bg-ocean-950 text-coral-500" : "border-line bg-white hover:border-ocean-950"}`}>{d}</button>); })}
            </div>
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">{en ? "Delivery slot" : "Jam pengiriman"}</span>
              <select className="input" value={draft.slot_id} onChange={(e) => setDraft({ ...draft, slot_id: e.target.value })}>{slots.map((s) => <option key={s.id} value={s.id}>{slotLabel(s.id)}</option>)}</select></label>
            <label className="block"><span className="label">{en ? "Payment" : "Pembayaran"}</span>
              <select className="input" value={draft.payment_method} onChange={(e) => setDraft({ ...draft, payment_method: e.target.value as PaymentMethod })}>{payments.map((p) => <option key={p} value={p}>{p === "terms" ? `${t.paymentMethod.terms} · ${t.terms[account.payment_terms]}` : t.paymentMethod[p]}</option>)}</select></label>
          </div>
          <div className="mt-4"><p className="label">{en ? "Items per delivery" : "Produk per pengiriman"}</p>
            <ul className="divide-y divide-line border-y border-line bg-white">
              {draft.lines.map((l, i) => { const info = variantInfo.get(l.variant_id); return (
                <li key={`${l.variant_id}-${i}`} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-sans text-[13px]">{info ? `${en && info.product.name_en ? info.product.name_en : info.product.name} · ${pick(locale, info.v.label, info.v.label_en)}` : l.variant_id}</span>
                  <input type="number" inputMode="decimal" min={info?.v.min_qty ?? 0} step={info?.v.step_qty ?? 1} value={l.qty} aria-label={en ? "Quantity" : "Jumlah"}
                    onChange={(e) => setDraft({ ...draft, lines: draft.lines.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value) } : x)) })} className="input w-24 py-1.5 text-right" />
                  <span className="w-14 font-sans text-[12px] text-mute">{info ? t.unit[info.v.unit] : ""}</span>
                  <button type="button" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, k) => k !== i) })} className="p-1.5 text-mute hover:text-gold-ink" aria-label={t.cart.remove}><Trash2 className="h-4 w-4" /></button>
                </li>); })}
              {draft.lines.length === 0 && <li className="px-3 py-3 font-sans text-[13px] text-mute">{en ? "No items yet." : "Belum ada produk."}</li>}
            </ul>
            <select className="input mt-2" value="" aria-label={en ? "Add a product" : "Tambah produk"} onChange={(e) => { const a = addable.find((x) => x.id === e.target.value); if (a) setDraft({ ...draft, lines: [...draft.lines, { variant_id: a.id, qty: a.min, prep_option_id: null }] }); }}>
              <option value="">{en ? "+ Add a product…" : "+ Tambah produk…"}</option>
              {addable.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <label className="mt-4 block"><span className="label">{en ? "Note for the kitchen (optional)" : "Catatan (opsional)"}</span><input className="input" value={draft.note} maxLength={140} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-sans text-[13px] text-mute">{en ? "Estimate per delivery" : "Perkiraan per pengiriman"}: <b className="text-ink">{rupiah(estimate(draft.lines))}</b></p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDraft(null)} className="btn-outline text-[12px]"><X className="h-4 w-4" /> {en ? "Cancel" : "Batal"}</button>
              <button type="button" onClick={save} disabled={pending} className="btn-primary text-[12px]">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} {en ? "Save standing order" : "Simpan pesanan rutin"}</button>
            </div>
          </div>
        </div>
      )}

      <ul className="mt-5 space-y-4">
        {list.map((so) => {
          const next = upcomingDates(so, firstDate, 4);
          const myRuns = runs.filter((r) => r.standing_order_id === so.id).slice(0, 3);
          return (
            <li key={so.id} className={`border p-4 sm:p-5 ${so.status === "active" ? "border-line bg-white" : "border-dashed border-line bg-sand-50"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[1.4rem] font-bold uppercase leading-none">{so.name}</p>
                  <p className="mt-1.5 font-sans text-[12.5px] text-mute">{so.weekdays.map((d) => days[d - 1]).join(" · ")} · {slotLabel(so.slot_id)} · {so.payment_method === "terms" ? t.terms[account.payment_terms] : t.paymentMethod[so.payment_method]}</p>
                </div>
                <span className={`px-2.5 py-1 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] ${so.status === "active" ? "bg-success-50 text-success-600" : "bg-sand-200 text-ink/70"}`}>{so.status === "active" ? (en ? "Active" : "Aktif") : (en ? "Paused" : "Dijeda")}</span>
              </div>
              <p className="mt-3 font-sans text-[13px] text-ink/80">{so.lines.map(lineLabel).join(" · ")}</p>
              <p className="mt-1 font-sans text-[12.5px] text-mute">{en ? "Estimate per delivery" : "Perkiraan per pengiriman"}: <b className="text-ink">{rupiah(estimate(so.lines))}</b></p>
              {so.status === "active" && (
                <div className="mt-4">
                  <p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.16em] text-mute">{en ? "Next deliveries · tap to skip" : "Pengiriman berikutnya · ketuk untuk melewati"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {next.map((d) => { const skipped = so.skip_dates.includes(d); return (
                      <button key={d} type="button" disabled={pending} aria-pressed={skipped} onClick={() => act(() => setStandingSkipAction(so.id, d, !skipped), (x) => replace(x as StandingOrder))}
                        className={`border px-3 py-2 font-sans text-[12px] font-semibold ${skipped ? "border-line bg-sand-100 text-mute line-through" : "border-ocean-950 bg-white"}`}>
                        {formatDate(d, "short", locale)}{skipped ? (en ? " · skipped" : " · dilewati") : ""}
                      </button>); })}
                  </div>
                </div>
              )}
              {myRuns.length > 0 && <p className="mt-3 font-sans text-[12px] text-mute">{en ? "Recent" : "Terakhir"}: {myRuns.map((r) => `${formatDate(r.delivery_date, "short", locale)} ${r.order_code ?? (en ? "failed" : "gagal")}`).join(" · ")}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setDraft({ id: so.id, name: so.name, weekdays: [...so.weekdays], slot_id: so.slot_id, payment_method: so.payment_method, lines: so.lines.map((l) => ({ ...l })), note: so.note ?? "" })} className="btn-outline px-3 py-2 text-[11.5px]"><Pencil className="h-3.5 w-3.5" /> {en ? "Edit" : "Ubah"}</button>
                <button type="button" disabled={pending} onClick={() => act(() => setStandingStatusAction(so.id, so.status === "active" ? "paused" : "active"), (x) => replace(x as StandingOrder))} className="btn-outline px-3 py-2 text-[11.5px]">
                  {so.status === "active" ? <><Pause className="h-3.5 w-3.5" /> {en ? "Pause" : "Jeda"}</> : <><Play className="h-3.5 w-3.5" /> {en ? "Resume" : "Lanjutkan"}</>}
                </button>
                <button type="button" disabled={pending} onClick={() => { if (confirm(en ? "Delete this standing order?" : "Hapus pesanan rutin ini?")) act(() => deleteStandingOrderAction(so.id), () => setList((xs) => xs.filter((x) => x.id !== so.id))); }} className="px-3 py-2 font-sans text-[11.5px] font-bold uppercase tracking-[0.12em] text-mute hover:text-gold-ink"><Trash2 className="mr-1 inline h-3.5 w-3.5" />{en ? "Delete" : "Hapus"}</button>
              </div>
            </li>
          );
        })}
        {list.length === 0 && !draft && <li className="bg-sand-50 p-5 font-sans text-[13.5px] text-mute">{en ? "No standing orders yet. Create one from your last order in a few taps." : "Belum ada pesanan rutin. Buat dari pesanan terakhir Anda dalam beberapa sentuhan."}</li>}
      </ul>
    </section>
  );
}
