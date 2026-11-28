# Dipasaria — Strategic assessment of the platform

**Date:** 24 November 2026 · **Basis:** the platform on branch `claude/amazing-cori-ggmx09`, after the two audits and the features in `docs/audit-round-2.md` (sections 5 and 10–12) · **Supersedes** the ordering in `docs/roadmap-next.md`; item numbers from that document (N4, N5, …) are kept for reference.

> **Update, 24 November 2026:** priority 1 (C1 retention metrics and C2 ratings after delivery) is built, and so are O2 (morning brief) and R3 (trader's-pick box and gift orders), completing weeks 1–2 of the sequence; see `docs/audit-round-2.md`, sections 13 and 14. R1 (seasonal pre-orders, weeks 3–4) is built too, with an example New Year's Eve campaign; see section 15. So are R2 (restaurant sales kit) and O1 (virtual accounts and refund records), weeks 5–6; see section 16.
>
> **Follow-up, 28 November 2026:** `docs/strategic-assessment-2.md` adds new recommendations (daily pricing from auction cost, lot records, a WhatsApp order reader, corporate gift orders and others) and re-orders what remains.

Effort figures are my build estimates in working days. Running costs are from public sources checked on 24 November 2026; several are third-party summaries and are marked "to confirm" (section 7).

---

## 1. Summary

**The platform is now broader than the business that has run on it.** Everything a seafood trader of this size needs to take, price, buy for, deliver, bill and collect an order is built and tested. None of it has yet carried a real order: Supabase, Midtrans and the WhatsApp API have only been tested against local stand-ins.

That shapes the recommendation. The best next investments are the ones that:
- prove the platform in production;
- turn the data it now collects into decisions;
- add revenue without adding fixed cost.

More surface area comes after those.

**Top priorities, in order**

| # | Initiative | Why first | Effort |
|---|---|---|---|
| 0 | **Go-live validation** | One real order, payment, message and backup. Every other number in this document depends on it | 1 day |
| 1 | **Retention metrics and ratings** | The platform cannot yet say how many customers come back, or what they thought. Both are cheap, and every later growth decision needs them | 3–5 days |
| 2 | **Seasonal pre-orders** | The largest revenue spikes in Jakarta seafood are date-bound (New Year's Eve grilling, Chinese New Year, Ramadan and Lebaran). Today the shop sells a few days ahead (six by default), for the whole catalogue at once; it cannot offer a product for one occasion's dates | 3–4 days |
| 3 | **Restaurant sales kit and virtual-account payment** | Restaurants are the volume. Quotations, tax-invoice fields and a cheaper way to pay large invoices remove the remaining reasons to stay with a traditional supplier | 6–7 days |
| 4 | **Staff roles with driver and partner views** | The business cannot grow past one person while one login sees and changes everything | 5–6 days |
| 5 | **Daily-catch broadcast and clearance offers** | The cheapest repeat-order channel, and a way to turn leftover fish into sales instead of waste | 4–5 days |

Sections 4 to 6 give the full list, the scoring and the sequence. Section 8 lists what I would still not build.

---

## 2. Where the platform stands

| Who it serves | Built and tested | Still missing |
|---|---|---|
| **Households** | Bilingual shop, recipes with one-tap ingredients, guest or WhatsApp sign-in, saved addresses, substitution choice, QRIS with automatic confirmation, order tracking, delivery confirmation, two-hour freshness guarantee, back-in-stock alerts, weekly box | A reason to come back that reaches them (broadcasts, referral); a voice (ratings); ordering for a date further ahead |
| **Restaurants** | Approved accounts, wholesale and contract prices, standing orders with partial delivery, tempo with due dates, credit limits, statements and invoices | Several users per account; par-level ordering; quotations; tax-invoice fields; paying large invoices cheaply |
| **The owner** | Dawn buying list and buying log with real margin and shrinkage, weighing and re-pricing, route sheet with COD count, receivables ageing, guarantee decisions, reports with visit funnel, error alerts, verified backups, tests on every change | Anyone else being able to work in the system; a morning summary; supplier comparison; a buying forecast |
| **Staff, drivers, the cleaning partner, suppliers** | Nothing: they work from paper, WhatsApp or the owner's login | Their own limited views |
| **Search and partners** | Sitemap, structured data, Merchant Center feed, WhatsApp templates, payment gateway behind a swappable interface | Search Console and Business Profile set up; real traffic |

**Three structural observations**

1. **The platform measures cost well and customers poorly.** Margin, shrinkage, guarantee cost and receivables are all visible. Repeat rate, time between orders, order value per customer and satisfaction are not. Growth work without those is guesswork.
2. **Everything still runs through one person.** There is one admin login, the driver uses it, and the cleaning partner gets prep notes on paper. That is the binding constraint on service quality as volume grows, more than any missing customer feature.
3. **Revenue is tied to the next few days.** Orders are taken six days ahead by default (the setting allows up to 30), always from the whole of today's catalogue. The business cannot yet sell a date (a holiday), a commitment (a contract quote) or an occasion (a gift).

---

## 3. What must be proven first

**Go-live validation (priority 0, one day).** The checklist is in `README.md` ("Go live") and section 8 of `docs/audit-round-2.md`. The four things only production can prove:
- one real order placed, weighed, paid by QRIS in the Midtrans sandbox and then live;
- one automatic WhatsApp message delivered through the Cloud API, after the templates are approved;
- one nightly backup that restores;
- the scheduled jobs firing (expiry, standing orders and weekly boxes at 19.45).

Then run migrations 009–013, replace the placeholder bank account and WhatsApp number, set the real site address, and submit the sitemap in Search Console.

Until this is done, treat every estimate below as conditional.

---

## 4. Opportunities

Each is rated in section 5. "Running cost" is what it costs per month or per use once built; "none" means it runs on the current free or existing services.

### 4.1 Service delivery

| # | Initiative | What it is | Benefit | Feasibility and cost |
|---|---|---|---|---|
| D1 | **Staff roles, driver and partner views** (N5) | Roles for owner, packer, driver and finance. The driver gets the route and delivery buttons only. The cleaning partner gets a read-only prep sheet by signed link. An activity log of price, payment and weight changes. Two-step login for owner and finance | Work can be handed over safely; mistakes are traceable; a stolen password is not enough | High. Every page already checks admin rights in one place; signed links exist (statements). 5–6 days. Running cost: none |
| D2 | **Traceability and cold-chain record** (N13) | "Dilelang pagi ini di Muara Baru, pukul 04.10" on products and orders, from the buying log. Temperature noted at packing and dispatch. A one-page delivery record restaurants can file | An advantage a marketplace seller cannot copy; entry to hotels and larger kitchens that ask for food-safety records | High: the buying log already holds the supplier and time. 3 days. None |
| D3 | **Delivery pricing by slot** | A fee or discount per delivery slot, so quiet slots fill and full routes earn more | Better route use without more drivers | High: one field per slot in the fee rule. 1 day. None |
| D4 | **Courier for out-of-zone areas** (N17) | Courier rates at checkout for frozen and dry goods outside the fleet's areas | Sales beyond current routes | Medium: a courier integration, and only for goods that travel. 5 days. Per-shipment fee, paid by the customer |

### 4.2 Operational efficiency

| # | Initiative | What it is | Benefit | Feasibility and cost |
|---|---|---|---|---|
| O1 | **Virtual-account transfers and refund records** (N4) | Customers who pay by transfer get a virtual account for the exact amount, confirmed automatically like QRIS. Refunds are recorded with amount, date and proof | No more matching transfers by hand. For large invoices the fee is lower than QRIS (section 7) | High: another payment type in the gateway adapter already built. 3 days. About Rp4.000 per payment (to confirm) |
| O2 | **Owner's morning brief** | One message to the existing alert chat at 02.00: what to buy, standing orders and boxes that failed, guarantee claims waiting, receivables past due, yesterday's margin and shrinkage | The day's exceptions in one glance, before the auction | High: all figures exist. 1 day. None |
| O3 | **Supplier scorecard** | Per supplier, from the buying log and guarantee claims: price against the day's average, share of purchases, claims and waste traced to their lots | Better buying; a basis for negotiating | High. 1–2 days, useful after about four weeks of logged purchases. None |
| O4 | **Notification channel control** (part of N18) | Web push through the installed app as a free channel; per message type, choose WhatsApp, push, or push first with WhatsApp as fallback | Lower cost per order if WhatsApp charges every order update (section 7) | Medium: push works on Android and on installed iPhone apps only. 3–4 days. None |
| O5 | **Accounting export** (N16) | Daily sales, payments, refunds and purchase cost as files for Jurnal or Accurate | Saves bookkeeping hours each month | High. 1–2 days. None |
| O6 | **Buying forecast** (N15) | Suggested quantity per product for tomorrow, from confirmed orders, standing orders, boxes and weekday history, adjusted for shrinkage | Less waste, fewer sell-outs | Medium, and only after 8–12 weeks of buying-log data. 6–8 days. None |

### 4.3 Customer experience

| # | Initiative | What it is | Benefit | Feasibility and cost |
|---|---|---|---|---|
| C1 | **Retention metrics** | On the reports page: repeat rate, time between orders, average order value, customers by first-order month, and a list of customers who have gone quiet | Shows whether the shop keeps its customers; the basis for win-back and referral | High: computed from existing orders. 1–2 days. None |
| C2 | **Ratings after delivery** (N12) | One tap from the "delivered" message: 1–5 stars and a comment. Low ratings alert the owner and can open a guarantee claim. Stars shown on product pages and to Google | Early warning on quality; social proof; star ratings in search results | High: the delivered moment and the product data for Google both exist. 2–3 days. None |
| C3 | **Daily-catch broadcast, win-back and clearance offers** (N10) | After the auction, send the day's highlights to customers who opted in. Automatic message with a small voucher to lapsed customers. From the buying log's "leftover" entries, a one-tap clearance offer | Repeat orders from the cheapest channel; leftover fish sold instead of written off (shrinkage target: under 4%) | Medium: reuses the outbox and consent; needs marketing templates approved by Meta. 4–5 days. A marketing-message fee per recipient (section 7), so the tool must show the cost before sending |
| C4 | **Par-level ordering and several users per restaurant** (N8) | The chef types what is left; the order fills the difference to the par list. Chef, owner and finance each sign in with their own WhatsApp number | Ordering takes a minute at closing; shared access codes disappear; multi-outlet groups fit | Medium: reuses the household sign-in and reorder logic. 5–6 days. None |
| C5 | **Referral credit** (N14) | A personal link; store credit for both sides after the friend's first paid order | Cheaper household acquisition in apartment and office groups | Medium: needs a credit ledger applied in pricing. 4–5 days. The credit itself |
| C6 | **Speed pass** | The largest element appears at about 4 seconds on a slow phone (measured, section 12 of the audit). Work on the hero image, deferred scripts and font loading | Better experience for first-time visitors from search; Google's page-experience signals | Medium: needs measurement on production. 2 days. None |

### 4.4 New revenue streams

| # | Initiative | What it is | Benefit | Feasibility and cost |
|---|---|---|---|---|
| R1 | **Seasonal pre-orders** | A campaign page per occasion with its own products, a delivery-date range beyond the usual six days, limited quantities, payment in advance. First candidates: New Year's Eve grilling packs, Chinese New Year whole fish, Ramadan and Lebaran boxes | Demand known weeks ahead, bought to order, paid before the auction. The highest-value days of the year become plannable | High: the catalogue, stock limits and payment deadline exist; needs date-bound products and a campaign page. 3–4 days. None |
| R2 | **Restaurant sales kit** (with N16's tax fields) | A quotation as a PDF and a signed link, built from contract prices with a validity date; accepting it creates the contract prices. Tax-invoice fields (NPWP, address) on invoices and statements | Shortens the sale to hotels, caterers and groups, who buy on quotations and need tax invoices | High: contract prices, signed links and printable documents exist. 3–4 days. None |
| R3 | **Trader's-pick weekly box and gift boxes** | A weekly box whose contents the owner sets after seeing the week's auction; a box sent to another address with a message | A subscription only a trader at the auction can offer; gifting as a new occasion | High: the weekly box and address book carry it. About 1 day of build; mostly a product decision. None |
| R4 | **Ready-to-cook kits** | Marinated and portioned products, and kits built from the recipes, sold as single items that draw down their components' stock | Higher margin per kilogram; more non-seafood share | Medium: needs kit products that deduct component stock, and a preparation partner. 4–5 days of build. Preparation cost |
| R5 | **Delivery membership** | A monthly pass for free delivery and a reserved slot | Recurring revenue and loyalty | Medium: a membership flag, a fee waiver in pricing and a monthly payment. 4–5 days. Test first with a promo code before building |
| R6 | **Partner products** | A small range from chosen partners (vegetables, rice, sambal) bought to order | Larger baskets with no stock risk | Medium: purchase orders to partners, and more to pack. 5–6 days. Revisit after the core range sells steadily |

---

## 5. Priority ranking

Each initiative is scored 1 to 5 on three questions:
- **Impact:** how much revenue, cash or risk it moves.
- **Feasibility:** how well it fits what is built, and how little it depends on outside parties.
- **Cost-effectiveness:** build days and running cost against the benefit.

| Rank | # | Initiative | Impact | Feasibility | Cost-effectiveness | Total | Tier |
|---|---|---|---|---|---|---|---|
| 1 | C1 | Retention metrics | 4 | 5 | 5 | 14 | 1 |
| 2 | R1 | Seasonal pre-orders | 5 | 4 | 4 | 13 | 1 |
| 3 | C2 | Ratings after delivery | 3 | 5 | 5 | 13 | 1 |
| 4 | R3 | Trader's-pick and gift boxes | 3 | 5 | 5 | 13 | 1 |
| 5 | R2 | Restaurant sales kit | 4 | 4 | 4 | 12 | 1 |
| 6 | O1 | Virtual-account transfers, refund records | 3 | 5 | 4 | 12 | 1 |
| 7 | O2 | Owner's morning brief | 2 | 5 | 5 | 12 | 1 |
| 8 | O3 | Supplier scorecard | 3 | 5 | 4 | 12 | 2 |
| 9 | D1 | Staff roles, driver and partner views | 4 | 4 | 3 | 11 | 2 |
| 10 | C3 | Broadcast, win-back, clearance | 4 | 4 | 3 | 11 | 2 |
| 11 | D2 | Traceability and cold-chain record | 3 | 4 | 4 | 11 | 2 |
| 12 | O4 | Notification channel control | 3 | 3 | 4 | 10 | 2 |
| 13 | C4 | Par-level ordering, several users | 4 | 3 | 3 | 10 | 2 |
| 14 | D3 | Delivery pricing by slot | 2 | 5 | 3 | 10 | 3 |
| 15 | O5 | Accounting export | 2 | 5 | 3 | 10 | 3 |
| 16 | C6 | Speed pass | 3 | 3 | 3 | 9 | 3 |
| 17 | C5 | Referral credit | 3 | 3 | 3 | 9 | 3 |
| 18 | R4 | Ready-to-cook kits | 4 | 2 | 2 | 8 | 3 |
| 19 | O6 | Buying forecast | 4 | 2 | 2 | 8 | 3 |
| 20 | R5 | Delivery membership | 3 | 3 | 2 | 8 | 3 |
| 21 | D4 | Courier for out-of-zone areas | 2 | 3 | 2 | 7 | 3 |
| 22 | R6 | Partner products | 3 | 2 | 2 | 7 | 3 |

**Where the score alone would mislead**
- **D1 (staff roles) ranks ninth but has a hard trigger:** it must be done before anyone other than the owner is given a login. If a packer or driver starts next month, it moves to the top.
- **O4 (notification channels) depends on a price I could not confirm** (section 7). If WhatsApp charges for every order update, it moves into tier 1.
- **O6 (forecast) and O3 (supplier scorecard) need data, not code.** Their priority is to keep logging purchases, leftovers and waste every morning from the first day.

---

## 6. Suggested sequence

| When | Work | Build days | Why this order |
|---|---|---|---|
| Week 0 | Go-live validation | 1 | Nothing else is real until this is |
| Weeks 1–2 | C1 retention metrics, C2 ratings, O2 morning brief, R3 trader's-pick and gift boxes | 5–7 | Cheap, no outside dependency, and they start producing the data the next decisions need |
| Weeks 3–4 | R1 seasonal pre-orders, timed to the first occasion after go-live | 3–4 | A date cannot be moved. Open pre-orders three to four weeks before it |
| Weeks 5–6 | R2 restaurant sales kit, O1 virtual-account transfers | 6–7 | Both serve the segment with the most volume, and build on receivables |
| Weeks 7–9 | D1 staff roles and views, then C3 broadcasts and clearance | 9–11 | Roles before the first hire; broadcasts once the opted-in list is worth sending to |
| Quarter 2 | D2 traceability, O3 supplier scorecard, O4 channel control, C4 par-level ordering | 12–15 | Each has a trigger in section 9 |
| Later | Tier 3 | — | Only when its trigger is met |

**Dependencies**
- C3's win-back needs C1's list of quiet customers.
- C2's stars in search results use the product data built in round 12.
- O3 and O6 need the buying log filled in daily.
- R2's tax fields make O5 (accounting export) simpler; do them together if an accountant asks.

**Seasonal dates to plan for.** New Year's Eve is five weeks away. Chinese New Year falls in early February 2027, with Ramadan starting days after it and Lebaran around the second week of March. Please check the exact dates against the official calendar. If go-live slips past mid-December, aim R1 at Chinese New Year.

---

## 7. Costs to watch

The platform itself still costs nothing to run on free tiers. The variable costs are per message and per payment, and they matter at this margin.

**WhatsApp messages**
- Meta charges per delivered template message. Third-party summaries put Indonesia at about Rp357 per utility or authentication message and Rp586 per marketing message, plus 11% VAT.
- The same sources say that from 1 October 2026 utility messages are charged even inside an open customer conversation.
- I could not confirm either point on Meta's own rate card. Check it before budgeting.
- If those figures hold, an order that triggers five automatic messages costs about Rp2.000. On a Rp250.000 household order at 12% gross margin (Rp30.000), that is 6–7% of the margin.
- What to do now: in **Pengaturan → WhatsApp**, switch on only the messages customers act on (order received, final invoice, payment reminder, delivered). O4 is the structural answer.
- A broadcast to 500 customers would cost about Rp325.000 with VAT. That is worth it only if it brings two or three orders, which is why C3 must show cost and resulting orders per send.

**Payments**
- QRIS costs 0,7% of the amount. A virtual-account payment costs a flat fee of about Rp4.000 (third-party summaries of Midtrans pricing; confirm in your agreement).
- The two cost the same at about Rp570.000. Below that, QRIS is cheaper; above it, the virtual account is.
- On a Rp2.000.000 restaurant invoice, QRIS costs Rp14.000 and a virtual account Rp4.000. That is the case for O1: offer the virtual account to restaurants and for large orders, and keep QRIS for households.
- Bank Indonesia is reported to have announced a new QRIS fee scheme from 1 October 2026, with no fee on small payments. I could not verify how it applies to Dipasaria's merchant category. Ask Midtrans.

**Build cost.** Tier 1 is about 15–19 working days in total, tier 2 about 21–26.

---

## 8. What I would not build now

| Idea | Why not |
|---|---|
| Native iPhone and Android apps | The installable web app covers ordering; two more codebases and store fees before there is evidence customers want them |
| Live driver tracking on a map | Costly to build and run; "on the way" and "delivered" messages cover the need |
| Marketplace listings (Tokopedia, Shopee) | Commission and their courier networks do not suit fresh fish |
| A customer-service chatbot | Volume does not justify it; the order page and prepared WhatsApp replies answer the common questions |
| Automatic card or e-wallet debit for weekly boxes | Needs a recurring-payment product and a refund flow. Revisit only if unpaid boxes become a measured problem |
| Selling the platform to other traders | A different business, with support obligations. The advantage is the trading, not the software |
| A second hub (N19) | Touches stock, buying and routes. Only with a concrete expansion plan |
| Separate English pages for search | The Jakarta market searches in Indonesian; the toggle serves English readers who arrive |

---

## 9. How to decide: measures and triggers

**Five numbers to watch weekly from go-live**

| Number | Where it is | Target to aim for |
|---|---|---|
| Gross margin after actual purchase cost | Belanja subuh, Laporan | Above 12% |
| Shrinkage (leftover and waste against purchases) | Belanja subuh | Below 4% |
| Receivables past due as a share of the total | Piutang | Below 10% (my suggestion) |
| Visit-to-order conversion | Laporan → Corong kunjungan | Set a baseline in month one, then improve it |
| Repeat rate (customers ordering again within 30 days) | Laporan → Pelanggan kembali | Set a baseline |

**Triggers for the items that wait**

| Item | Build it when |
|---|---|
| D1 Staff roles | Before the first person other than the owner needs a login |
| O4 Notification channels | Meta's rate card confirms a charge on order updates, or the monthly WhatsApp bill passes about 1% of sales |
| C3 Broadcasts | About 200 customers have opted in |
| C4 Par-level ordering | Three or more restaurants order four or more days a week, or one asks for a second user |
| D2 Traceability | A hotel, caterer or group asks for food-safety records |
| O6 Buying forecast | Eight weeks of daily buying-log entries, with shrinkage still above 4% |
| R4 Ready-to-cook kits | A preparation partner is in place, and recipes show steady add-to-cart rates in the funnel |
| R5 Delivery membership | A free-delivery promo code tested for a month lifts order frequency enough to pay for itself |
| D4 Courier | Out-of-zone requests arrive weekly |

---

## Sources for the running-cost figures

- Meta, [Pricing on the WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/pricing) (the model; the Indonesia rates were not confirmed there)
- SleekFlow, [Simulasi biaya WhatsApp API dalam rupiah](https://sleekflow.io/id-id/blog/simulasi-biaya-whatsapp-api-dalam-rupiah-tarif-ppn-dan-tagihan-bulanan) (third-party rates for Indonesia)
- ChatMaxima, [WhatsApp API pricing Indonesia](https://chatmaxima.com/whatsapp-api-pricing/indonesia/) (third-party)
- Midtrans, [Biaya](https://docs.midtrans.com/docs/biaya) and [QRIS transaction fee](https://docs.midtrans.com/docs/what-is-the-applicable-transaction-fee-for-qris-1)
- Quasa, [Xendit vs Midtrans: biaya tetap Rp4.000](https://quasa.io/id/media/xendit-vs-midtrans-biaya-tetap-rp4000-mengubah-pilihan-bisnis-kecil) (third-party summary of the virtual-account fee)
- Bank Indonesia, [MDR QRIS](https://www.bi.go.id/id/publikasi/ruang-media/cerita-bi/Pages/mdr-QRIS.aspx)
- Google, [Supported languages and currencies](https://support.google.com/merchants/answer/160637) (Indonesia and rupiah in Merchant Center)
