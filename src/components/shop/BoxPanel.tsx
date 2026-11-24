"use client";
// "Kotak mingguan": a household's subscription on its account page. Pick the items (a value box, a past order, the
// cart, or any products), one delivery day, every week or every second week, a slot and a saved address.
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Loader2, PackageCheck, Pause, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import type { CustomerAddress, DeliveryArea, DeliverySlot, PaymentMethod, Product, Settings, StandingOrder, StandingOrderLine, StandingOrderRun } from "@/lib/types";
import { deliveryFee } from "@/lib/pricing";
import { formatDate, jam, jamRange, qtyUnit, rupiah } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { BOX_PAYMENTS, MAX_BOXES, WEEKDAYS, boxSubtotal, upcomingDates } from "@/lib/standing";
import { deleteBoxAction, saveBoxAction, setBoxSkipAction, setBoxStatusAction } from "@/actions/box";
import { useCart } from "@/store/cart";

export interface BoxPreset { key: string; label: string; lines: StandingOrderLine[] }
interface Draft { id?: string; name: string; weekday: number; every_weeks: number; slot_id: string; address_id: string; payment_method: PaymentMethod; lines: StandingOrderLine[]; note: string }

const DAY_NAMES = { id: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"], en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] } as const;

export function BoxPanel({ initial, runs, products, slots, addresses, areas, settings, firstDate, presets, preselect, phone }: {
  initial: StandingOrder[]; runs: StandingOrderRun[]; products: Product[]; slots: DeliverySlot[]; addresses: CustomerAddress[]; areas: DeliveryArea[];
  settings: Pick<Settings, "min_order_retail" | "min_order_business" | "free_delivery_retail" | "free_delivery_business" | "cutoff_time">; firstDate: string;
  presets: BoxPreset[]; preselect?: string | null; phone: string;
}) {
  const { t, locale } = useT();
  const en = locale === "en";
  const [list, setList] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cartLines = useCart((s) => s.lines);
  const opened = useRef(false);
  const usable = addresses.filter((a) => a.area_id);

  const variantInfo = useMemo(() => {
    const m = new Map<string, { product: Product; v: Product["variants"][number] }>();
    for (const p of products) for (const v of p.variants) if (v.is_active && !v.business_only) m.set(v.id, { product: p, v });
    return m;
  }, [products]);
  const nameOf = (p: Product) => (en && p.name_en ? p.name_en : p.name);
  const lineLabel = (l: StandingOrderLine) => {
    const info = variantInfo.get(l.variant_id);
    if (!info) return "—";
    const prep = l.prep_option_id ? info.product.prep_options.find((o) => o.id === l.prep_option_id) : null;
    return `${nameOf(info.product)} ${qtyUnit(l.qty, info.v.unit, locale)}${prep ? ` · ${pick(locale, prep.label, prep.label_en).split(" (")[0]}` : ""}`;
  };
  const totals = (lines: StandingOrderLine[], addressId: string) => {
    const subtotal = boxSubtotal(lines.filter((l) => variantInfo.has(l.variant_id)), products);
    const area = areas.find((a) => a.id === addresses.find((x) => x.id === addressId)?.area_id) ?? null;
    const fee = deliveryFee(area, subtotal, "retail", settings as Settings);
    return { subtotal, fee, total: subtotal + fee, estimate: lines.some((l) => variantInfo.get(l.variant_id)?.product.is_catch_weight) };
  };
  const slotLabel = (id: string) => { const s = slots.find((x) => x.id === id); return s ? `${s.label} ${jamRange(s.start_time, s.end_time)}` : "—"; };
  const addressLabel = (id: string | null) => { const a = addresses.find((x) => x.id === id); return a ? a.label : (en ? "address removed" : "alamat dihapus"); };
  const rhythm = (so: Pick<StandingOrder, "weekdays" | "every_weeks">) => {
    const day = DAY_NAMES[locale][(so.weekdays[0] ?? 1) - 1];
    return so.every_weeks === 2 ? (en ? `Every second ${day}` : `${day}, dua minggu sekali`) : (en ? `Every ${day}` : `Setiap ${day}`);
  };

  const allPresets: BoxPreset[] = useMemo(() => {
    const fromCart = cartLines.filter((l) => variantInfo.has(l.variant_id)).map((l) => ({ variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id }));
    return fromCart.length ? [...presets, { key: "cart", label: en ? "What is in my cart now" : "Isi keranjang saya sekarang", lines: fromCart }] : presets;
  }, [presets, cartLines, variantInfo, en]);

  const replace = (so: StandingOrder) => setList((xs) => (xs.some((x) => x.id === so.id) ? xs.map((x) => (x.id === so.id ? so : x)) : [...xs, so]));
  const act = (fn: () => Promise<{ ok: boolean; data?: unknown; error?: string }>, after?: (d: unknown) => void) => start(async () => {
    setError(null);
    const r = await fn();
    if (!r.ok) { setError(r.error ?? "Terjadi kesalahan."); return; }
    after?.(r.data);
  });

  const newDraft = (preset?: BoxPreset) => {
    const p = preset ?? allPresets[0];
    const firstDay = new Date(`${firstDate}T12:00:00Z`).getUTCDay() || 7;
    setError(null);
    setDraft({
      name: p && p.key.startsWith("box:") ? p.label : (en ? "My weekly box" : "Kotak mingguan saya"), weekday: firstDay, every_weeks: 1,
      slot_id: slots[0]?.id ?? "", address_id: (usable.find((a) => a.is_default) ?? usable[0])?.id ?? "", payment_method: "qris",
      lines: (p?.lines ?? []).map((l) => ({ ...l })), note: "",
    });
  };
  // Arriving from a value-box product page ("Langganan kotak ini"): open the form with that box.
  useEffect(() => {
    // (waits until an address exists: a new customer saves one first, then the form opens with the chosen box)
    if (opened.current || !preselect || !usable.length || list.length >= MAX_BOXES) return;
    opened.current = true;
    newDraft(presets.find((x) => x.key === `box:${preselect}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, usable.length]);

  const save = () => draft && act(
    () => saveBoxAction({ id: draft.id, name: draft.name, weekdays: [draft.weekday], every_weeks: draft.every_weeks, slot_id: draft.slot_id, address_id: draft.address_id, payment_method: draft.payment_method, lines: draft.lines, note: draft.note || null }),
    (d) => { replace(d as StandingOrder); setDraft(null); },
  );
  const addable = [...variantInfo.values()].map(({ product, v }) => ({ id: v.id, label: `${nameOf(product)} · ${pick(locale, v.label, v.label_en)}`, min: v.min_qty })).sort((a, b) => a.label.localeCompare(b.label, locale));
  const dt = draft ? totals(draft.lines, draft.address_id) : null;
  const short = dt ? Math.max(0, settings.min_order_retail - dt.subtotal) : 0;
  const draftDates = draft ? upcomingDates({ weekdays: [draft.weekday], every_weeks: draft.every_weeks, anchor_date: null }, firstDate, 1) : [];

  return (
    <section className="card p-5 sm:p-6" id="langganan">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><PackageCheck className="h-3.5 w-3.5" />{en ? "Subscription" : "Langganan"}</p>
          <h2 className="mt-1 text-[1.9rem] leading-none">{en ? "Your weekly box" : "Kotak mingguan Anda"}</h2>
          <p className="mt-2 max-w-xl font-sans text-[13.5px] text-mute">{en
            ? `Choose the items and the delivery day once. Two evenings before each delivery we prepare the order and send the payment link on WhatsApp; pay by ${jam(settings.cutoff_time)} the next evening. Skip a week, pause or stop any time. No contract, no subscription fee.`
            : `Pilih isi kotak dan hari pengirimannya sekali saja. Dua malam sebelum pengiriman kami buatkan pesanannya dan mengirim tautan pembayaran lewat WhatsApp; bayar sebelum pukul ${jam(settings.cutoff_time)} keesokan harinya. Lewati satu minggu, jeda, atau berhenti kapan saja. Tanpa kontrak, tanpa biaya langganan.`}</p>
        </div>
        {!draft && list.length < MAX_BOXES && usable.length > 0 && <button type="button" onClick={() => newDraft()} className="btn-accent text-[12px]"><Plus className="h-4 w-4" /> {en ? "Start a weekly box" : "Buat kotak mingguan"}</button>}
      </div>
      {usable.length === 0 && <p className="mt-4 bg-sand-100 px-4 py-3 font-sans text-sm">{en ? "Save a delivery address (with its area) in the address book below first; your box is delivered there." : "Simpan dulu alamat pengiriman (lengkap dengan wilayahnya) di buku alamat di bawah; kotak dikirim ke alamat itu."}</p>}
      {error && <p role="alert" className="mt-4 bg-coral-50 px-4 py-3 font-sans text-sm text-gold-ink">{error}</p>}

      {draft && dt && (
        <div className="mt-5 border border-ocean-950 bg-sand-50 p-4 sm:p-5">
          {!draft.id && allPresets.length > 0 && (
            <fieldset><legend className="label">{en ? "Start from" : "Mulai dari"}</legend>
              <div className="flex flex-wrap gap-2">
                {allPresets.map((p) => <button key={p.key} type="button" onClick={() => setDraft({ ...draft, lines: p.lines.map((l) => ({ ...l })), name: p.key.startsWith("box:") ? p.label : draft.name })} className="chip">{p.label}</button>)}
              </div>
            </fieldset>
          )}
          <div className="mt-4"><p className="label">{en ? "In the box" : "Isi kotak"}</p>
            <ul className="divide-y divide-line border-y border-line bg-white">
              {draft.lines.map((l, i) => { const info = variantInfo.get(l.variant_id); return (
                <li key={`${l.variant_id}-${i}`} className="flex flex-wrap items-center justify-end gap-2 px-3 py-2">
                  <span className="w-full font-sans text-[13px] sm:w-auto sm:min-w-0 sm:flex-1">{info ? `${nameOf(info.product)} · ${pick(locale, info.v.label, info.v.label_en)}` : (en ? "No longer available" : "Sudah tidak tersedia")}</span>
                  <input type="number" inputMode="decimal" min={info?.v.min_qty ?? 0} step={info?.v.step_qty ?? 1} value={l.qty} aria-label={`${en ? "Quantity" : "Jumlah"} ${info ? nameOf(info.product) : ""}`}
                    onChange={(e) => setDraft({ ...draft, lines: draft.lines.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value) } : x)) })} className="input w-20 py-1.5 text-right" />
                  <span className="w-12 font-sans text-[12px] text-mute">{info ? t.unit[info.v.unit] : ""}</span>
                  <button type="button" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, k) => k !== i) })} className="p-1.5 text-mute hover:text-gold-ink" aria-label={`${t.cart.remove} ${info ? nameOf(info.product) : ""}`}><Trash2 className="h-4 w-4" /></button>
                </li>); })}
              {draft.lines.length === 0 && <li className="px-3 py-3 font-sans text-[13px] text-mute">{en ? "Nothing in the box yet." : "Kotak masih kosong."}</li>}
            </ul>
            <select className="input mt-2" value="" aria-label={en ? "Add a product" : "Tambah produk"} onChange={(e) => { const a = addable.find((x) => x.id === e.target.value); if (a) setDraft({ ...draft, lines: [...draft.lines, { variant_id: a.id, qty: a.min, prep_option_id: null }] }); }}>
              <option value="">{en ? "+ Add a product…" : "+ Tambah produk…"}</option>
              {addable.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <fieldset className="mt-4"><legend className="label">{en ? "Delivery day" : "Hari pengiriman"}</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS[locale].map((d, i) => { const n = i + 1; const on = draft.weekday === n; return (
                <button key={d} type="button" aria-pressed={on} aria-label={DAY_NAMES[locale][i]} onClick={() => setDraft({ ...draft, weekday: n })}
                  className={`h-10 w-12 border font-sans text-[12px] font-bold uppercase tracking-[0.1em] ${on ? "border-ocean-950 bg-ocean-950 text-coral-500" : "border-line bg-white hover:border-ocean-950"}`}>{d}</button>); })}
            </div>
          </fieldset>
          <fieldset className="mt-4"><legend className="label">{en ? "How often" : "Seberapa sering"}</legend>
            <div className="flex flex-wrap gap-2">
              {([[1, en ? "Every week" : "Setiap minggu"], [2, en ? "Every second week" : "Dua minggu sekali"]] as const).map(([n, label]) => (
                <button key={n} type="button" aria-pressed={draft.every_weeks === n} onClick={() => setDraft({ ...draft, every_weeks: n })} className={`chip ${draft.every_weeks === n ? "chip-on" : ""}`}>{label}</button>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">{en ? "Delivery slot" : "Jam pengiriman"}</span>
              <select className="input" value={draft.slot_id} onChange={(e) => setDraft({ ...draft, slot_id: e.target.value })}>{slots.map((s) => <option key={s.id} value={s.id}>{slotLabel(s.id)}</option>)}</select></label>
            <label className="block"><span className="label">{en ? "Deliver to" : "Dikirim ke"}</span>
              <select className="input" value={draft.address_id} onChange={(e) => setDraft({ ...draft, address_id: e.target.value })}>{usable.map((a) => <option key={a.id} value={a.id}>{a.label} · {a.address.slice(0, 40)}</option>)}</select></label>
            <label className="block"><span className="label">{en ? "Payment" : "Pembayaran"}</span>
              <select className="input" value={draft.payment_method} onChange={(e) => setDraft({ ...draft, payment_method: e.target.value as PaymentMethod })}>{BOX_PAYMENTS.map((p) => <option key={p} value={p}>{t.paymentMethod[p]}</option>)}</select></label>
            <label className="block"><span className="label">{en ? "Box name" : "Nama kotak"}</span><input className="input" value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          </div>
          <label className="mt-4 block"><span className="label">{en ? "Note for us (optional)" : "Catatan untuk kami (opsional)"}</span><input className="input" value={draft.note} maxLength={140} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder={en ? "e.g. leave with the security desk" : "mis. titip ke satpam bila tidak ada orang"} /></label>
          <div className="mt-5 border-t border-line pt-4 font-sans text-[13px]">
            <p>{dt.estimate ? (en ? "Estimate per box" : "Perkiraan per kotak") : (en ? "Per box" : "Per kotak")}: <b className="text-ink">{rupiah(dt.total)}</b> <span className="text-mute">({rupiah(dt.subtotal)} + {dt.fee ? `${en ? "delivery" : "ongkos kirim"} ${rupiah(dt.fee)}` : (en ? "free delivery" : "gratis ongkos kirim")})</span></p>
            {dt.estimate && <p className="mt-1 text-[12px] text-mute">{en ? "Items sold by weight are weighed at dawn; the final amount follows the weight." : "Produk yang ditimbang dihitung dari berat saat subuh; tagihan akhir mengikuti hasil timbang."}</p>}
            {short > 0 && <p className="mt-1 text-[12px] font-semibold text-gold-ink">{en ? `Add ${rupiah(short)} more to reach the minimum order.` : `Tambah ${rupiah(short)} lagi untuk mencapai minimal pesanan.`}</p>}
            {draftDates[0] && !draft.id && <p className="mt-1 text-[12px] text-mute">{en ? "First delivery" : "Pengiriman pertama"}: <b className="text-ink">{formatDate(draftDates[0], "long", locale)}</b></p>}
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => { setDraft(null); setError(null); }} className="btn-outline text-[12px]"><X className="h-4 w-4" /> {en ? "Cancel" : "Batal"}</button>
            <button type="button" onClick={save} disabled={pending || short > 0 || draft.lines.length === 0} className="btn-primary text-[12px]">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} {draft.id ? (en ? "Save changes" : "Simpan perubahan") : (en ? "Start my weekly box" : "Mulai kotak mingguan")}</button>
          </div>
        </div>
      )}

      <ul className="mt-5 space-y-4">
        {list.map((so) => {
          const next = upcomingDates(so, firstDate, 3);
          const myRuns = runs.filter((r) => r.standing_order_id === so.id);
          const tt = totals(so.lines, so.address_id ?? "");
          return (
            <li key={so.id} className={`border p-4 sm:p-5 ${so.status === "active" ? "border-line bg-white" : "border-dashed border-line bg-sand-50"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[1.4rem] font-bold uppercase leading-none">{so.name}</p>
                  <p className="mt-1.5 font-sans text-[12.5px] text-mute">{rhythm(so)} · {slotLabel(so.slot_id)} · {addressLabel(so.address_id)} · {t.paymentMethod[so.payment_method]}</p>
                </div>
                <span className={`px-2.5 py-1 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] ${so.status === "active" ? "bg-success-50 text-success-600" : "bg-sand-200 text-ink/70"}`}>{so.status === "active" ? (en ? "Active" : "Aktif") : (en ? "Paused" : "Dijeda")}</span>
              </div>
              <p className="mt-3 font-sans text-[13px] text-ink/80">{so.lines.map(lineLabel).join(" · ")}</p>
              <p className="mt-1 font-sans text-[12.5px] text-mute">{tt.estimate ? (en ? "Estimate per box" : "Perkiraan per kotak") : (en ? "Per box" : "Per kotak")}: <b className="text-ink">{rupiah(tt.total)}</b></p>
              {so.status === "paused" && so.paused_reason && (
                <p className="mt-3 border-l-4 border-coral-500 bg-coral-50 px-3 py-2 font-sans text-[12.5px]">{so.paused_reason === "unpaid"
                  ? (en ? "Paused automatically because the last two boxes were not paid. Resume whenever you like." : "Dijeda otomatis karena dua kotak terakhir tidak dibayar. Lanjutkan kapan saja Anda mau.")
                  : (en ? "Paused because its delivery address was removed. Choose another address (Edit), then resume." : "Dijeda karena alamat pengirimannya dihapus. Pilih alamat lain (Ubah), lalu lanjutkan.")}</p>
              )}
              {so.status === "active" && (
                <div className="mt-4">
                  <p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.16em] text-mute">{en ? "Next deliveries · tap to skip" : "Pengiriman berikutnya · ketuk untuk melewati"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {next.map((d) => { const skipped = so.skip_dates.includes(d); const placed = myRuns.find((r) => r.delivery_date === d && r.order_code); if (placed) return (
                      <Link key={d} href={`/pesanan/${placed.order_code}?hp=${phone}`} className="border border-success-600/40 bg-success-50 px-3 py-2 font-sans text-[12px] font-semibold text-success-600">{formatDate(d, "weekday", locale)} · {placed.order_code}</Link>); return (
                      <button key={d} type="button" disabled={pending} aria-pressed={skipped} onClick={() => act(() => setBoxSkipAction(so.id, d, !skipped), (x) => replace(x as StandingOrder))}
                        className={`border px-3 py-2 font-sans text-[12px] font-semibold ${skipped ? "border-line bg-sand-100 text-mute line-through" : "border-ocean-950 bg-white"}`}>
                        {formatDate(d, "weekday", locale)}{skipped ? (en ? " · skipped" : " · dilewati") : ""}
                      </button>); })}
                  </div>
                </div>
              )}
              {myRuns.filter((r) => r.order_code && r.note).slice(0, 1).map((r) => (
                <p key={r.id} className="mt-3 bg-warn-50 px-3 py-2 font-sans text-[12px] text-warn-600">{en ? `${formatDate(r.delivery_date, "short", locale)} (${r.order_code}) was prepared without items that were unavailable: ` : `${formatDate(r.delivery_date, "short", locale)} (${r.order_code}) dibuat tanpa produk yang tidak tersedia: `}{r.note}</p>
              ))}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => { setError(null); setDraft({ id: so.id, name: so.name, weekday: so.weekdays[0] ?? 1, every_weeks: so.every_weeks, slot_id: so.slot_id, address_id: usable.some((a) => a.id === so.address_id) ? so.address_id! : usable[0]?.id ?? "", payment_method: so.payment_method, lines: so.lines.map((l) => ({ ...l })), note: so.note ?? "" }); }} className="btn-outline px-3 py-2 text-[11.5px]"><Pencil className="h-3.5 w-3.5" /> {en ? "Edit" : "Ubah"}</button>
                <button type="button" disabled={pending} onClick={() => act(() => setBoxStatusAction(so.id, so.status === "active" ? "paused" : "active"), (x) => replace(x as StandingOrder))} className="btn-outline px-3 py-2 text-[11.5px]">
                  {so.status === "active" ? <><Pause className="h-3.5 w-3.5" /> {en ? "Pause" : "Jeda"}</> : <><Play className="h-3.5 w-3.5" /> {en ? "Resume" : "Lanjutkan"}</>}
                </button>
                <button type="button" disabled={pending} onClick={() => { if (confirm(en ? "Stop this weekly box?" : "Hentikan kotak mingguan ini?")) act(() => deleteBoxAction(so.id), () => setList((xs) => xs.filter((x) => x.id !== so.id))); }} className="px-3 py-2 font-sans text-[11.5px] font-bold uppercase tracking-[0.12em] text-mute hover:text-gold-ink"><Trash2 className="mr-1 inline h-3.5 w-3.5" />{en ? "Stop" : "Hentikan"}</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
