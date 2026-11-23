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
