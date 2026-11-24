# Dipasaria — Audit Round 2 and Value Features

**Date:** 23 November 2026 · **Scope:** storefront PWA, household and restaurant accounts, checkout, QRIS gateway, WhatsApp notifications, standing orders, back-office, Supabase schema and SQL functions, backups, deployment · **Branch:** `claude/amazing-cori-ggmx09`

The first audit (`docs/audit-report.md`, 15 November) closed the launch blockers. Since then six large features were added: bot protection, payment deadlines, QRIS with automatic confirmation, WhatsApp notifications, daily backups and household accounts. This round audits the platform as it now stands, fixes what was found, and adds seven features chosen for clear customer or business value.

---

## 1. Summary

**Verdict:** the platform is sound and ready for a supervised launch. The new features all go through the same server-side rules as before:
- prices, stock and slot capacity are enforced in the database;
- every table has row-level security;
- secrets are never exposed to the browser.

The defects found were concentrated in the newest code: the interaction between the payment gateway, payment deadlines and the expiry job, and the backup check. None was visible in normal use; each would have surfaced as a confusing money or stock problem in the first weeks of real orders.

| Severity | Found | Fixed | Remaining |
|---|---|---|---|
| High | 7 | 7 | 0 |
| Medium | 13 | 13 | 0 |
| Low | 12 | 12 | 0 |
| **Total** | **32** | **32** | **0** |

Four items cannot be fixed in code and are listed in section 4.2: live Midtrans, Meta and Supabase verification, the placeholder bank account, and IP-based rate limits behind mobile carrier NAT.

**Features added (section 5):** substitution preference at checkout, delivery mode with COD cash count, a two-hour freshness guarantee with photo claims, "Kabari saya" restock alerts, a dawn buying log with actual margin and shrinkage, "Lengkapi masakan" recipe completion in the cart, and automated tests on every change (CI).

**Tests:** every suite passes after the changes (section 7). The main browser suite grew from 65 to 80 checks; the SQL suite gained two sections (21 and 22).

---

## 2. How the audit was done

| Method | What it covered |
|---|---|
| Two independent code reviews | One on the SQL functions and data integrity (11 findings), one on the application, payments and security (15 findings). Each finding was reproduced before it was fixed. |
| Runtime crawl | All 98 routes in Indonesian and English, desktop and 360 px phone: HTTP status, console errors, broken images, sideways scrolling, heading order. Clean. |
| Accessibility | axe-core on every page. Two issues: gold eyebrow labels on dark cards below AA contrast, and a recipe card heading level. Both fixed. |
| Static checks | TypeScript strict and ESLint (configured this round; it had never actually run). 13 warnings found and fixed; now 0. |
| Regression run | Build, SQL, backup, main browser suite, Midtrans suite, WhatsApp suite. The regression run itself found the two remaining issues: B1 and a stale test expectation. |

---

## 3. Findings

Severity is judged by business impact: **High** means money, stock or a customer's ability to order is affected; **Medium** means a real but contained problem; **Low** means hygiene, accuracy or polish.

### 3.1 Payments and the payment deadline

| # | Sev. | Finding | Impact | Fix |
|---|---|---|---|---|
| P1 | High | `record_gateway_payment` treated a gateway result without an amount as a match | A malformed or partial notification could mark an order paid without the amount being checked | A missing amount counts as a mismatch; a missing status is rejected; the order row is locked first |
| P2 | High | The expiry job cancelled unpaid orders without first asking Midtrans about open QR codes | A customer who paid in the last minute could have the order cancelled and the stock released | Pending QRs are synced with Midtrans before expiry; an order with a live QR is never expired; QRs are withdrawn at Midtrans after cancellation |
| P3 | High | A Midtrans outage (5xx) was read as "not paid" | During an outage, paid orders looked unpaid and could expire | Outages are errors: the webhook answers 503, so Midtrans retries later |
| P4 | Medium | A new QR could be issued minutes before the payment deadline | The customer pays, then the order expires underneath them | No QR is issued within 7 minutes of the deadline; the page asks the customer to contact the shop instead |
| P5 | Medium | A second QR for the same order reused the payment id | Midtrans rejects a reused id, so the customer could not get a fresh QR | Payment ids carry a random suffix |
| P6 | Medium | "I have paid" was offered for gateway QRIS orders | It set a manual "awaiting confirmation" status that the gateway never clears | Hidden and refused on the server for gateway QRIS; the gateway confirms on its own |
| P7 | Medium | Lock order in `record_gateway_payment` differed from other functions | Possible deadlock between a webhook and an admin action | Locks the order before the payment row, like every other function |
| P8 | Low | The QRIS status poll answered for any order code | Needless load and a small information leak | Only orders that have a QR payment are served; poll rate-limited |

### 3.2 Orders, stock and weighing

| # | Sev. | Finding | Impact | Fix |
|---|---|---|---|---|
| O1 | High | Cut-off time written as "20.00" (the Indonesian way) broke checkout | One natural typo in Settings stops all orders | Settings accepts "20.00" and stores "20:00"; the database rejects any other format; migration 009 converts existing values |
| O2 | Medium | Cancelling returned stock even for items that never reserved stock | Stock counts drift upward after cancellations | Each order line records whether stock was taken (`stock_reserved`); only those are returned |
| O3 | Medium | An order could be re-weighed after the customer reported payment | The bill changes after the customer has already transferred | Weighing is blocked while payment is awaiting confirmation |
| O4 | Medium | No database checks on prices, discount, promo percentage, stock or fees | A slip (negative price, 150% discount) is saved and applied | Ten integrity constraints added; promo codes unique regardless of case |
| O5 | Medium | Standing orders could be placed twice after a crash mid-run | A restaurant receives a duplicate delivery | Each standing order and date has its own idempotency key; stale claims are retried after 10 minutes |
| O6 | Medium | Saving the delivery address after an order could fail and show an error | The customer thinks the order failed and orders again | The order is confirmed first; the address save cannot fail the order |
| O7 | Low | Standing-order fields (weekdays, lines, notes) and status were not validated | Odd values reach the database | Validated and trimmed |
| O8 | Low | Order lines were locked in arbitrary order | Rare deadlock between two simultaneous orders for the same products | Lines are processed in a fixed order |

### 3.3 Accounts, sign-in and abuse protection

| # | Sev. | Finding | Impact | Fix |
|---|---|---|---|---|
| A1 | High | Five wrong restaurant access codes locked the account, even for the right code | Anyone could lock a restaurant out of ordering | The right code always works; wrong guesses past the limit are refused; a lock prevents racing attempts |
| A2 | Medium | Requesting a new sign-in code reset the wrong-code counter | Unlimited guesses at a 6-digit code | The counter covers the last 15 minutes regardless of new codes |
| A3 | Medium | "+62 0812…" became "620812…" | The same customer splits into two accounts and cannot find past orders | Normalised in the app and the database; migration 009 repairs stored numbers |
| A4 | Medium | The order-lookup limit counted per IP only | Behind mobile carrier NAT, many customers share one IP and block each other | Counted per order code and phone pair; the client IP header is configurable |
| A5 | Low | Regenerating an access code did not end existing sessions (demo adapter) | An old device stays signed in | Sessions are revoked, as in the Supabase adapter |
| A6 | Low | A customer profile save rewrote the WhatsApp consent date | The consent record (UU PDP) loses its original date | The date changes only when consent changes |

### 3.4 Operations and reliability

| # | Sev. | Finding | Impact | Fix |
|---|---|---|---|---|
| B1 | High | The backup check (`verify.sh`) could report a failed restore as verified | The nightly "backup verified" message could be wrong exactly when it matters | The error check no longer uses `grep -q` under `pipefail`; the test now really proves a bad restore fails. Found by this round's regression run |
| B2 | High | Re-running `seed.sql`, as the upgrade notes said, overwrote prices, stock, settings and the bank account | One upgrade step wipes live prices and the bank account | Seed inserts only missing rows; upgrade notes updated |
| B3 | Medium | The expiry job ran inside page requests and the WhatsApp follow-up blocked the response | Slow admin and tracking pages at peak | Background mode on customer pages; follow-up after the response |
| B4 | Low | Orders cancelled by pg_cron sent no WhatsApp notice | The customer is not told the order was cancelled | Auto-cancelled orders from the last 24 hours are notified by the next job run |
| B5 | Low | The setup check did not cover migrations 007–009 | A half-migrated database shows "Baik" | Checks every migration up to 010 |
| B6 | Low | Browser errors were pushed to the owner's alert chat | Noise from customers' browser extensions | Browser errors are logged but not alerted |
| B7 | Low | No indexes on the cleanup columns of four log tables | Cleanup slows as the tables grow | Indexes added |
| B8 | Low | ESLint was not configured; `next lint` stopped at a prompt | Code checks never ran | ESLint 9 configured, 0 warnings, runs in CI |

### 3.5 Interface and accessibility

| # | Sev. | Finding | Impact | Fix |
|---|---|---|---|---|
| U1 | Low | Gold eyebrow labels on dark cards below AA contrast | Hard to read in sunlight | Lighter gold on dark surfaces |
| U2 | Low | A recipe card heading skipped a level | Screen readers announce a broken outline | Heading level passed in by the page |

---

## 4. Prioritised fix list

### 4.1 Fixed in this round, in order of business impact

1. **B1, B2:** backups and upgrades can no longer lose or misreport data.
2. **P1–P3:** paid orders are never cancelled or left unpaid because of the gateway.
3. **O1, A1:** a settings typo or a stranger cannot stop customers from ordering.
4. **O2, O3, O5, O6:** stock counts, bills and standing orders stay correct.
5. **P4–P7, A2–A4, O4, B3:** payments, sign-in and performance hardening.
6. Everything marked Low.

### 4.2 Remaining, which needs the owner

| Priority | Item | Action |
|---|---|---|
| 1 | Bank account still shows the placeholder `0000000000` | Back-office → Pengaturan, before the first real order |
| 2 | Midtrans, WhatsApp Cloud API and Supabase are tested against local stand-ins, not the live services | One test order with real payment and messages after go-live (README "Go live", step 6) |
| 3 | Three new WhatsApp templates need Meta approval | Create them from `docs/whatsapp-templates.md`; until approved, those messages appear under WhatsApp → manual send |
| 4 | Rate limits behind mobile carrier NAT | Already per code where it matters; if a customer is blocked, set `CLIENT_IP_HEADER` to the header your host uses for the real client IP |

---

## 5. Features implemented

Each feature was chosen against three tests: a customer notices the benefit, the business can measure it, and it reuses what is already built (no new paid service).

| # | Feature | Area | Roadmap ref | Effort |
|---|---|---|---|---|
| F1 | Substitution preference at checkout | Customer experience, operations | N11 | 0.5 day |
| F2 | Delivery mode: delivered, failed delivery, COD cash count | Operations, reliability | N3 | 1.5 days |
| F3 | Two-hour freshness guarantee with photo claims | Value proposition, retention | N2 | 2 days |
| F4 | "Kabari saya" restock alerts | Retention, revenue | N11 | 1 day |
| F5 | Dawn buying log with actual margin and shrinkage | Operations | N1 | 1.5 days |
| F6 | "Lengkapi masakan" recipe completion in the cart | Average order value | new | 0.5 day |
| F7 | Tests on every change (CI) | Reliability | N0 | 0.5 day |

### F1. Substitution preference at checkout

- **Purpose:** at 04.30 a fish is sometimes not available in the size ordered. Today that means a WhatsApp call before dawn.
- **What it does:** checkout asks what to do if an item is short:
  - replace with a similar item at the same or lower price;
  - call me first (the default);
  - remove the item.
  The choice shows on the order, the route card and the packing sheet.
- **Customer benefit:** no early-morning call; the order arrives as they wanted.
- **Business benefit:** packing is not held up waiting for answers; fewer cancelled lines.
- **Requirements:** `orders.substitution` (migration 010), checkout field in both languages, shown in the back-office.
- **Measure:** share of orders with "similar" or "remove", meaning calls avoided.

### F2. Delivery mode with COD cash count

- **Purpose:** close the loop after "on the way". Before this, "delivered" and cash collected lived in the founder's memory.
- **What it does:** each card on **Rute & packing** has two buttons:
  - **Diterima:** who received it (for example "Satpam lobi") and the cash collected for COD. Cash equal to or above the total marks the order paid.
  - **Gagal antar:** the reason, saved as an internal note with the time.
  The route summary shows delivered count, COD collected and COD still due. The customer sees "Diterima 23 Nov, 21.49 WIB · Satpam lobi" on the order page and gets a WhatsApp message.
- **Customer benefit:** confirmation of who took the delivery, which ends "where is my order?" questions.
- **Business benefit:** cash is reconciled per route; the delivered time starts the guarantee window (F3); proof against disputes.
- **Requirements:** `mark_delivered` SQL function, `delivered_at`, `delivery_note`, `cod_collected`, the `delivered` WhatsApp template. The driver uses the admin login for now; a separate driver role belongs with staff roles (N5).
- **Measure:** COD shortfall per route (target zero); delivery confirmations per day.

### F3. Two-hour freshness guarantee with photo claims

- **Purpose:** the strongest answer to "why not buy from the market or a grocery app?" A generalist platform cannot promise freshness per fish; a principal trader who buys at the auction can.
- **What it does:** for two hours after delivery, the order page shows **Laporkan masalah**:
  - pick the items;
  - choose a reason (not fresh, wrong item, short weight, damaged, missing, other);
  - add up to three photos, shrunk on the phone (1280 px JPEG, at most about 500 KB each) so they upload on a weak connection.
  The owner decides on **Garansi** (replace, refund with amount, or decline with a reason). The customer sees the decision on the order page and by WhatsApp. The page tracks the cost of claims against a 1.5% of sales budget. The rules are enforced in the database: at most three claims per order, only items from that order, only within the window.
- **Customer benefit:** risk-free first order; a clear process instead of an awkward chat.
- **Business benefit:** a promise competitors cannot easily copy, and claims become data: which product, which supplier, what it cost.
- **Requirements:** `claims` table, `create_claim` and `resolve_claim` functions, photo upload limit of 3 MB per request, the `claim` WhatsApp template, rate limits.
- **Measure:** claim cost as a percentage of sales (shown on the page, budget 1.5%); repeat-order rate of customers who claimed against those who did not.
- **Next step:** state the guarantee on the product pages and the about page once the first month's numbers confirm the budget.

### F4. "Kabari saya" restock alerts

- **Purpose:** a sold-out product turns a visit into a lost sale. Fresh seafood sells out daily.
- **What it does:** a sold-out or unavailable product shows **Kabari saya** instead of the add button. A signed-in customer taps once; a guest enters a WhatsApp number. When the owner switches the product back on or adds stock, everyone waiting gets one WhatsApp message with a link, at most once per day per product. **Produk & stok** shows "N menunggu" next to each product.
- **Customer benefit:** no need to keep checking.
- **Business benefit:** recovers lost sales, and shows which products to buy more of tomorrow.
- **Requirements:** `stock_alerts` table, `restock` WhatsApp template (Meta may classify it as Marketing, which costs more per message), triggers in the availability and stock actions.
- **Measure:** alerts sent against orders for that product within 48 hours.

### F5. Dawn buying log with actual margin and shrinkage

- **Purpose:** the margin on the dashboard was an estimate from listed costs. At the auction, prices move every day, and unsold fish is the biggest hidden cost.
- **What it does:** on **Belanja subuh**, under each product, a short form logs what was bought (quantity, total paid, supplier), what was left over, and what was thrown away. The page then shows today's:
  - sales net of discount, and amount paid;
  - actual cost (logged), plus estimated cost for anything not logged;
  - real margin;
  - a shrinkage table.
  **Laporan** compares purchases with sales per day.
- **Customer benefit:** indirect, through better buying and steadier prices.
- **Business benefit:** the founder sees real margin per day and per product, which suppliers are reliable, and how much fish is wasted.
- **Requirements:** `purchases` table, purchase actions, summary on the buying list and report.
- **Measure:** shrinkage as a share of purchase cost; gap between estimated and actual margin.

### F6. "Lengkapi masakan" recipe completion

- **Purpose:** raise average order value with suggestions customers find useful rather than pushy.
- **What it does:** when the cart holds the main fish of one of the seven recipes, the cart offers the missing ingredients (spices, lime, sauces) at the recipe's quantities, with the total and **Tambah semua** in one tap. Up to two suggestions; only in-stock items; business-only variants only for business accounts.
- **Customer benefit:** one order covers the whole dish; no forgotten lime.
- **Business benefit:** higher order value, and more non-seafood lines, which have a better margin (the Gate B target).
- **Requirements:** none new; built from the recipe data already on the site, entirely in the browser.
- **Measure:** average order value and non-seafood share of orders containing a recipe's main fish, before and after.

### F7. Tests on every change (CI)

- **Purpose:** a solo founder cannot test by hand before every change. The test suites existed but ran only when someone remembered.
- **What it does:** `.github/workflows/ci.yml` runs on every push and pull request:
  - lint, type-check and build;
  - the SQL suite and the backup suite on PostgreSQL 16;
  - the three browser suites (main, Midtrans, WhatsApp).
  On failure, server logs and screenshots are attached to the run.
- **Benefit:** a broken checkout is caught before it reaches customers. GitHub Actions is free for this volume.
- **Requirements:** none; it starts working once this branch is merged into the main branch.

---

## 6. Recommended next

The order follows the five goals of the brief. Effort is development time; all use the existing stack and free tiers.

| Priority | Feature | Goal | Effort | Why now |
|---|---|---|---|---|
| 1 | **N7 Restaurant receivables:** statements, credit limits, ageing, contract prices | Revenue, operations | 7–9 days | Restaurants are the volume; they expect weekly terms, and unpaid invoices are the largest cash risk |
| 2 | **N9 Household weekly box:** subscribe to a weekly selection, skip or pause any week | Recurring revenue, retention | 3 days | Reuses the standing-order engine and household accounts already built |
| 3 | **N6 Found on Google and fast:** sitemap, product data, page caching, visit funnel | Growth | 3–4 days | Organic search is the cheapest channel; product data already exists |
| 4 | **N4 Bank transfer with automatic confirmation (virtual account) and refund records** | Operations | 3 days | Removes the last manual payment check; refund records pair with F3 |
| 5 | **N5 Staff roles, activity log, two-step admin login** | Reliability, operations | 4–5 days | Needed before the first helper or driver gets a login |
| 6 | **N10 Daily-catch broadcast and win-back messages** | Retention | 4–5 days | Uses opted-in contacts and F4's demand data |
| 7 | **N12 Ratings after delivery** | Value proposition | 2–3 days | Uses F2's delivered time; feeds social proof on product pages |
| 8 | **N14 Referral credit** | Growth | 4–5 days | After the guarantee and ratings give customers something to recommend |

What I would still not build, and why, is unchanged from `docs/roadmap-next.md` section 7 (native apps, live map tracking, marketplaces, a chatbot).

---

## 7. Test evidence

| Suite | Result |
|---|---|
| Build, TypeScript, ESLint | Pass; 0 lint warnings |
| SQL functions (`npm run test:sql`, PostgreSQL 16) | Pass, 22 sections. Section 21 covers every SQL fix in section 3; section 22 covers substitution, delivery, claims (window, item ownership, limits, decisions), stock alerts and purchases |
| Backups (`npm run test:backup`) | Pass; the non-empty-target case now genuinely fails as it should (B1) |
| Main browser suite (`scripts/test-e2e.cjs`) | **80 of 80** pass. New in this round: recipe completion, substitution from checkout to back-office, delivered with recipient note, customer sees delivery, photo claim, dashboard banner, refund decision seen by the customer, WhatsApp queue, buying log and summary, restock alert from request to message |
| Midtrans suite (`scripts/test-midtrans.cjs`) | **20 of 20** pass, including the new payment-id format, outage handling (503 to Midtrans) and the sync of open QRs before expiry |
| WhatsApp suite (`scripts/test-whatsapp.cjs`) | **19 of 19** pass with the three new message types in the settings |
| Crawl, 98 routes, ID and EN, desktop and phone | Clean |
| axe-core accessibility | Clean after U1 and U2 |

Screenshots of the new screens: `docs/screenshots/54-cart-recipe-complete-mobile.png` to `59-admin-buying-log-desktop.png`, and the existing set refreshed.

---

## 8. Owner setup steps

1. **Database:** in the Supabase SQL editor, run `supabase/migrations/009_integrity_fixes.sql`, then `010_value_features.sql`, then `supabase/schema.sql` again. Back-office → Sistem should read "Baik" on every line.
2. **WhatsApp templates:** create `dipasaria_pesanan_sampai`, `dipasaria_keputusan_garansi` and `dipasaria_stok_tersedia` in Meta Business Manager with the text in `docs/whatsapp-templates.md`. Then tick the three new events in Back-office → Pengaturan → WhatsApp if they are not already ticked.
3. **Bank account:** replace the placeholder in Back-office → Pengaturan.
4. **Scheduler:** keep the HTTP cron endpoint (`/api/cron/expire-unpaid`, with `CRON_SECRET`) as the main scheduler; pg_cron only cancels and cannot ask Midtrans about open QRs.
5. **CI:** merge this branch into the main branch; tests then run on every change, visible under the repository's Actions tab.
6. **Guarantee wording:** once you are comfortable with the 1.5% budget, mention "Garansi 2 jam" on the about page and in the first-order WhatsApp message.

---

## 9. Files changed (for the developer)

- **Database:**
  - `supabase/schema.sql`
  - `supabase/migrations/009_integrity_fixes.sql`, `010_value_features.sql`
  - `supabase/seed.sql` (regenerated)
  - `scripts/sql-tests.sql` (sections 21 and 22)
- **Data layer:** `src/lib/data/{repo,memory,supabase}.ts`, `src/lib/types.ts`
- **Payments and jobs:**
  - `src/lib/payments/{midtrans,service}.ts`
  - `src/app/api/payments/midtrans/route.ts`
  - `src/lib/expiry.ts`, `src/lib/standing.ts`
- **Notifications:** `src/lib/notify/{templates,service}.ts`, `docs/whatsapp-templates.md`
- **Actions:**
  - `src/actions/{shop,admin,payments}.ts`
  - `src/actions/care.ts` (new: claims, restock alerts)
- **Storefront:**
  - new: `ClaimForm`, `StockAlert`, `RecipeComplete`
  - changed: `CheckoutForm`, `OrderTracking`, `CartView`, `ProductSheet`
- **Back-office:**
  - new page: `/admin/garansi`
  - new components: `DeliveryActions`, `ClaimDecision`, `PurchaseLog`
  - changed: route, buying list, report, dashboard, order detail, products, settings
- **Backups:** `scripts/backup/{verify,restore}.sh` (B1)
- **Tooling:**
  - `.github/workflows/ci.yml`
  - `eslint.config.mjs`
  - `scripts/test-e2e.cjs`, `scripts/test-midtrans.cjs`
  - `package.json` (lint script, ESLint and Playwright as dev dependencies)

---

## 10. Implemented after approval: restaurant receivables and contract prices (N7)

**Purpose:** control the cash restaurants owe on tempo, and give key accounts agreed prices without manual discounts. This was the first recommendation in section 6.

### What it does

| Part | For the owner | For the restaurant |
|---|---|---|
| **Invoices with due dates** | Every tempo order gets a due date when placed (delivery date plus 3 or 7 days). A printable invoice (faktur) is linked from each order. | Opens each invoice from the statement link; prints or saves it as PDF. |
| **Payments** | **Piutang → restaurant → Catat pembayaran**: amount, date, method, reference. The money settles the oldest-due invoices first, can cover several orders in one transfer, and keeps any overpayment as credit for the next invoice. A payment recorded by mistake can be deleted; the invoices it settled reopen. | Sees each payment on the statement. |
| **Ageing** | **Piutang** lists every restaurant by days past due (not yet due, 1–7, 8–14, 15–30, over 30 days), plus orders not yet delivered and the credit limit. The dashboard shows a banner when anything is past due. | Sees its balance, due dates and credit left on **Akun**. |
| **Credit control** | A credit limit per restaurant, and a grace period in **Pengaturan** (default 3 days). A tempo order is refused when an invoice is past due beyond the grace days, or when the order would take the balance over the limit. The database enforces this, with a lock so two orders at once cannot both slip under the limit. | Checkout shows the credit left, or why tempo is paused, before the order is submitted. Transfer, QRIS and COD stay available. |
| **Contract prices** | A price per restaurant and product size, with start and optional end dates, shown next to the wholesale price and margin. It replaces the wholesale price and the account discount for deliveries in that period. | Sees "Harga kontrak Anda" on the product and its contract prices on **Akun**. |
| **Statement** | **Rekening koran** for any period (opening balance, invoices, payments, closing balance), printable. **Kirim ringkasan tagihan via WhatsApp** sends the balance, the overdue amount and a signed link. | Opens the statement and invoices from the link without signing in. The link works for 45 days and shows only that restaurant. |

Standing orders paid on tempo follow the same rule. When a restaurant is over its limit or overdue, the evening run records the reason under **Pesanan rutin** and does not place the order.

### Customer and business benefits

- **The owner knows who owes what every morning**, in one screen, instead of reconciling WhatsApp chats against the bank app.
- **Late payers stop growing their balance automatically.** No awkward phone call is needed: checkout explains the reason and offers other payment methods.
- **Restaurants get documents their accountants expect** (invoice and statement) and agreed prices they can rely on.
- **How to measure:**
  - overdue receivables as a share of the total (shown on Piutang);
  - days sales outstanding (total receivables ÷ average daily tempo sales);
  - share of tempo invoices paid by their due date.

### How it works (for the developer)

- **Tables:**
  - `account_payments`;
  - `payment_allocations` (which payment settled which invoice);
  - `contract_prices`;
  - new columns `business_accounts.credit_limit`, `orders.due_date` and `settings.terms_grace_days` (migration `011_receivables.sql`).
- **SQL:**
  - `allocate_account_credit` matches oldest invoice first, oldest payment first. It also releases money matched to cancelled orders, or more than a re-weighed invoice needs.
  - `record_account_payment`, `delete_account_payment` and `account_exposure`.
  - `place_order` looks up contract prices and runs the credit check.
  - `weigh_order`, `set_order_status` (cancel) and `set_payment_status` keep allocations consistent.
- **App:**
  - `src/lib/receivables.ts`: ledger, ageing, credit check and statement as pure functions, shared by both adapters and every screen;
  - `src/lib/statementLink.ts`: HMAC-signed links;
  - `src/actions/receivables.ts`;
  - pages `/admin/piutang`, `/admin/piutang/[id]`, `/admin/piutang/[id]/rekening`, `/admin/pesanan/[id]/faktur`, `/tagihan/[token]` and `/tagihan/[token]/[code]`.

### Found and fixed while building it

**B9 (Medium):** the WhatsApp outbox's unique key treated messages without an order (back-in-stock alerts, now statements) as all different, because PostgreSQL treats NULLs as distinct. The same alert could be queued twice in production; demo mode was not affected. Fixed with a partial unique index; migration 011 removes existing duplicates first.

### Tests

- **SQL suite, section 23:**
  - contract price used and an expired one ignored;
  - due date;
  - the credit-limit refusal with the exact amount left;
  - a partial payment;
  - oldest invoice settled first;
  - overpayment kept as credit and used at the next order;
  - cancel returns the credit;
  - deleting a payment reopens the invoice;
  - overdue block and the grace days;
  - weighing, marking unpaid and re-weighing;
  - the new outbox key.
- **Main browser suite: 98 of 98** (18 new checks):
  - the overdue restaurant is flagged, and sees why on Akun and at checkout;
  - recording the payment lifts the hold, and a tempo order then goes through;
  - a lowered limit stops the next order at checkout;
  - a contract price added by the owner is visible to the restaurant;
  - the WhatsApp statement link opens on a phone without sideways scrolling, its invoice opens, and a tampered link is refused.
- **Screenshots:** `docs/screenshots/60-admin-receivables-desktop.png` to `64-statement-mobile.png`.

### Owner setup

1. Run `supabase/migrations/011_receivables.sql`, then `supabase/schema.sql` again.
2. Create the template `dipasaria_ringkasan_tagihan` from `docs/whatsapp-templates.md`. Until Meta approves it, the summary opens in WhatsApp with the text filled in, for you to send.
3. For each tempo restaurant: open **Piutang**, set a credit limit (start with about two weeks of its usual orders), and add any agreed contract prices.
4. From now on, record each transfer from a restaurant under **Piutang** rather than with "Tandai lunas" on each order. One entry settles several invoices.

---

## 11. Implemented after approval: household weekly box (N9)

**Purpose:** turn regular households into predictable weekly revenue, and give the owner steadier volume to buy for at dawn.

### What it does

| Step | What happens |
|---|---|
| **Subscribe** | A signed-in household opens **Akun → Kotak mingguan**, or taps **Langganan kotak ini tiap minggu** on any value box. It picks what goes in (a value box, a past order, the current cart, or any products), one delivery day, every week or every second week, a delivery slot, a saved address, and QRIS or transfer. The form shows the price per box, the delivery fee and the first delivery date. |
| **Two evenings before delivery (19.45)** | The evening run creates a normal order from the box, at that day's prices and stock. An item that is sold out is left out and named; the rest still goes. |
| **WhatsApp** | The customer gets the order with its total, the payment deadline and the link. The deadline is the order cut-off on the evening before delivery, so there is about a day to pay rather than two hours. The usual reminder goes out 30 minutes before the deadline. |
| **Not this week?** | Before the order exists: tap a date under "Pengiriman berikutnya" to skip it. After it exists: **Lewati minggu ini** on the order page cancels it while it is unpaid and before the cut-off. Either way the box stays active for the following weeks. |
| **Pause or stop** | One tap each, any time. No contract and no subscription fee. |
| **Unpaid twice in a row** | The box pauses itself, so it stops holding stock and a delivery slot every week. The customer sees why on the account page and can resume in one tap; the owner sees it under **Pesanan rutin** with a prepared WhatsApp message. A week the customer skipped does not count. |

Boxes with items sold by weight work like any such order: the estimate is shown, and the final invoice follows the dawn weighing.

### Customer and business benefits

- **Customer:** the weekly shop happens without re-ordering, there is time to pay, and skipping a week takes one tap. Subscribing to a value box also keeps the box's lower price.
- **Business:** recurring revenue that is visible in advance. **Pesanan rutin** shows active household boxes, their value per week, and how many will be created tonight, next to the restaurants' standing orders.
- **How to measure:**
  - active boxes and recurring value per week (shown on **Pesanan rutin**);
  - of the latest box orders, how many were paid, skipped by the customer, or cancelled unpaid (shown on the same card);
  - boxes paused for non-payment (also on that card).

### How it works (for the developer)

- **One engine for both.** A household box is a standing order owned by a customer instead of a restaurant. The table gains `customer_id`, `address_id`, `every_weeks`, `anchor_date` and `paused_reason`, with a constraint that exactly one owner is set (migration `012_weekly_box.sql`; `schema.sql` applies the same statements idempotently). Deleting a customer account deletes its boxes.
- **Rules in `src/lib/standing.ts`:**
  - `onSchedule` (weekly or every second week from the first delivery);
  - `validateBox` (one day, own address with an area, household products only, minimum order, QRIS or transfer);
  - `boxPayBy` (the deadline);
  - `boxSkippable`;
  - the two-unpaid rule.
- **The run.** For restaurants it prepares the run's date, as before. For households it prepares that date and the next one. The earlier date catches a box subscribed after the previous evening's run, or a missed run. Each box and date is claimed once, so the overlap never creates a second order.
- **Screens and actions:**
  - `src/components/shop/BoxPanel.tsx` and `src/actions/box.ts`;
  - the skip button in `OrderTracking`;
  - the household rows on `/admin/rutin`.
- **WhatsApp.** The approved `dipasaria_pesanan_rutin` template is reused, so there is nothing new to submit to Meta.
- **Protection.** At most three boxes per account. An address used by a box cannot be deleted until the box is changed.

### Tests

- **New rules test (`npm run test:rules`, 35 checks, also in CI).** It runs the engine directly on the demo data layer, which lets it cover several weeks in a second:
  - the two-weekly schedule;
  - the payment deadline in three situations;
  - who may skip and when;
  - box validation;
  - the order goes to the saved address at household prices;
  - no duplicate on a second run;
  - the two-day lead;
  - pause after two unpaid boxes, resume, and a skipped week not counting;
  - a removed address;
  - account deletion.
  It also checks the receivables ledger arithmetic from section 10.
- **SQL suite, section 24:** the one-owner constraint, the rhythm constraint, address removal and account deletion.
- **Main browser suite: 113 of 113** (15 new checks):
  - subscribe from a value box through sign-in and a first address;
  - change the rhythm;
  - the run creates the order;
  - the WhatsApp message carries total, deadline and skip;
  - the customer skips from the order page;
  - the address guard;
  - pause and resume.
- **Found by these runs and fixed (U3, Low):** the countdown strip in the header ("Pesan dalam … menit lagi") was computed once on the server and again in the browser. Whenever the minute ticked over in between, React reported a hydration error and re-rendered the page. It only happened before the cut-off, which is why earlier evening test runs never met it. The strip now tolerates the difference and refreshes right after loading.
- **Screenshots:** `docs/screenshots/65-weekly-box-mobile.png` to `67-weekly-box-order-mobile.png`.

### Owner setup

1. Run `supabase/migrations/012_weekly_box.sql`, then `supabase/schema.sql` again.
2. Nothing to create at Meta. Keep "Pesanan rutin dibuat" switched on in **Pengaturan → WhatsApp**.
3. The scheduled job (`/api/cron/standing-orders`, daily at 19.45 WIB) already exists; it now prepares household boxes too.
4. To promote it: the value-box pages and the "Rumah tangga" page now carry the offer. A first-box promo code (existing **Promo** screen) is the cheapest way to test demand.

### Not included, on purpose

- **Automatic charging** (card or e-wallet debit). Customers pay each box by QRIS or transfer. Auto-debit needs a recurring-payment product from the gateway and a refund flow; revisit when unpaid boxes become a measurable problem.
- **A subscriber discount.** The value boxes already carry the price advantage, and margin is thin. If you want one later, a promo code restricted to box orders is the smallest change.

---

## 12. Implemented after approval: found on Google, with lighter pages (N6)

**Purpose:** bring in customers who search ("beli kakap merah segar Jakarta", "supplier seafood restoran Jakarta", a recipe) at no cost per click, make pages lighter to download, and show where visitors drop off.

### What a crawl of the site showed before

| Finding | Before | After |
|---|---|---|
| `robots.txt` and `sitemap.xml` | Missing (404) | Both served; the sitemap lists 84 pages with product photos |
| Canonical address on indexable pages | 0 of 86 | All |
| Pages sharing the default description | 20 | 0 |
| Descriptions shorter than 70 characters | 13 | 0 |
| Product pages previewing with their own photo (WhatsApp, social, search) | 0 of 53 | 53 |
| Recipe, guide and breadcrumb data for Google | None | 7 recipes, 6 guides; breadcrumbs on every product, category, recipe and guide page |
| The bare address `/` | Temporary redirect (307) | Permanent (308) |
| Private pages (cart, checkout, account, order tracking, search results) | Indexable | Marked "do not index"; crawling blocked in `robots.txt` |
| Title, description and canonical address in the page head for ordinary browsers and Googlebot | Only on pages with fixed texts; product, category, recipe and guide pages delivered them late, in the body | Every page |
| Lighthouse search score, product page | 91 | 100 |
| Average HTML per page | 387 KB | 249 KB |
| HTML download (compressed): home / product / Kontak | 136 / 101 / 79 KB | 109 / 74 / 51 KB |
| Lighthouse speed score on a simulated slow phone: home / product | 85 / 86 | 87 / 87 (unchanged within run-to-run noise) |

### What was built

**For search engines**
- **Sitemap and robots.** `/sitemap.xml` is built from the live catalogue, so a new product appears without a deploy. `/robots.txt` admits search engines to the shop and guides and keeps them out of the back-office, carts, accounts, orders and statements.
- **A title and description per page, written for how people search.**
  - Products: "Kakap Merah – beli online, antar Jakarta", with a description that carries the English name, the starting price, the order cut-off and the delivery area.
  - Categories list their best-known products.
  - Each static page has its own text. The texts are in `src/lib/seo.ts` and next to each page.
- **One canonical address per page**, so sorted or filtered lists and links with tracking parameters never count as duplicates.
- **Structured data Google can show as rich results:**
  - Product: one offer per household size, with price in IDR and availability; per-kilogram pricing for items sold by weight. Restaurant-only products publish no price and so no product data.
  - Recipe: photo, time, servings, ingredients from the linked products, steps.
  - Article, on the guides.
  - Breadcrumbs.
  - The business itself (OnlineStore), with the WhatsApp number and Instagram account from **Pengaturan**. The placeholder number is never published.
- **Product feed for Google Merchant Center** at `/feeds/google.xml`: optional, for free listings in Google's Shopping tab.
- **Search Console verification** through the `GOOGLE_SITE_VERIFICATION` setting.
- **Metadata in the head, for everyone (found while measuring).** Next.js by default sends the title, description and canonical address late, in the page body, to ordinary browsers, and keeps them in the head only for a fixed list of crawlers that does not include Googlebot. Google can usually recover them by running the page's JavaScript, but a canonical address should not depend on that. One setting (`htmlLimitedBots` in `next.config.ts`) now puts them in the head of the first HTML for every visitor, and the search test checks it with an ordinary phone browser's identity.

**For speed**

What the measurements do and do not show: pages are lighter (the table above), but the lab speed score did not move. On a simulated slow phone the largest element still appears at about 4 seconds, which is governed by the hero photo and by the browser starting up the page, not by the HTML size. The caching below saves database round trips, which only exist on Supabase, so its effect could not be measured in demo mode; check the real figure in Vercel's Speed Insights after go-live.

- **The catalogue was being sent twice with every page** (75 KB each time): once for the cart drawer, and once more inside the built-in "page not found" screen that Next.js ships with each page. It is now sent once, without the descriptive texts the cart does not use. The "not found" screen uses a light frame; the footer seal became a cached file instead of 14 KB of inline drawing.
- **Catalogue reads are cached.** Settings, categories, products, delivery areas and slots are read from the database at most once a minute and shared by all visitors, instead of on every page view.
  - Anything that changes them clears the cache at once: a price, stock or availability edit; an order taking or returning stock; a settings change.
  - Changes made directly in the database appear within a minute.
  - Back-office screens that show costs or inactive products always read the database.

**For decisions: the visit funnel**
- **Laporan → Corong kunjungan** shows, for any period, how many visits reached each step (opened the shop, viewed a product, added to the cart, started checkout, placed an order), the conversion between steps, and the biggest drop.
- A second table lists the most-viewed products with how often they were added to the cart. A product that is viewed often but rarely added is flagged: check its price, photo or availability.
- It is first-party and anonymous: the browser reports each step once per visit (the order step from the "pesanan diterima" page), and only daily totals are stored. Sales figures are always read from the orders themselves, never from these counters. There is no cookie, no IP address, no visitor id and no third-party script. Crawlers and the owner's own visits are not counted. The privacy page says so.

### What was not done, and why

- **Whole-page caching.** Pages still render per request, because the header, prices and language depend on who is looking (restaurant account, language choice). Caching the data underneath gives most of the gain without that risk.
- **English pages in Google.** The language toggle is a preference on the same address, so search engines index the Indonesian site. That matches how the Jakarta market searches; separate English addresses would be a larger change.
- **Shipping and return details in the product data.** Delivery fees vary by area and order size, and the guarantee is counted in hours; publishing approximate figures to Google risks a mismatch with the site.

### Tests

- **New search test (`node scripts/test-seo.cjs`, 37 checks, in CI).** It reads the site as a search engine does:
  - robots and sitemap;
  - title, description and canonical address are in the head of the first HTML;
  - every page reachable from the home page: a unique title within 60 characters, a unique 70–160 character description, a self-referencing canonical address, one main heading, a preview image, valid structured data;
  - every indexable page is in the sitemap, and every sitemap entry loads;
  - Product, Recipe, Article and breadcrumb data are complete;
  - private pages are marked "do not index", and an unknown product answers 404;
  - the product feed;
  - a page-weight budget, so the duplicate catalogue cannot come back unnoticed.
- **SQL suite, section 25:** funnel counters.
- **Main browser suite: 116 of 116** (3 new checks), including the funnel end to end (one phone visit that places an order is counted once per step; the report shows 100% from visit to order). The existing checks that a price or availability edit shows in the shop immediately now also prove the cache is cleared on every change.

### Owner setup

1. Run `supabase/migrations/013_visit_funnel.sql`, then `supabase/schema.sql` again.
2. Set `NEXT_PUBLIC_SITE_URL` in Vercel to the real address (for example `https://dipasaria.id`) before going live: the sitemap, canonical links and structured data use it.
3. In **Pengaturan**, replace the placeholder WhatsApp number and fill in the Instagram account; both are published to Google with the business details.
4. **Google Search Console** (free, about ten minutes): add the site, choose "HTML tag" verification, put the code in `GOOGLE_SITE_VERIFICATION`, redeploy, then submit `/sitemap.xml`. Search Console then reports which pages are indexed and which searches bring visitors.
5. **Google Business Profile** (free): create a profile for Dipasaria as a delivery business serving Jakarta and Tangerang, with the same name, WhatsApp number and website. This is what puts the shop on Google Maps and in local results; it cannot be done from the website.
6. Optional: **Google Merchant Center** (free listings). Add `/feeds/google.xml` as a scheduled feed and set delivery fees there.

### How to measure

- Search Console: indexed pages, impressions and clicks per search term, rich-result reports for products and recipes.
- **Laporan → Corong kunjungan:** visits and conversion per step, week on week.
- Results in search take weeks, not days: expect product and recipe pages to start appearing two to six weeks after the sitemap is submitted.

---

## 13. Implemented after approval: retention metrics and ratings after delivery

**Purpose:** the first priority of `docs/strategic-assessment.md`. The platform measured cost well and customers poorly; these two features tell the owner whether customers come back and what they thought.

### Ratings after delivery

| Part | What it does |
|---|---|
| **Asking** | The "pesanan sudah diterima" WhatsApp message now also invites a rating. The order page shows **Bagaimana pesanan Anda?**: tap 1–5 stars for the order, optionally tap stars for a product that stood out, add a comment, send. A product only receives the stars the customer tapped for it; the overall score is never copied onto products (unless the order holds a single product). |
| **Who can rate** | Only the customer who placed the order (order code and WhatsApp number), once per order, within 14 days of delivery. The database enforces this. |
| **Low ratings** | One or two stars alerts the owner at once and shows on the dashboard. The customer is pointed to the guarantee report while its two-hour window is open, and to WhatsApp after that. |
| **Product pages** | A product shows its average and the number of ratings once it has three, on the page and in the product data sent to Google (which can show stars in search results). |
| **Back-office** | **Laporan → Penilaian pelanggan**: the average, the spread of stars, ratings of three stars or less with comment, product and a prepared WhatsApp reply, the lowest-rated products, and recent comments. The order page shows its rating. |

### Retention

**Laporan → Pelanggan kembali** covers the last 180 days. Households are identified by WhatsApp number, restaurants by account.

- **Repeat within 30 days:** of customers whose first order is at least 30 days old, how many ordered again within 30 days. Newer customers are left out, so the figure is not flattered or punished by people who have not had time to return.
- **Typical gap between orders** and **average order value**, each for households and for restaurants.
- **By first-order month:** customers gained, how many came back at all and within 30 days, and spend per customer.
- **Sudah lama tidak memesan:** customers past their usual rhythm (a household after 21 days, a restaurant after 7, or twice their own usual gap), biggest spenders first, with a prepared WhatsApp greeting.
  - The greeting is offered only for restaurants and for households who agreed to receive offers. The others are listed without a link.

### Customer and business benefits

- **Customer:** a simple way to be heard, and a prompt route to a replacement or refund when something was wrong.
- **Business:**
  - quality problems surface the same morning, per product;
  - the star rating earns trust on product pages and in search;
  - the repeat rate becomes the baseline for every later growth step (broadcasts, referral, weekly box promotion).
- **How to measure:** average rating and share of low ratings per week; repeat-within-30-days per first-order month; number of quiet customers greeted and how many order again.

### How it works (for the developer)

- **Ratings:**
  - tables `ratings` (one per order) and `rating_items` (stars per product);
  - SQL `create_rating` and `product_rating_summary` (migration `014_ratings.sql`);
  - `rateOrderAction` in `src/actions/care.ts`;
  - `src/components/shop/RatingForm.tsx`.
  Product stars are read with the catalogue cache and cleared when a rating arrives.
- **Retention:** `src/lib/retention.ts`, pure functions over `listOrderFacts` (orders reduced to customer, date and amount), rendered by `src/components/admin/CustomerReports.tsx`.
- **WhatsApp:** the text of `dipasaria_pesanan_sampai` changed (same three variables). If you already created it at Meta, edit its text there; until then customers still receive the old wording and the page works the same.

### Tests

- **SQL suite, section 26:** not before delivery, only the order's customer, stars 1–5, only products in the order, once per order, the 14-day window, the product summary.
- **Rules test: 47 checks** (12 new): the retention figures on a constructed set of customers, and ratings on the demo data layer.
- **Main browser suite: 123 of 123** (7 new checks): the customer rates a delivered order low; the dashboard, the report and the order page show it; the rating cannot be given twice; the retention section renders.
- **Screenshot:** `docs/screenshots/69-rating-mobile.png`.

### Owner setup

1. Run `supabase/migrations/014_ratings.sql`, then `supabase/schema.sql` again.
2. Update the text of the `dipasaria_pesanan_sampai` template at Meta from `docs/whatsapp-templates.md` (or create it with the new text).
3. Nothing else: both report sections fill in as orders are delivered.

---

## 14. Implemented after approval: morning brief, gift orders and the trader's-pick box

Items O2 and R3 of `docs/strategic-assessment.md`, which complete its "weeks 1–2" block.

### Morning brief (O2)

**Purpose:** the day's exceptions in one message, read on the way to the auction, instead of opening five screens.

**What it does:** at 02.00 WIB a message goes to the alert chat already used for errors (Telegram, Slack or Discord through `ALERT_WEBHOOK_URL`). It contains:
- today's deliveries: number of orders, value, households and restaurants; how many need weighing; QRIS and transfer money still unpaid; cash-on-delivery to collect; how many are gifts;
- the buying list, fresh fish first, the ten largest lines, with a link to the full list;
- **Perlu perhatian:** standing orders and weekly boxes that failed, guarantee reports waiting, low ratings from the last 24 hours, receivables past due by restaurant, WhatsApp messages waiting to be sent by hand, unresolved errors. When there is nothing, it says so;
- yesterday's sales, real gross margin (actual purchase cost from the buying log) and shrinkage, with the product that lost most.

The dashboard shows the same text under **Ringkasan pagi**, opened automatically when something needs attention, with **Kirim ke chat sekarang**. The margin and shrinkage arithmetic moved into `src/lib/daycost.ts`, shared with **Belanja subuh**, so both always agree.

**Running cost:** none. It is one scheduled call (`/api/cron/morning-brief`, in `vercel.json`) and one chat message.

### Gift orders (part of R3)

**Purpose:** a new occasion to buy. Sending fish or a box to parents, family or a client is common around holidays.

**What it does:**
- At checkout, a household ticks **Kirim sebagai hadiah**. The name and address become the recipient's. The buyer's WhatsApp number receives all order updates. The recipient's number is asked for the courier only. A card message (up to 300 characters) and a sender's name are optional.
- The sender always pays: cash on delivery is refused for gifts, in the database as well as in the form.
- The route sheet marks the drop "Hadiah · jangan sertakan nota atau harga", shows the card text to write, and gives the courier the recipient's number. The back-office order page and the customer's order page show the gift too.
- WhatsApp messages greet the sender (by the name on the card, or "Bapak/Ibu"), never the recipient. The buyer's account name and saved delivery details on the device are not overwritten with the recipient's.

### Trader's-pick box (part of R3)

**Purpose:** a subscription only a trader at the auction can offer. The owner chooses the best of the week; the customer trusts the choice.

**What it does:**
- **Kotak Pilihan Pedagang** is a value box in two sizes (about 1,5 kg for 2–3 people, Rp199.000; about 3 kg for 4–6 people, Rp379.000). The prices, costs and starting stock are placeholders to adjust in **Produk dan stok**.
- On **Belanja subuh**, the owner writes **Isi minggu ini** after seeing the auction, optionally in English too. Customers see it on the product page and in their weekly box. The packer sees it on the route sheet under each box, and the buying list shows it under the box line.
- It works with everything already built: the cart, the weekly box (each size is offered as a starting point), gifts and ratings.
- Any other product can become a trader's-pick box by setting `curated = true` on it in the database. There is no screen for that yet; it is rare enough.

### Tests

- **SQL suite, section 27:**
  - the gift fields are stored, and a gift without a card is still a gift;
  - an ordinary order is not a gift;
  - an invalid recipient number is refused, as are a card over 300 characters and cash on delivery;
  - weekly contents are stored on the product.
- **Rules test: 60 checks** (13 new):
  - gifts on the demo data layer;
  - the WhatsApp greeting for a gift;
  - retention naming the buyer;
  - the trader's-pick product and its contents;
  - the morning brief's sections, overdue receivables, its length limit, and a day without deliveries.
- **Main browser suite: 128 of 128** (5 new checks). It covers:
  - the brief on the dashboard;
  - the owner setting the box contents and the customer seeing them;
  - a guest gift checkout from product page to order page;
  - the route sheet with gift, recipient number, card and box contents;
  - the WhatsApp greeting.
- **Upgrade path:** checked on a copy of the previous schema with migrations 014 and 015, `schema.sql` and `seed.sql`.
- **Screenshots:** `docs/screenshots/70-traders-pick-mobile.png` to `72-route-gift-desktop.png`.

### Owner setup

1. Run `supabase/migrations/015_gifts_and_curated_boxes.sql`, then `supabase/schema.sql`, then `supabase/seed.sql`. The seed only adds the new box; your prices and stock are not touched.
2. Set `ALERT_WEBHOOK_URL` if you have not yet (README, "Protection and monitoring"); the brief then arrives at 02.00. Vercel's schedule is fixed in UTC, so 02.00 WIB is written as 19.00 UTC.
3. Set the trader's-pick box prices, cost and stock in **Produk dan stok**, replace its photo when you have your own, and write the first week's contents on **Belanja subuh**.
4. For the holidays, mention gifts in the WhatsApp status and on Instagram. A gift-only promo code is not built; a normal promo code works for gifts too.
