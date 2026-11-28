# Dipasaria: recommendations, round 2

**Date:** 28 November 2026 · **Basis:** the platform at commit `d6ba756` on branch `claude/amazing-cori-ggmx09` · **Follows** `docs/strategic-assessment.md` (24 November), whose item numbers (D1, O4, C3 …) are kept here.

Effort figures are my build estimates in working days. Running costs come from public sources checked on 28 November 2026; third-party figures are marked "to confirm".

---

## 1. Summary

Since the first assessment, seven of its 22 items are built:
- retention metrics;
- ratings;
- the morning brief;
- the trader's-pick box and gift orders;
- seasonal pre-orders;
- the restaurant sales kit;
- virtual accounts and refund records.

What the platform does is no longer the main constraint. Four things now matter more than more features.

1. **It has still not taken a real order.** Go-live validation (first assessment, section 3) is still priority 0. Everything below assumes it is done first.
2. **The site promises things the platform cannot yet back up.** The shop and restaurant pages say:
   - every lot is photographed ("dipilih dan difoto per lot");
   - the final invoice names the lot ("Tagihan akhir mencantumkan jenis, ukuran, dan lot");
   - halal certificates are available for every lot ("Sertifikat halal pemasok ayam tersedia untuk setiap lot").

   None of the three exists in the system. A hotel buyer who asks will find the gap. This is the cheapest credibility fix available, and it is also the strongest point of difference from a marketplace seller.
3. **Prices are fixed while auction costs move every day.** Catalogue prices change only when someone edits them. Quotations now lock contract prices for weeks. Meanwhile the buying log records what each kilogram actually cost this morning. Nothing connects the two, so a bad week at the auction can turn a contract unprofitable without anyone noticing.
4. **WhatsApp costs have probably risen.** Third-party sources say Meta has charged for service messages again since 1 October 2026: about Rp357 per message plus 11% VAT ([Qontak](https://help-center.qontak.com/hc/en-us/articles/48430892733465-Latest-WhatsApp-Message-Prices-October-2026), [ChatMaxima](https://chatmaxima.com/whatsapp-api-pricing/indonesia/)). I could not confirm this on Meta's own rate card. If it holds, the trigger for O4 (notification channel control) set in the first assessment is close to met.

**Top recommendations, in order**

| # | Recommendation | New or carried over | Why now | Effort |
|---|---|---|---|---|
| 0 | Go-live validation | Carried over | Nothing else is real until one order, payment, message and backup work in production | 1 day |
| 1 | **Daily pricing from auction cost, and contract margin watch** | New (N1) | Protects the 12% margin target now that quotations lock prices | 2–3 days |
| 2 | **Staff roles, driver and partner views** | D1 | Before anyone other than the owner gets a login | 5–6 days |
| 3 | **Lot record: photo, lot code, documents** | New (N2), absorbs D2 | Closes the gap between what the site promises and what the system does | 4–5 days |
| 4 | **Notification channel control** | O4 | WhatsApp now appears to charge for every order update | 3–4 days |
| 5 | **WhatsApp order reader for restaurants** | New (N3) | Restaurants already order by chat; this turns a chat into a priced draft order | 3–4 days |
| 6 | **Corporate gift orders for Lebaran** | New (N4) | Companies buy gifts in bulk weeks before Lebaran (around mid-March 2027); it must be ready by late January | 4–5 days |

Sections 2 to 4 give the new items, the off-the-shelf tools worth adopting, and where the remaining first-assessment items stand. Section 5 gives the order.

---

## 2. New recommendations

### N1. Daily pricing from auction cost, and contract margin watch

**What it is**
- A **Harga hari ini** screen for the owner after the auction. For each product, it shows:
  - this morning's cost per kg from the buying log;
  - the current household and wholesale prices;
  - the margin each price gives;
  - a suggested price that keeps the target margin (12% by default, settable).

  Prices update with one tap per product, or all at once. Prices only change when the owner confirms; nothing moves on its own.
- **Contract margin watch.** Every contract price is checked against the average purchase cost of the last 7 days. Contracts that fall under the target appear on the dashboard and in the morning brief, with the restaurant, product and margin.
- The quotation editor uses recent purchase cost instead of the fixed cost field, so a quotation is priced against today's market.

**Benefit**
- Margin is protected daily, not only when someone remembers to edit prices.
- The owner sees which contracts to renegotiate before they lose money.

**Feasibility and cost**
- High. The buying log already holds quantity and total cost per product per day; prices and contract prices are already editable.
- 2–3 days. Running cost: none.

### N2. Lot record: photo, lot code and documents (absorbs D2)

**What it is**
- **Lot entries.** When the owner logs a purchase on Belanja subuh, they can take a photo with the phone. The purchase gets a short lot code (for example `MB-1128-07`). Each photo is reduced in the browser to about 200 KB.
- **On the product page:** "Foto lot pagi ini" shows today's photo and the auction time, for products bought this morning.
- **On packing and invoices:**
  - At packing, each order line is matched to the day's lot of that product. It is matched automatically when there is only one lot.
  - The final invoice and the route sheet show the lot code. This makes the "lot named on the invoice" promise true.
- **Document files.** Halal and NKV certificates from the chicken suppliers are uploaded once per supplier with their validity dates. Each lot links to its supplier's current certificate. Restaurants can download it from the invoice link. The morning brief warns 30 days before a certificate expires.
- **Optional cold-chain readings:** temperature at packing and at dispatch, recorded on the route sheet. This is part of the original D2.

**Benefit**
- Backs up three claims the site already makes.
- Gives larger kitchens and hotels the food-safety records they ask for.
- A marketplace seller cannot copy it, because it depends on buying at the auction.

**Feasibility and cost**
- High. It builds on the buying log and the signed links already in place.
- It needs file storage. Supabase's free plan includes 1 GB, with a 50 MB limit per file ([pricing](https://supabase.com/pricing.md), [file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)). At about 200 KB per photo and 15 lots a day, that lasts roughly a year. After that, delete photos older than six months, or move to the Pro plan (US$25 a month, 100 GB included).
- 4–5 days.

### N3. WhatsApp order reader for restaurants

**What it is**
- Restaurants already order by WhatsApp in free text, for example: "kakap 5 kg disiangi, udang 40 3 kg, telur 2 rak buat besok pagi". Today someone types that into the system.
- **Phase 1 (3–4 days):**
  - In the back-office, the owner pastes the message and picks the restaurant.
  - Claude reads it and returns a draft order: catalogue size, quantity, preparation and delivery day, at the restaurant's own prices.
  - Anything it is unsure of is flagged ("udang 40: did you mean Udang Vaname 40 ekor/kg?").
  - The owner checks it and places it with one tap.
  - Nothing is ordered without a person confirming.
- **Phase 2 (about 3 days, after phase 1 has proved accurate):** messages from approved restaurant numbers to the business WhatsApp number become drafts automatically, through the Cloud API's inbound webhook. The restaurant gets the draft back to confirm, with a link.
- Voice notes come later. They need a separate speech-to-text service, so this waits until text works.

**Benefit**
- The restaurant keeps ordering the way it already does, while the business gets a priced, recorded order.
- Typing errors from re-keying orders go away.
- It works alongside the existing ordering pages, so restaurants are not forced onto them.

**Model and cost (estimate)**
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`), using structured output so the answer always fits the order format.
- **Per call:** the catalogue (about 5.000 tokens) is sent with each request and cached; one order message is a few hundred tokens; the answer, including the model's reasoning at low effort, is up to about 1.000 tokens.
- **Prices:** US$4 per million input tokens, US$0,20 per million cached input tokens, US$20 per million output tokens.
- **Result:** about US$0,02–0,03 per order, or roughly **Rp350–500** at about Rp16.500 per US dollar (check the current rate). That is about the cost of one WhatsApp message.
- **Cheaper option:** Claude Haiku 5.5 costs a small fraction of that. It is worth trying only if a test on 50 real past orders shows it reads them as well. That is your choice once the test exists.
- Running cost otherwise: an Anthropic API key.

### N4. Corporate gift orders (bulk, many recipients)

**What it is**
- A company orders gifts for 20–200 recipients in one order. For example: a frozen premium box of salmon, tiger prawns and sambal for Lebaran or Chinese New Year.
- The company uploads a spreadsheet of names, addresses, phone numbers and card text. The platform:
  - checks every address against the delivery areas;
  - spreads deliveries across the campaign's days and slots;
  - creates one gift order per recipient (gift orders already exist) under one parent order;
  - bills the company once, by virtual account or tempo.
- The company gets one delivery report with delivered time and recipient for each address.

**Benefit**
- A seasonal B2B revenue stream at a higher order value. Lebaran gift parcels are an established buying habit.
- It reuses gifts, pre-order campaigns, virtual accounts and quotations, which together cover most of the flow.

**Feasibility and cost**
- Medium-high. The new parts are the spreadsheet check, the parent order and the delivery report.
- 4–5 days. Packing capacity is the real limit: cap recipients per day in the campaign.
- **Timing:** Ramadan starts in mid-February 2027 and Lebaran is around the second week of March. Companies decide on gifts weeks ahead, so this should be live by late January. Please check the exact dates against the official calendar.

### N5. Daily price card

**What it is**
- After the auction, one tap produces an image (and a PDF for restaurants) titled "Tangkapan & harga hari ini". It shows:
  - today's available fish with sizes and prices, in household and wholesale versions;
  - the order cut-off;
  - a link to the shop.

  The owner posts it to WhatsApp Status, Instagram and restaurant groups.

**Benefit**
- The cheapest repeat-order channel: posting a Status or to a group costs nothing per recipient, unlike a broadcast (C3).
- Restaurants are used to a daily price list from their supplier.

**Feasibility and cost**
- High. Today's products and prices are already known after N1.
- 1–2 days. Running cost: none.

### N6. Pack-and-scan labels

**What it is**
- At packing, a small thermal printer prints a label for each bag. The label shows:
  - the order code and the bag number;
  - the items, storage temperature and lot code;
  - a QR code.
- At dispatch, the driver scans each bag with a phone. The route sheet shows any order whose bags are not all scanned.

**Benefit**
- Fewer "missing item" and "wrong item" guarantee claims. Both reasons already exist in the guarantee form, so the effect can be measured.
- Packing can be handed to staff safely. Pairs with D1.

**Feasibility and cost**
- High. 3 days.
- A Bluetooth thermal label printer costs a few hundred thousand rupiah (to confirm), plus label rolls.
- **Trigger:** about 20 drops a day, or the first person packing other than the owner.

### N7. Frozen stock batches and expiry

**What it is**
- Frozen and shelf-stable products are received in batches, each with its own expiry date. Stock is drawn first-expiry-first-out, and every product gets a reorder point.
- The morning brief lists:
  - batches within 30 days of expiry, which can become a clearance offer (C3);
  - products below their reorder point.

**Benefit**
- Less written-off frozen stock.
- No more running out of the value boxes' components.

**Feasibility and cost**
- Medium. Stock is a single number per size today, so this changes how stock is taken.
- 3–4 days. None.
- **Trigger:** frozen stock worth more than about a week of frozen sales, or the first expired write-off.

### N8. Chef's yield and portion-cost calculator

**What it is**
- A public page for restaurant buyers. They pick a fish, size and preparation, and see:
  - the usable yield (the share of meat after filleting, as already noted on preparation options, for example ±45%);
  - the cost per usable kilogram;
  - the cost per portion at a portion size they choose.

  All at today's wholesale price.
- It ends with "Minta penawaran", which opens a quotation request.

**Benefit**
- A reason for chefs to visit, share and return.
- Search content for restaurant buyers.
- It feeds the sales kit.

**Feasibility and cost**
- High. Yields are already in the preparation notes and prices are live.
- 2 days. None.

---

## 3. Off-the-shelf tools to adopt (no build)

| Tool | Why | Cost |
|---|---|---|
| **External uptime monitor** on `/api/health` (UptimeRobot, Better Stack, or similar) | The platform reports its own errors, but cannot report that it is down. An outside check every few minutes sends a message when it stops answering | Free tiers exist; check current plans |
| **Google Search Console and Business Profile** | The sitemap and product data are built; Google needs to be told. The Business Profile adds Maps visibility and public reviews | Free |
| **Accounting app (Jurnal or Accurate)** | Pairs with O5 (accounting export). The tax fields from the sales kit are ready for it | Paid subscription; ask your accountant which they use |
| **Password manager and two-step sign-in** on Supabase, Vercel, Midtrans, Meta and the domain registrar | One stolen password on any of these is a lost business. This matters more than any feature | Free to low cost |
| **Meta Business verification** | Needed for the WhatsApp Cloud API at volume, and for approved marketing templates (C3) | Free |
| **Bluetooth thermal label printer** | For N6 | One-off; a few hundred thousand rupiah (to confirm) |

---

## 4. Where the first assessment's remaining items stand

| # | Item | Status now |
|---|---|---|
| D1 | Staff roles, driver and partner views | **Recommended now (#2).** Trigger unchanged: before any second login |
| O4 | Notification channel control | **Recommended now (#4)**, if Meta's rate card confirms that order updates are charged |
| C3 | Daily-catch broadcast, win-back, clearance | Next after N5. Trigger: about 200 opted-in customers. N5 covers the free channel first |
| D2 | Traceability and cold-chain record | Absorbed into N2 |
| O3 | Supplier scorecard | After four weeks of buying-log entries. N2's lot codes make it more precise |
| C4 | Par-level ordering, several users per restaurant | Trigger unchanged (three restaurants ordering four or more days a week). N3 may cover the need first |
| O5 | Accounting export | When the accountant asks; the tax fields are now in place |
| D3 | Delivery pricing by slot | When one slot is regularly full and another empty |
| O6 | Buying forecast | After 8–12 weeks of buying-log data, with shrinkage above 4% |
| C5 | Referral credit | After retention numbers show the baseline (now measured on Laporan) |
| C6 | Speed pass | After go-live, measured on production |
| R4 | Ready-to-cook kits | When a preparation partner is in place |
| R5 | Delivery membership | Test with a promo code first |
| D4 | Courier for out-of-zone areas | When out-of-zone requests arrive weekly |
| R6 | Partner products | After the core range sells steadily |

---

## 5. Scoring and sequence

Scored as before, 1 to 5 on impact, feasibility and cost-effectiveness.

| Rank | # | Initiative | Impact | Feasibility | Cost-effectiveness | Total |
|---|---|---|---|---|---|---|
| 1 | N1 | Daily pricing and contract margin watch | 5 | 5 | 5 | 15 |
| 2 | N2 | Lot record: photo, lot code, documents | 4 | 4 | 5 | 13 |
| 3 | N5 | Daily price card | 3 | 5 | 5 | 13 |
| 4 | D1 | Staff roles and views | 4 | 4 | 3 | 11 |
| 5 | N3 | WhatsApp order reader | 4 | 4 | 3 | 11 |
| 6 | N4 | Corporate gift orders | 4 | 4 | 3 | 11 |
| 7 | O4 | Notification channel control | 3 | 3 | 4 | 10 |
| 8 | N8 | Chef's yield calculator | 2 | 5 | 3 | 10 |
| 9 | N6 | Pack-and-scan labels | 3 | 4 | 3 | 10 |
| 10 | N7 | Frozen batches and expiry | 3 | 3 | 3 | 9 |

D1 ranks below its score's neighbours in importance only until a second person needs a login; then it comes first.

**Suggested sequence**

| When | Work | Build days |
|---|---|---|
| Week 0 | Go-live validation; the tools in section 3 | 1 |
| Weeks 1–2 | N1 daily pricing and margin watch, N5 daily price card | 3–5 |
| Weeks 3–4 | N2 lot record; D1 staff roles if a hire is planned | 4–11 |
| Weeks 5–6 | N4 corporate gift orders (live by late January for Lebaran), O4 if confirmed | 4–9 |
| Weeks 7–8 | N3 WhatsApp order reader, phase 1 | 3–4 |
| Later | N6, N7, N8 and the remaining first-assessment items, each at its trigger | — |

---

## 6. What I would still not build

The list in section 8 of the first assessment stands. Three additions:

| Idea | Why not |
|---|---|
| A chatbot that answers customers on its own | N3 drafts orders for a person to confirm. An unsupervised bot taking orders and answering complaints puts the reputation at risk for little saving at this volume |
| Automatic price changes without the owner confirming | Prices are a commercial decision; N1 suggests and the owner decides |
| Voice-note ordering before text ordering works | Adds a speech-to-text service and a second error source; prove N3 on text first |

---

## Sources

- Supabase, [Pricing](https://supabase.com/pricing.md) and [Storage file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- Meta, [Pricing on the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) (the model; Indonesia rates not confirmed there)
- Mekari Qontak, [Latest WhatsApp message pricing (October 2026)](https://help-center.qontak.com/hc/en-us/articles/48430892733465-Latest-WhatsApp-Message-Prices-October-2026) (third party)
- ChatMaxima, [WhatsApp API pricing Indonesia](https://chatmaxima.com/whatsapp-api-pricing/indonesia/) (third party)
- Anthropic model prices: current Claude API price list for Claude Opus 5.5 and Claude Haiku 5.5 (check before budgeting)
