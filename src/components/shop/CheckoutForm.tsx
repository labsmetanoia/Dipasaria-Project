"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { track } from "@/components/Track";
import { useRouter } from "next/navigation";
import { Loader2, Tag, ShieldCheck, ArrowRight, ArrowLeft, Check } from "lucide-react";
import type { Substitution } from "@/lib/types";
import type { BusinessAccount, CustomerAddress, DeliveryArea, DeliverySlot, PaymentMethod, Product, Promo, Settings } from "@/lib/types";
import Link from "next/link";
import { availableDates, quote, segmentOf, slotsForSegment } from "@/lib/pricing";
import { isValidPhone, nowJakarta, relativeDayLabel, rupiah, jam, jamRange, qtyUnit } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { useCart } from "@/store/cart";
import { placeOrderAction, quoteCart } from "@/actions/shop";
import { Field } from "@/components/ui";
import { MinOrderBar } from "./CartView";
import { Turnstile, useTurnstileOn } from "@/components/Turnstile";

/** A signed-in household customer: verified phone and saved addresses. */
export interface Household { phone: string; name: string; addresses: CustomerAddress[] }
/** A restaurant's tempo position at checkout: what it owes now, its limit, and an overdue invoice that blocks tempo. */
export interface TermsInfo { balance: number; limit: number | null; overdue: string | null }
interface Props { products: Product[]; settings: Settings; areas: DeliveryArea[]; slots: DeliverySlot[]; slotUsage: Record<string, number>; account: BusinessAccount | null; household?: Household | null; termsInfo?: TermsInfo | null }

export function CheckoutForm({ products, settings, areas, slots, slotUsage, account, household = null, termsInfo = null }: Props) {
 const { t, locale } = useT();
 const en = locale === "en";
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
 const [waOptIn, setWaOptIn] = useState(true);
 const [address, setAddress] = useState("");
 const [maps, setMaps] = useState("");
 const [areaId, setAreaId] = useState("");
 const [addrId, setAddrId] = useState<string>("new"); // saved address chosen, or "new"
 const [saveNew, setSaveNew] = useState(true);
 const [newLabel, setNewLabel] = useState("");
 const [date, setDate] = useState(dates[0]);
 const turnstileOn = useTurnstileOn();
 const [tsToken, setTsToken] = useState<string | null>(null);
 const [tsReset, setTsReset] = useState(0);
 const [slotId, setSlotId] = useState("");
 const [payment, setPayment] = useState<PaymentMethod>("qris");
 const [note, setNote] = useState("");
 const [subst, setSubst] = useState<Substitution>("contact");
 // gift: sent to someone else, paid by the buyer; the name and address fields become the recipient's
 const [gift, setGift] = useState(false);
 const [giftPhone, setGiftPhone] = useState("");
 const [giftMsg, setGiftMsg] = useState("");
 const [giftFrom, setGiftFrom] = useState("");
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
 setPayment(account.payment_terms !== "prepaid" && !termsInfo?.overdue ? "terms" : account.allow_cod ? "cod" : "qris");
    } else {
 setSlotId(segSlots[0]?.id ?? "");
 if (household) {
 setPhone(household.phone);
 const d = household.addresses.find((a) => a.is_default) ?? household.addresses[0];
 if (d) pickAddress(d); else setName((v) => v || household.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id]);

 // Saved household details arrive when the persisted cart has loaded from the device, which can be after the first
 // render: fill them in once they are there, without overwriting anything the customer has started typing.
 const prefilled = useRef(false);
 useEffect(() => {
 if (account || household || prefilled.current || !(customer.name || customer.phone || customer.address)) return;
 prefilled.current = true;
 setName((v) => v || customer.name); setPhone((v) => v || customer.phone); setAddress((v) => v || customer.address);
 setMaps((v) => v || customer.maps_url); setAreaId((v) => v || customer.area_id || "");
  }, [account, household, customer]);

 function pickAddress(a: CustomerAddress) {
 setAddrId(a.id); setName(a.recipient || household?.name || ""); setAddress(a.address); setAreaId(a.area_id ?? ""); setMaps(a.maps_url ?? "");
 }

 // One idempotency key per checkout visit: a double tap or a network retry returns the same order instead of a second one.
 const clientRef = useRef<string>("");
 if (!clientRef.current) clientRef.current = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
 const submitting = useRef(false);

 const q = useMemo(() => quote({ settings, products, areas, promos: promo ? [promo] : [], account, now }, { lines, area_id: areaId, promo_code: promo?.code, delivery_date: date }), [settings, products, areas, promo, account, now, lines, areaId, date]);
  // Same rule as the database: tempo is refused for an overdue invoice, or when this order would pass the credit limit.
  const termsRoom = termsInfo && termsInfo.limit !== null ? Math.max(0, termsInfo.limit - termsInfo.balance) : null;
  const termsProblem = !termsInfo ? null : termsInfo.overdue ?? (termsRoom !== null && q.total > termsRoom
    ? (locale === "en" ? `This order is above your remaining tempo credit (${rupiah(termsRoom)}). Choose another payment method or contact us.` : `Pesanan ini melebihi batas kredit tempo akun Anda (sisa ${rupiah(termsRoom)}). Pilih metode pembayaran lain atau hubungi kami.`)
    : null);
 const payOptions: PaymentMethod[] = ["qris", "transfer"];
 if (segment === "business" && account?.allow_cod) payOptions.push("cod");
 if (segment === "business" && account && account.payment_terms !== "prepaid") payOptions.push("terms");

 const checkPromo = () => {
 if (!promoCode.trim()) return;
 startPromo(async () => {
 const r = await quoteCart({ lines, area_id: areaId, promo_code: promoCode, phone });
 if (r.promo) { setPromo(r.promo); setPromoMsg(null); } else { setPromo(null); setPromoMsg(r.promo_error ?? "Kode promo tidak ditemukan."); }
    });
  };
 const step1ok = Boolean(name.trim() && isValidPhone(phone) && address.trim() && areaId && (!gift || isValidPhone(giftPhone)));
 const step2ok = Boolean(date && slotId);
 const needHuman = turnstileOn && !account && !household;
 const canSubmit = mounted && lines.length > 0 && q.min_order_met && q.errors.length === 0 && step1ok && step2ok && !pending && (!needHuman || Boolean(tsToken)) && !(payment === "terms" && termsProblem);

 const submit = () => {
 if (submitting.current) return; // synchronous guard: the disabled state only applies after a re-render
 submitting.current = true;
 setError(null);
 start(async () => {
 const r = await placeOrderAction({ lines, customer_name: name, phone, address, area_id: areaId, maps_url: maps, delivery_date: date, slot_id: slotId, payment_method: payment, promo_code: promo?.code, customer_note: note, client_ref: clientRef.current, wa_opt_in: waOptIn, substitution: subst, gift: gift ? { recipient_phone: giftPhone, message: giftMsg, from: giftFrom } : null }, { turnstileToken: tsToken, saveAddress: household && addrId === "new" && saveNew ? { label: newLabel } : null });
 if (!r.ok) { submitting.current = false; setError(r.error); setTsReset((n) => n + 1); return; }
 if (!account && !gift) saveCustomer({ name, phone, address, area_id: areaId, maps_url: maps }); // a gift address is not "my" address
 rememberOrder({ code: r.data.code, phone: r.data.phone, at: new Date().toISOString() });
 clear();
 router.push(`/pesanan/${r.data.code}?hp=${r.data.phone}&baru=1`);
    });
  };

 // visit funnel: reaching checkout with something in the cart (counted once per visit)
 useEffect(() => { if (mounted && lines.length > 0) track("checkout_start"); }, [mounted, lines.length]);
 if (!mounted) return <div className="h-64 animate-pulse bg-sand-100" />;
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
              <h2 className="text-lg text-ocean-950">{gift ? (en ? "Recipient and sender" : "Penerima dan pengirim") : t.checkout.recipient}</h2>
              {segment === "retail" && (
                <label className="mt-3 flex items-start gap-2 border border-line bg-sand-50 px-3 py-2.5 text-sm"><input type="checkbox" checked={gift} onChange={(e) => { setGift(e.target.checked); if (e.target.checked && payment === "cod") setPayment("qris"); }} className="mt-0.5 accent-ocean-950" />
                  <span><b>{en ? "Send as a gift" : "Kirim sebagai hadiah"}</b><span className="block text-xs text-mute">{en ? "We deliver to someone else with your card message and no prices in the parcel. You pay; order updates come to your WhatsApp." : "Kami antar ke orang lain dengan kartu ucapan Anda dan tanpa nota harga di dalam paket. Anda yang membayar; kabar pesanan dikirim ke WhatsApp Anda."}</span></span>
                </label>
              )}
              {!account && !household && <p className="mt-1 text-xs text-mute">{t.checkout.loginHint} <Link href="/akun?next=/checkout" className="font-semibold text-gold-ink">{t.checkout.loginLink}</Link></p>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={gift ? (en ? "Recipient's name" : "Nama penerima hadiah") : segment === "business" ? t.checkout.businessName : t.checkout.name}><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete={gift ? "off" : "name"} /></Field>
                <Field label={gift ? (en ? "Your WhatsApp number (for order updates)" : "Nomor WhatsApp Anda (untuk kabar pesanan)") : t.checkout.phone} hint={gift ? undefined : t.checkout.phoneHint}><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx xxxx xxxx" autoComplete="tel" disabled={Boolean(account || household)} /></Field>
              </div>
              {gift && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label={en ? "Recipient's WhatsApp (for the courier only)" : "Nomor WhatsApp penerima (hanya untuk kurir)"}><input className="input" inputMode="tel" value={giftPhone} onChange={(e) => setGiftPhone(e.target.value)} placeholder="08xx xxxx xxxx" /></Field>
                  <Field label={en ? "From (name on the card)" : "Dari (nama di kartu)"}><input className="input" value={giftFrom} onChange={(e) => setGiftFrom(e.target.value)} maxLength={60} placeholder={en ? "e.g. Rina & family" : "mis. Rina sekeluarga"} /></Field>
                  <div className="sm:col-span-2"><Field label={en ? "Card message (optional)" : "Pesan di kartu ucapan (opsional)"}><textarea className="input min-h-20" value={giftMsg} onChange={(e) => setGiftMsg(e.target.value)} maxLength={300} placeholder={en ? "Happy Chinese New Year, Mum and Dad!" : "Selamat Tahun Baru Imlek, Papa dan Mama!"} /></Field><p className="mt-1 text-right text-[11px] text-mute">{giftMsg.length}/300</p></div>
                </div>
              )}
              <label className="mt-3 flex items-start gap-2 text-sm text-ink/80"><input type="checkbox" checked={waOptIn} onChange={(e) => setWaOptIn(e.target.checked)} className="mt-0.5 accent-ocean-950" />{t.checkout.waOptIn}</label>
            </section>
            <section className="card p-5">
              <h2 className="text-lg text-ocean-950">{t.checkout.address}</h2>
              {household && household.addresses.length > 0 && (
                <div className="mt-4 space-y-2" role="radiogroup" aria-label={t.checkout.savedAddresses}>
                  {household.addresses.map((a) => (
                    <label key={a.id} className={`flex cursor-pointer items-start gap-2 border px-3 py-2.5 text-sm ${addrId === a.id ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}>
                      <input type="radio" name="addr" checked={addrId === a.id} onChange={() => pickAddress(a)} className="mt-0.5 accent-ocean-950" />
                      <span><b>{a.label}</b>{a.recipient ? ` · ${a.recipient}` : ""}<br /><span className="text-mute">{a.address}{a.area_id ? ` · ${areas.find((x) => x.id === a.area_id)?.name ?? ""}` : ""}</span></span>
                    </label>
                  ))}
                  <label className={`flex cursor-pointer items-center gap-2 border px-3 py-2.5 text-sm ${addrId === "new" ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}>
                    <input type="radio" name="addr" checked={addrId === "new"} onChange={() => { setAddrId("new"); setAddress(""); setMaps(""); setAreaId(""); }} className="accent-ocean-950" />{t.checkout.newAddress}
                  </label>
                </div>
              )}
              <div className="mt-4 space-y-4">
                <Field label={t.checkout.area}><select className="input" value={areaId} onChange={(e) => setAreaId(e.target.value)}><option value="">{t.checkout.chooseArea}</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name} · {t.checkout.fee} {rupiah(a.fee)}</option>)}</select></Field>
                <Field label={t.checkout.fullAddress}><textarea className="input" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.checkout.addressPlaceholder} /></Field>
                <Field label={t.checkout.maps}><input className="input" value={maps} onChange={(e) => setMaps(e.target.value)} placeholder="https://maps.app.goo.gl/…" /></Field>
                {household && addrId === "new" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="accent-ocean-950" />{t.checkout.saveAddress}</label>
                    {saveNew && <input className="input w-40 py-1.5 text-sm" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={t.checkout.addressLabel} aria-label={t.checkout.addressLabel} maxLength={30} />}
                  </div>
                )}
              </div>
            </section>
            <button type="button" disabled={!step1ok} onClick={() => setStep(1)} className="btn-primary w-full sm:w-auto">{t.checkout.next} <ArrowRight className="h-4 w-4" /></button>
          </>
        )}

        {step === 1 && (
          <>
            <section className="card p-5">
              <h2 className="text-lg text-ocean-950">{t.checkout.schedule}</h2>
              <p className="mt-1 text-xs text-mute">{fmt(t.checkout.cutoffNote, { time: jam(settings.cutoff_time) })}</p>
              <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 scrollbar-none">
                {dates.map((d) => <button key={d} type="button" onClick={() => setDate(d)} className={`chip flex-none ${date === d ? "chip-on" : ""}`}>{relativeDayLabel(d, now.date, locale)}</button>)}
              </div>
              <div className="mt-4 space-y-2">
                {segSlots.map((s) => {
 const left = s.capacity - (slotUsage[`${date}|${s.id}`] ?? 0);
 const full = left <= 0;
 return (
                    <label key={s.id} className={`flex cursor-pointer items-center justify-between border px-3.5 py-3 text-sm ${full ? "cursor-not-allowed opacity-50" : slotId === s.id ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}>
                      <span className="flex items-center gap-2"><input type="radio" name="slot" disabled={full} checked={slotId === s.id} onChange={() => setSlotId(s.id)} className="accent-ocean-950" /><span><b>{jamRange(s.start_time, s.end_time)}</b> · {s.label}</span></span>
                      <span className={`text-xs ${full ? "text-gold-ink" : left <= 3 ? "text-warn-600" : "text-mute"}`}>{full ? t.checkout.full : fmt(t.checkout.slotsLeft, { n: left })}</span>
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
                {payOptions.map((pm) => <label key={pm} className={`flex cursor-pointer items-center gap-2 border px-3.5 py-3 text-sm ${payment === pm ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}><input type="radio" name="pay" checked={payment === pm} onChange={() => setPayment(pm)} className="accent-ocean-950" />{pm === "terms" && account ? `${t.paymentMethod.terms} · ${t.terms[account.payment_terms]}` : t.paymentMethod[pm]}</label>)}
              </div>
              {payOptions.includes("terms") && termsInfo && (termsProblem
                ? <p className="mt-3 border-l-4 border-coral-500 bg-coral-50 px-3 py-2 text-xs" role={payment === "terms" ? "alert" : undefined}>{termsProblem}</p>
                : termsRoom !== null && <p className="mt-3 text-xs text-mute">{locale === "en" ? "Tempo credit left" : "Sisa batas kredit tempo"}: <b className="text-ink">{rupiah(termsRoom)}</b></p>)}
              <p className="mt-3 text-xs leading-relaxed text-mute">{q.has_catch_weight ? t.checkout.payNoteCatch : t.checkout.payNote}</p>
              <div className="mt-5">
                <p className="label"><Tag className="mr-1 inline h-3.5 w-3.5" />{t.checkout.promo}</p>
                <div className="flex gap-2">
                  <input className="input min-w-0 flex-1 uppercase" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder={t.checkout.promoPlaceholder} />
                  <button type="button" onClick={checkPromo} disabled={checkingPromo} className="btn-secondary flex-none whitespace-nowrap">{checkingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : t.checkout.apply}</button>
                </div>
                {promo && <p className="mt-1.5 text-xs font-bold text-success-600">{promo.code}: {promo.description}</p>}
                {promoMsg && <p className="mt-1.5 text-xs text-gold-ink">{promoMsg}</p>}
              </div>
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-ink">{t.checkout.substTitle}</legend>
                <p className="text-xs text-mute">{t.checkout.substHint}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(["similar", "contact", "remove"] as const).map((k) => (
                    <label key={k} className={`flex cursor-pointer items-start gap-2 border px-3 py-2 text-sm ${subst === k ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}>
                      <input type="radio" name="subst" checked={subst === k} onChange={() => setSubst(k)} className="mt-0.5 accent-ocean-950" />{t.checkout.subst[k]}
                    </label>
                  ))}
                </div>
              </fieldset>
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
                <span className="min-w-0"><span className="block truncate font-semibold">{locale === "en" && l.product.name_en ? l.product.name_en : l.product.name} <span className="text-mute">{pick(locale, l.variant.label, l.variant.label_en)}</span></span><span className="text-xs text-mute">{qtyUnit(l.qty, l.variant.unit, locale)}{l.prep ? ` · ${pick(locale, l.prep.label, l.prep.label_en)}` : ""}{l.product.is_catch_weight ? " · ±" : ""}</span></span>
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
          {q.errors.length > 0 && <div className="mt-3 bg-coral-50 px-3 py-2 text-xs text-gold-ink">{q.errors.map((e) => <p key={e}>{e}</p>)}</div>}
          {error && <div className="mt-3 bg-coral-50 px-3 py-2 text-sm text-gold-ink">{error}</div>}
          {step === 2 ? (
            <>
              {needHuman && <div className="mt-4"><Turnstile action="checkout" onToken={setTsToken} resetKey={tsReset} /></div>}
              <button type="button" onClick={submit} disabled={!canSubmit} className="btn-accent mt-4 w-full py-3 text-base">{pending ? <Loader2 className="h-5 w-5 animate-spin" /> : t.checkout.placeOrder}</button>
            </>
          ) : (
            <p className="mt-4 text-xs text-mute">{steps[step + 1] ? `${t.checkout.next}: ${steps[step + 1]}` : ""}</p>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs text-mute"><ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-tide-600" />{t.checkout.guarantee}</p>
        </div>
      </aside>
    </div>
  );
}
