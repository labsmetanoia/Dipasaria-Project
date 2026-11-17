# Dipasaria — Platform assessment and next recommendations

**Date:** 17 November 2026 · **Basis:** the platform as built on branch `claude/amazing-cori-ggmx09` (audit fixes plus roadmap items R2–R8 and R12; see `docs/audit-report.md`)

Effort figures are my build estimates in working days. "Feasibility" says how each item fits the existing architecture: Next.js server actions, Supabase SQL functions, and the repo interface with its two adapters.

---

## 1. Where the platform stands

**What is solid now**

| Area | Built |
|---|---|
| Storefront | Bilingual catalogue with photos; recipes with bundles; cart; three-step checkout; order tracking; PWA |
| Households | WhatsApp sign-in; order history; reorder; address book; consent; account deletion |
| Restaurants | Approved accounts with wholesale prices and payment terms; reorder; standing orders with partial delivery |
| Money | Server-side pricing; catch-weight weighing and final invoice; QRIS with automatic confirmation; payment deadline and expiry; refund-due flag |
| Operations | Dawn buying list; route and packing sheet; order state machine; WhatsApp notifications (automatic or one tap) |
| Safety | Admin checks on every page; rate limits and bot check; security headers; error log and alerts; health check; daily verified backups |

**Go-live validation comes before any new feature.** Four integrations have only been tested against local stand-ins:
- the Supabase adapter;
- Midtrans;
- the WhatsApp Cloud API;
- the backup workflow.

One real order cycle on production, with a real sandbox payment, one real WhatsApp send and one backup run, is worth more than any item below. Budget one day.

**The eight gaps that matter most**

| # | Gap | Why it matters |
|---|---|---|
| 1 | **Margin is estimated, not measured.** Cost is one fixed figure per variant. Auction prices change every morning, and fish loses weight between buying and delivery. | The dashboard's margin can be wrong by several points in either direction. |
| 2 | **The last mile is invisible.** After "Dalam pengiriman" nothing is recorded: who delivered, when, what cash was collected. | COD cash and delivery disputes rest on memory. |
| 3 | **The freshness guarantee runs outside the system.** The promise (photo within 2 hours, replace or refund, 1.5% of sales budgeted) is handled in WhatsApp chats. | You cannot see what the guarantee costs or which products cause it. |
| 4 | **Bank transfer is still checked by hand.** QRIS confirms itself; transfers do not. | Manual checking every morning, and room for error. |
| 5 | **One admin login for everyone.** | Packers and drivers would see profit and could change prices. |
| 6 | **Nothing brings new customers in.** No sitemap, no product data for Google, no visit analytics, and every page is rendered on demand. | Growth depends entirely on word of mouth and paid effort. |
| 7 | **Restaurant credit is tracked off-system.** "Tempo" orders are marked paid one by one; there are no statements, limits or aging. | Receivables are the main cash risk in B2B. |
| 8 | **Marketing consent is collected but unused.** | The cheapest repeat-purchase channel is idle. |

---

## 2. Recommendations at a glance

| # | Recommendation | Closes gap | Effort | Priority |
|---|---|---|---|---|
| N0 | Engineering foundation: tests on every change | — | 1 day | **Now** |
| N1 | Dawn buying log with actual cost and shrinkage | 1 | 5–6 days | **Tier 1** |
| N2 | Freshness-guarantee claims | 3 | 3–4 days | **Tier 1** |
| N3 | Driver view, proof of delivery, COD cash count | 2 | 4–5 days | **Tier 1** |
| N4 | Bank transfer with automatic confirmation (virtual account) and refund records | 4 | 3 days | **Tier 1** |
| N5 | Staff roles, activity log, two-step admin login | 5 | 4–5 days | **Tier 1** |
| N6 | Found on Google and fast: sitemap, product data, caching, visit funnel | 6 | 3–4 days | **Tier 1** |
| N7 | Restaurant receivables: statements, credit limits, aging, contract prices | 7 | 7–9 days | Tier 2 |
| N8 | Par-level ordering and multi-user restaurant accounts | — | 5–6 days | Tier 2 |
| N9 | Household subscriptions (weekly box) | — | 3 days | Tier 2 |
| N10 | Daily-catch broadcast and win-back messages | 8 | 4–5 days | Tier 2 |
| N11 | Substitution preference and "kabari saya" waitlist | — | 2–3 days | Tier 2 |
| N12 | Ratings after delivery | 3 | 2–3 days | Tier 2 |
| N13 | Traceability on the product page and cold-chain log | — | 3 days | Tier 2 |
| N14 | Referral and loyalty credit | — | 4–5 days | Tier 3 |
| N15 | Buying forecast | 1 | 6–8 days | Tier 3 |
| N16 | Accounting export and tax-invoice fields | — | 2 days | Tier 3 |
| N17 | Courier booking for out-of-zone areas | — | 5 days | Tier 3 |
| N18 | Web push notifications, then a Play Store wrapper | — | 3 + 4 days | Tier 3 |
| N19 | Second hub | — | 10+ days | Tier 3 |

---

## 3. Tier 1 — next four to six weeks

These close the gaps that cost money or trust every day. Each one builds on something already in place.

### N0. Engineering foundation: tests on every change

| | |
|---|---|
| **Purpose** | Keep the platform reliable as it grows. Today the test suites run only when someone runs them by hand. |
| **Key functionality** | A GitHub Actions workflow on every push and pull request: typecheck, build, SQL tests, backup test, the main end-to-end suite, and the Midtrans and WhatsApp stand-in tests. A Vercel preview per branch in demo mode, so changes can be clicked through before merging. |
| **Expected benefits** | A change that breaks checkout or weighing is caught before customers see it. |
| **Feasibility** | High. All suites already exist in `scripts/`; the main end-to-end suite is now in the repo as `scripts/test-e2e.cjs`. |
| **Priority** | Now. One day. |

### N1. Dawn buying log with actual cost and shrinkage

| | |
|---|---|
| **Purpose** | Measure the real margin. This is the number the whole business model rests on. |
| **Key functionality** | On the existing Belanja subuh page, record what was actually bought per product: kilograms, price paid, and supplier or auction lot. Orders then carry the real cost of that morning instead of the fixed estimate. After packing, record what was left over or lost (drip loss, trimming, spoilage) with a reason. Reports: margin per product and per order from actual cost; shrinkage percentage per product; price paid per supplier over time. |
| **Expected benefits** | A trustworthy margin on the dashboard. A data-based buying buffer (it is a fixed 5% today). Evidence for pricing decisions and supplier negotiation. It is also the data that N13 and N15 need. |
| **Feasibility** | High. New tables `purchases` and `stock_movements`; cost on order lines is already stored per line (`unit_cost`), so it can be updated from the morning's purchase. Extends an existing page. Supersedes roadmap item R10. |
| **Priority** | Tier 1, first. 5–6 days. |

### N2. Freshness-guarantee claims

| | |
|---|---|
| **Purpose** | Run the guarantee you already advertise inside the system. |
| **Key functionality** | On the order page, for 2 hours after delivery: "Laporkan masalah", choose the item and reason, attach a photo. In the back-office: a claims queue; approve as replacement on the next delivery, as a refund, or decline with a note. The customer gets a WhatsApp message with the decision. Reports: claims as a share of sales against the 1.5% budget, by product and by reason. |
| **Expected benefits** | Faster, consistent answers to unhappy customers. You see what the guarantee costs and which products or suppliers cause it. Abuse becomes visible (repeat claimers). |
| **Feasibility** | High. Photos go to Supabase Storage (already allowed by the image policy). Reuses the refund-due status and the WhatsApp outbox. |
| **Priority** | Tier 1. 3–4 days. |

### N3. Driver view, proof of delivery, COD cash count

| | |
|---|---|
| **Purpose** | Make the last mile visible and close the cash loop. |
| **Key functionality** | A phone page for drivers: today's stops in route order, with the map link and a call/WhatsApp button. Per stop: mark delivered with a photo, or "tidak ada di tempat" with a reason. For COD: enter the cash received. Marking delivered completes the order and sends a "pesanan sudah diterima" message. End of run: a cash summary per driver to hand over, which the owner confirms. |
| **Expected benefits** | Delivery disputes are settled with a photo and a time. COD cash is reconciled daily. Orders complete themselves instead of waiting for someone to tick them. The 2-hour claim window in N2 gets an exact start time. |
| **Feasibility** | High. Extends the route sheet; needs the driver role from N5 (or a simple signed link per route until then). |
| **Priority** | Tier 1. 4–5 days. |

### N4. Bank transfer with automatic confirmation, and refund records

| | |
|---|---|
| **Purpose** | Remove the last manual payment check. |
| **Key functionality** | Customers who choose transfer get a virtual account number for the exact amount (BCA, Mandiri, BNI, BRI), confirmed automatically like QRIS. The manual bank account stays as a fallback. For refunds: record the amount, date, method and a proof image against the order when clearing "Perlu pengembalian dana". |
| **Expected benefits** | No more matching transfers against the bank app. Restaurants paying larger amounts get a familiar method. Refunds leave a record. |
| **Feasibility** | High. The payment gateway layer, the `payments` table and the confirmation logic are built; a virtual account is another payment type in the same adapter. Midtrans charges a flat fee per virtual-account payment (about Rp4,000; check your agreement). |
| **Priority** | Tier 1. 3 days. |

### N5. Staff roles, activity log, two-step admin login

| | |
|---|---|
| **Purpose** | Let staff work in the system without seeing or changing what they should not. |
| **Key functionality** | Roles: owner, admin, packer (orders, weighing, packing; no prices, no reports), driver (N3 only), finance (payments, reports). An activity log of price changes, status changes, payment marks, weight entries and settings changes, with who and when. Two-step login for owner and finance. |
| **Expected benefits** | You can hand weighing and packing to staff safely. Mistakes can be traced. A stolen password alone does not open the back-office. |
| **Feasibility** | High in Supabase mode: the `admins` table gains a role, and Supabase Auth supports two-step login. `requireAdmin()` already runs on every page and action, so it becomes `requireRole()`. Was roadmap item R14. |
| **Priority** | Tier 1. 4–5 days. |

### N6. Found on Google and fast

| | |
|---|---|
| **Purpose** | Bring in customers who search, at no cost per click, and learn where visitors drop off. |
| **Key functionality** | A sitemap and robots file. Product data for Google on every product page (name, price, availability, photo) and recipe data on recipe pages, so they can show as rich results. Cached catalogue pages, refreshed when a price or stock changes in the back-office. A small first-party funnel (product view, add to cart, checkout started, order placed) shown on the reports page, with no third-party tracker. |
| **Expected benefits** | Product and recipe pages can rank for searches like "beli kakap merah segar Jakarta". Faster pages (the Lighthouse runs showed 3–4 s to main content on a slow phone connection). You see conversion by step. |
| **Feasibility** | High. Next.js supports all of it natively; the organisation data is already on the site. Caching was roadmap item R13. |
| **Priority** | Tier 1. 3–4 days. |

---

## 4. Tier 2 — months two and three

Growth and restaurant depth, once Tier 1 has made the numbers trustworthy.

### N7. Restaurant receivables and contract prices

| | |
|---|---|
| **Purpose** | Control the cash you are owed, and price per customer. |
| **Key functionality** | An invoice per order and a statement per period (PDF, sent by WhatsApp). Payments recorded against statements. An aging view (0–7, 8–14, 15–30, 30+ days). A credit limit per account that blocks new "tempo" orders when exceeded or overdue, with a clear message. Contract prices per account per product, with a validity period, overriding the standard wholesale price. |
| **Expected benefits** | You know who owes what every morning. Late payers stop growing their balance. Key accounts get agreed prices without manual discounts. |
| **Feasibility** | Medium. New tables for invoices, payment allocations and price lists; the price function in SQL and TypeScript gains one lookup. PDF generation runs on the server. Was R9. |
| **Priority** | Tier 2, first. 7–9 days. |

### N8. Par-level ordering and multi-user restaurant accounts

| | |
|---|---|
| **Purpose** | Fit how kitchens actually order. |
| **Key functionality** | A par list per account: each product with its target stock. The chef types what is left; the order fills the difference. Several people per account (chef orders, owner or finance sees invoices), each with their own WhatsApp sign-in, replacing the shared access code. Optional approval for orders above an amount. |
| **Expected benefits** | Ordering takes a minute during closing. Restaurants with several staff or outlets fit one account. Shared codes disappear. |
| **Feasibility** | Medium. Reuses the household sign-in (one-time codes) and the reorder logic. |
| **Priority** | Tier 2. 5–6 days. |

### N9. Household subscriptions

| | |
|---|---|
| **Purpose** | Turn regular households into predictable weekly revenue. |
| **Key functionality** | "Langganan mingguan": a signed-in household picks a box or its own items, a delivery day and slot. An order is created each week; the customer gets a reminder the day before with skip and change links; payment by QRIS or virtual account on the usual deadline. |
| **Expected benefits** | Higher repeat rate and steadier volume to buy for at dawn. |
| **Feasibility** | High. The standing-order engine, partial delivery, reminders and payment deadline all exist; this opens it to household accounts. |
| **Priority** | Tier 2. 3 days. |

### N10. Daily-catch broadcast and win-back messages

| | |
|---|---|
| **Purpose** | Use the consent customers have given. |
| **Key functionality** | After the auction, pick the day's highlights and send "tangkapan hari ini" to customers who opted in, with a link that opens the shop on those products. Automatic win-back: a message with a small voucher to customers who have not ordered for a set number of days. Per-customer limits on frequency, one-tap stop, and a result count per broadcast (sent, orders that followed). |
| **Expected benefits** | Repeat orders from the cheapest channel available. Slow-moving catch can be pushed the same morning. |
| **Feasibility** | Medium. Reuses the WhatsApp outbox and consent flag. Needs marketing templates approved by Meta; marketing messages cost more than order updates, so the tool should show the estimated cost before sending. |
| **Priority** | Tier 2. 4–5 days. |

### N11. Substitution preference and waitlist

| | |
|---|---|
| **Purpose** | Handle the fact that the auction does not always have what was ordered. |
| **Key functionality** | At checkout, per order: "Jika ada yang kosong: ganti dengan yang sejenis / hubungi saya / hapus saja". Shown to the packer at weighing. On sold-out products: "Kabari saya", which sends one WhatsApp message when the product is available again. |
| **Expected benefits** | Fewer dawn phone calls. Fewer cancelled lines. Demand for sold-out items becomes visible. |
| **Feasibility** | High. One field on the order, one small table, and the outbox. |
| **Priority** | Tier 2. 2–3 days. |

### N12. Ratings after delivery

| | |
|---|---|
| **Purpose** | Hear about quality before it becomes a complaint, and earn trust on product pages. |
| **Key functionality** | One tap from the "delivered" message: 1–5 stars and an optional comment. Low ratings alert the owner and can open a claim (N2). Average rating and count shown on product pages once there are enough. |
| **Expected benefits** | Early warning on quality. Social proof for new customers. |
| **Feasibility** | High. Depends on N3 for the delivered moment. Was R18. |
| **Priority** | Tier 2. 2–3 days. |

### N13. Traceability and cold-chain log

| | |
|---|---|
| **Purpose** | Show the advantage a trader on the auction floor has over a marketplace seller. |
| **Key functionality** | On fresh products and on the order page: "Dilelang pagi ini di Muara Baru, pukul 04.10", from the morning's purchase record. A simple temperature log at packing and at dispatch per route. A one-page record per delivery that restaurants and hotels can keep for their own food-safety files. |
| **Expected benefits** | A reason to choose Dipasaria that competitors cannot copy easily. Easier entry to hotels and larger kitchens that ask for food-safety records. |
| **Feasibility** | High once N1 exists. |
| **Priority** | Tier 2. 3 days. |

---

## 5. Tier 3 — after the numbers justify it

| # | Recommendation | Purpose and functionality | Benefits | Feasibility | When |
|---|---|---|---|---|---|
| N14 | **Referral and loyalty credit** | A personal referral link; store credit for both sides after the friend's first paid order; credit usable at checkout | Lower cost to win households in apartment and office groups | Medium: needs a credit ledger applied in the price functions. Was R15 | When repeat rate is measured (N6) |
| N15 | **Buying forecast** | Suggested buying quantity per product for tomorrow, from confirmed orders, standing orders and weekday history, adjusted by shrinkage | Less waste and fewer sell-outs | Medium: needs 8–12 weeks of data from N1. Was R17 | After N1 has run for two months |
| N16 | **Accounting export and tax-invoice fields** | Daily sales, payments, refunds and cost as files for Jurnal or Accurate; tax fields on restaurant invoices | Saves bookkeeping hours | High. Was R16 | With N7 |
| N17 | **Courier booking for out-of-zone areas** | Courier rates at checkout for areas your fleet does not cover; booking and tracking from the route sheet | Sell beyond your routes without drivers | Medium: frozen and dry goods only at first, since couriers do not keep fish cold. Was R11 | When out-of-zone requests are frequent |
| N18 | **Web push, then a Play Store wrapper** | Free order updates through the installed PWA; later a Play Store listing that wraps the same site | A free channel beside WhatsApp; presence where some customers search | Medium. iPhone push works only for installed PWAs. Was R19 | After household accounts are in regular use |
| N19 | **Second hub** | Stock, buying list and routes per hub; areas mapped to hubs | Expansion to Tangerang or Bekasi | Lower: touches stock, orders and reports. Was R20 | Only with a concrete expansion plan |

---

## 6. Suggested sequence

| When | Work | Why this order |
|---|---|---|
| Week 0 | Go-live validation; N0 | Everything else builds on a platform proven in production and tested on every change |
| Weeks 1–2 | N1, N4 | Real margin first; transfer confirmation is a small step on the gateway already built |
| Weeks 3–4 | N5, N3 | Roles first, because the driver view needs a driver role |
| Weeks 5–6 | N2, N6 | Claims use the delivered time from N3; search and caching can run in parallel |
| Month 2–3 | N7, N9, N11, N12, then N8, N10, N13 | Receivables before more B2B features; N9, N11 and N12 are small and reuse existing engines |
| Later | N14–N19 | Each has a stated trigger above |

**Dependencies**
- N3 needs the driver role from N5 (a signed link per route can stand in).
- N2 and N12 work best with N3's delivered time.
- N13 and N15 need N1's purchase records.
- N16 goes with N7.

---

## 7. What I would not build yet

| Idea | Why not now |
|---|---|
| Native iOS/Android apps | The PWA covers ordering; an app adds two codebases and store fees before there is evidence customers want it. |
| Live driver tracking on a map | Costly to build and run; the "on the way" and "delivered" messages cover most of the need. |
| Marketplace listings (Tokopedia, Shopee) | Commission and their courier networks do not suit fresh fish; frozen and dry goods could be revisited with N17. |
| A chatbot for customer service | Volume does not justify it; prepared WhatsApp replies and the order page answer the common questions. |
