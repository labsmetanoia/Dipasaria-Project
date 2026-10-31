"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Tag, ShieldCheck, ArrowRight, ArrowLeft, Check } from "lucide-react";
import type { BusinessAccount, DeliveryArea, DeliverySlot, PaymentMethod, Product, Promo, Settings } from "@/lib/types";
import { availableDates, quote, segmentOf, slotsForSegment } from "@/lib/pricing";
import { isValidPhone, nowJakarta, relativeDayLabel, rupiah } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { useCart } from "@/store/cart";
import { placeOrderAction, quoteCart } from "@/actions/shop";
import { Field } from "@/components/ui";
import { MinOrderBar } from "./CartView";

interface Props { products: Product[]; settings: Settings; areas: DeliveryArea[]; slots: DeliverySlot[]; slotUsage: Record<string, number>; account: BusinessAccount | null }

export function CheckoutForm({ products, settings, areas, slots, slotUsage, account }: Props) {
  const { t, locale } = useT();
  const router = useRouter();
  const { lines, customer, saveCustomer, clear, rememberOrder } = useCart();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const segment = segmentOf(account);
  const now = useMemo(() => nowJakarta(), []);
  const dates = useMemo(() => availableDates(settings, now), [settings, now]);
  const segSlots = useMemo(() => slotsForSegment(slots, segment), [slots, segment]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [maps, setMaps] = useState("");
  const [areaId, setAreaId] = useState("");
  const [date, setDate] = useState(dates[0]);
  const [slotId, setSlotId] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("qris");
  const [note, setNote] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [checkingPromo, startPromo] = useTransition();

  useEffect(() => {
    setMounted(true);
    if (account) {
      setName(account.business_name); setPhone(account.phone); setAddress(account.address); setAreaId(account.area_id ?? "");
      setSlotId(account.preferred_slot_id && segSlots.some((s) => s.id === account.preferred_slot_id) ? account.preferred_slot_id : segSlots[0]?.id ?? "");
      setPayment(account.payment_terms !== "prepaid" ? "terms" : account.allow_cod ? "cod" : "qris");
    } else {
      setName(customer.name); setPhone(customer.phone); setAddress(customer.address); setMaps(customer.maps_url); setAreaId(customer.area_id || ""); setSlotId(segSlots[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id]);

  const q = useMemo(() => quote({ settings, products, areas, promos: promo ? [promo] : [], account, now }, { lines, area_id: areaId, promo_code: promo?.code }), [settings, products, areas, promo, account, now, lines, areaId]);
  const payOptions: PaymentMethod[] = ["qris", "transfer"];
  if (segment === "business" && account?.allow_cod) payOptions.push("cod");
  if (segment === "business" && account && account.payment_terms !== "prepaid") payOptions.push("terms");

  const checkPromo = () => {
    if (!promoCode.trim()) return;
    startPromo(async () => {
      const r = await quoteCart({ lines, area_id: areaId, promo_code: promoCode, phone });
      if (r.promo) { setPromo(r.promo); setPromoMsg(null); } else { setPromo(null); setPromoMsg(r.promo_error ?? "Kode tidak valid."); }
    });
  };
  const step1ok = Boolean(name.trim() && isValidPhone(phone) && address.trim() && areaId);
  const step2ok = Boolean(date && slotId);
  const canSubmit = mounted && lines.length > 0 && q.min_order_met && q.errors.length === 0 && step1ok && step2ok && !pending;

  const submit = () => {
    setError(null);
    start(async () => {
      const r = await placeOrderAction({ lines, customer_name: name, phone, address, area_id: areaId, maps_url: maps, delivery_date: date, slot_id: slotId, payment_method: payment, promo_code: promo?.code, customer_note: note });
      if (!r.ok) { setError(r.error); return; }
      if (!account) saveCustomer({ name, phone, address, area_id: areaId, maps_url: maps });
      rememberOrder({ code: r.data.code, phone: r.data.phone, at: new Date().toISOString() });
      clear();
      router.push(`/pesanan/${r.data.code}?hp=${r.data.phone}&baru=1`);
    });
  };

  if (!mounted) return <div className="h-64 animate-pulse rounded-2xl bg-sand-100" />;
  if (!lines.length) return <p className="text-mute">{t.checkout.emptyCart}</p>;
  const steps = [t.checkout.step1, t.checkout.step2, t.checkout.step3];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="min-w-0 space-y-5 lg:col-span-7">
        {/* Stepper */}
        <ol className="flex items-center gap-2">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <button type="button" onClick={() => i < step && setStep(i)} className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[12px] font-bold ${i < step ? "bg-success-600 text-white" : i === step ? "bg-ocean-950 text-white" : "bg-sand-200 text-mute"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</button>
              <span className={`hidden text-[12.5px] font-semibold sm:block ${i === step ? "text-ocean-950" : "text-mute"}`}>{s}</span>
              {i < steps.length - 1 && <span className="h-px flex-1 bg-line" />}
            </li>
          ))}
        </ol>
        <p className="text-[15px] font-bold text-ocean-950 sm:hidden">{step + 1}. {steps[step]}</p>

        {step === 0 && (
          <>
            <section className="card p-5">
              <h2 className="text-lg text-ocean-950">{t.checkout.recipient}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={segment === "business" ? t.checkout.businessName : t.checkout.name}><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
                <Field label={t.checkout.phone} hint={t.checkout.phoneHint}><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx xxxx xxxx" autoComplete="tel" disabled={Boolean(account)} /></Field>
              </div>
            </section>
            <section className="card p-5">
              <h2 className="text-lg text-ocean-950">{t.checkout.address}</h2>
              <div className="mt-4 space-y-4">
                <Field label={t.checkout.area}><select className="input" value={areaId} onChange={(e) => setAreaId(e.target.value)}><option value="">{t.checkout.chooseArea}</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name} · {t.checkout.fee} {rupiah(a.fee)}</option>)}</select></Field>
                <Field label={t.checkout.fullAddress}><textarea className="input" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.checkout.addressPlaceholder} /></Field>
                <Field label={t.checkout.maps}><input className="input" value={maps} onChange={(e) => setMaps(e.target.value)} placeholder="https://maps.app.goo.gl/…" /></Field>
              </div>
            </section>
            <button type="button" disabled={!step1ok} onClick={() => setStep(1)} className="btn-primary w-full sm:w-auto">{t.checkout.next} <ArrowRight className="h-4 w-4" /></button>
          </>
        )}

        {step === 1 && (
          <>
            <section className="card p-5">
              <h2 className="text-lg text-ocean-950">{t.checkout.schedule}</h2>
              <p className="mt-1 text-xs text-mute">{fmt(t.checkout.cutoffNote, { time: settings.cutoff_time })}</p>
              <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 scrollbar-none">
                {dates.map((d) => <button key={d} type="button" onClick={() => setDate(d)} className={`chip flex-none ${date === d ? "chip-on" : ""}`}>{relativeDayLabel(d, now.date, locale)}</button>)}
              </div>
              <div className="mt-4 space-y-2">
                {segSlots.map((s) => {
                  const left = s.capacity - (slotUsage[`${date}|${s.id}`] ?? 0);
                  const full = left <= 0;
                  return (
                    <label key={s.id} className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 text-sm ${full ? "cursor-not-allowed opacity-50" : slotId === s.id ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}>
                      <span className="flex items-center gap-2"><input type="radio" name="slot" disabled={full} checked={slotId === s.id} onChange={() => setSlotId(s.id)} className="accent-ocean-950" /><span><b>{s.start_time}–{s.end_time}</b> · {s.label}</span></span>
                      <span className={`text-xs ${full ? "text-coral-600" : left <= 3 ? "text-warn-600" : "text-mute"}`}>{full ? t.checkout.full : fmt(t.checkout.slotsLeft, { n: left })}</span>
                    </label>
                  );
                })}
              </div>
            </section>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> {t.checkout.prev}</button>
              <button type="button" disabled={!step2ok} onClick={() => setStep(2)} className="btn-primary flex-1 sm:flex-none">{t.checkout.next} <ArrowRight className="h-4 w-4" /></button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <section className="card p-5">
              <h2 className="text-lg text-ocean-950">{t.checkout.payment}</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {payOptions.map((pm) => <label key={pm} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-3 text-sm ${payment === pm ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}><input type="radio" name="pay" checked={payment === pm} onChange={() => setPayment(pm)} className="accent-ocean-950" />{t.paymentMethod[pm]}</label>)}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-mute">{q.has_catch_weight ? t.checkout.payNoteCatch : t.checkout.payNote}</p>
              <div className="mt-5">
                <p className="label"><Tag className="mr-1 inline h-3.5 w-3.5" />{t.checkout.promo}</p>
                <div className="flex gap-2">
                  <input className="input min-w-0 flex-1 uppercase" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder={t.checkout.promoPlaceholder} />
                  <button type="button" onClick={checkPromo} disabled={checkingPromo} className="btn-secondary flex-none whitespace-nowrap">{checkingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : t.checkout.apply}</button>
                </div>
                {promo && <p className="mt-1.5 text-xs font-bold text-success-600">{promo.code}: {promo.description}</p>}
                {promoMsg && <p className="mt-1.5 text-xs text-coral-600">{promoMsg}</p>}
              </div>
              <div className="mt-5"><Field label={t.checkout.note}><textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.checkout.notePlaceholder} /></Field></div>
            </section>
            <button type="button" onClick={() => setStep(1)} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> {t.checkout.prev}</button>
          </>
        )}
      </div>

      <aside className="min-w-0 lg:col-span-5">
        <div className="card sticky top-32 p-5">
          <h2 className="text-lg text-ocean-950">{t.checkout.summary}</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {q.lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3 py-2">
                <span className="min-w-0"><span className="block truncate font-semibold">{locale === "en" && l.product.name_en ? l.product.name_en : l.product.name} <span className="text-mute">{pick(locale, l.variant.label, l.variant.label_en)}</span></span><span className="text-xs text-mute">{l.qty} {t.unit[l.variant.unit]}{l.prep ? ` · ${pick(locale, l.prep.label, l.prep.label_en)}` : ""}{l.product.is_catch_weight ? " · ±" : ""}</span></span>
                <span className="whitespace-nowrap font-bold">{rupiah(l.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4"><MinOrderBar subtotal={q.subtotal} min={q.min_order} /></div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-mute">{t.cart.subtotal}</dt><dd>{rupiah(q.subtotal)}</dd></div>
            {q.discount > 0 && <div className="flex justify-between text-success-600"><dt>{t.checkout.discount} {promo?.code}</dt><dd>−{rupiah(q.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-mute">{t.cart.shipping}</dt><dd>{areaId ? (q.delivery_fee ? rupiah(q.delivery_fee) : <span className="font-bold text-success-600">{t.common.free}</span>) : "—"}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base"><dt className="font-bold">{t.shop.total} {q.has_catch_weight && <span className="text-xs font-normal text-mute">({t.common.estimated})</span>}</dt><dd className="text-xl font-bold text-ocean-950">{rupiah(q.total)}</dd></div>
          </dl>
          {q.errors.length > 0 && <div className="mt-3 rounded-xl bg-coral-50 px-3 py-2 text-xs text-coral-700">{q.errors.map((e) => <p key={e}>{e}</p>)}</div>}
          {error && <div className="mt-3 rounded-xl bg-coral-50 px-3 py-2 text-sm text-coral-700">{error}</div>}
          {step === 2 ? (
            <button type="button" onClick={submit} disabled={!canSubmit} className="btn-accent mt-4 w-full py-3 text-base">{pending ? <Loader2 className="h-5 w-5 animate-spin" /> : t.checkout.placeOrder}</button>
          ) : (
            <p className="mt-4 text-xs text-mute">{steps[step + 1] ? `${t.checkout.next}: ${steps[step + 1]}` : ""}</p>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs text-mute"><ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-tide-600" />{t.checkout.guarantee}</p>
        </div>
      </aside>
    </div>
  );
}
