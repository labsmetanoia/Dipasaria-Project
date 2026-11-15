# Dipasaria — End-to-End Platform Audit

**Date:** 15 November 2026 · **Scope:** corporate site, PWA storefront, business accounts, standing orders, admin back-office, Supabase schema and SQL functions, deployment configuration · **Build audited:** branch `claude/amazing-cori-ggmx09`

---

## 1. Summary

The audit went past a visual review. It covered:
- the source code, with two independent code reviews (security, and business logic and data integrity);
- a crawl of all 92 pages at desktop and 360 px phone widths;
- scripted abuse tests (tampered carts, double taps, unauthenticated admin requests, forged cron calls);
- Lighthouse performance runs and axe-core accessibility scans;
- a direct test of every SQL function on PostgreSQL 16.

**Overall:** the core design is sound:
- prices and stock are recomputed on the server;
- delivery-slot capacity and stock are locked inside the database;
- row-level security covers every table.

Several defects would still have hurt the business at launch:
- one critical data leak;
- eleven high-severity issues (U2/S8, U8/B3 and U9/B5 are the same issue seen from two sides and counted once);
- a set of operational logic gaps around weighing, cancellation and reports.

**All critical and high issues are fixed and covered by automated regression tests.** Fixed items are listed below with their test evidence. Remaining items are listed with a recommendation.

| Severity | Found | Fixed in this round | Remaining (with recommendation) |
|---|---|---|---|
| Critical | 1 | 1 | 0 |
| High | 11 | 11 | 0 |
| Medium | 17 | 14 | 3 |
| Low | 22 | 13 | 9 |

**Headline improvements**

| Metric (Lighthouse, mobile, simulated slow 4G) | Before | After |
|---|---|---|
| `/belanja` page weight | 4,894 KB | **732 KB** (−85%) |
| `/belanja` Largest Contentful Paint | 13.3 s | **3.2 s** |
| `/belanja` performance score | 71 | **90** |
| Product page weight (`/belanja/produk/kakap-merah`) | 2,498 KB | **499 KB** (−80%) |
| Recipe page weight (`/resep`) | 1,872 KB | **542 KB** (−71%) |
| Best practices (all audited pages) | — | **100** |
| Pages overflowing at 360 px | 1 | **0** of 92 |
| Duplicate orders from a triple tap | 4 orders | **1 order** |
| Admin data readable without login | Yes | **No** |

---

## 2. How the audit was done

| Method | What it covered |
|---|---|
| **Code review: security** | Authentication and sessions, server actions (public endpoints in Next.js), RLS and `security definer` functions, secrets, headers, image proxy, service worker caching. |
| **Code review: business logic** | Pricing and rounding (TypeScript vs PostgreSQL), promos, catch-weight weighing and re-pricing, order state machine, payment states, stock, standing orders, reports. |
| **Page crawl** | All 92 routes, in ID and EN, desktop and 360 px. Checked HTTP status, console errors, horizontal overflow and broken images. |
| **Abuse scripts** | Negative, NaN, fractional and huge quantities; unknown and business-only variants; foreign prep options; triple-tap submit; script tags in form fields; anonymous admin URLs and RSC requests; cron without, or with the wrong, secret. |
| **Accessibility** | axe-core (WCAG 2 A/AA and best practice) on every page. |
| **Performance** | Lighthouse (mobile) on home, shop, product, checkout and recipes; network weight per page. |
| **Database** | `scripts/sql-tests.sql`, extended with 30+ new assertions. The migration was also tested on a copy of the previous schema with data. |
| **End-to-end** | Playwright journeys covering the household order, business reorder, standing orders, recipe bundle, English toggle, admin weigh/confirm/pay, price edit, account approval and tracking. Audit regression checks were added (§7). |

---

## 3. Findings by area

Severity scale:
- **Critical:** data exposure or money loss, exploitable now.
- **High:** likely to cause wrong orders, money loss or a breach in normal operation.
- **Medium:** causes errors or abuse under specific conditions.
- **Low:** polish, edge cases, hardening.

### 3.1 Technical performance and system reliability

| # | Finding | Severity | Status |
|---|---|---|---|
| P1 | **Shop landing page was 4.9 MB, with a 13.3 s LCP on mobile.** Full-size photos were served to every device and no modern formats were used. | High | **Fixed.** All photos go through `next/image` with AVIF/WebP, responsive `sizes` and priority for the first hero. Now 732 KB and 3.2 s. |
| P2 | Service worker cached navigations, including tracking and account pages that hold names, phones and addresses. On a shared phone, the next user could see them offline. | Medium | **Fixed.** Pages are now network-only with an offline fallback page; only static assets are cached. |
| P3 | **A missing Supabase key in production silently switched the live shop to in-memory demo mode.** Orders would be lost on every restart. | High | **Fixed.** The server refuses to start in production without Supabase, unless `DEMO_MODE=1` is set deliberately. |
| P4 | Standing-order runs that failed (for example a product out of stock) could never be retried. One failure also aborted the rest of the batch. | Medium | **Fixed.** Each standing order runs in isolation, and failed runs can be re-claimed. |
| P5 | The standing-order cron computed "tomorrow" from the checkout cut-off. Changing the cut-off in settings shifted the date. | Medium | **Fixed.** It uses the Jakarta calendar date + 1. |
| P6 | Every page is server-rendered on demand; the catalogue is not cached. This costs TTFB on each visit. | Low | **Open.** Recommendation R13: incremental static regeneration for catalogue pages. |
| P7 | No error monitoring or uptime alerting. | Medium | **Done (R5).** Errors are grouped on Back-office → Sistem, with chat alerts and `/api/health` for uptime monitors. |

### 3.2 User experience and interface

| # | Finding | Severity | Status |
|---|---|---|---|
| U1 | **Returning customers saw empty checkout fields and a disabled "Lanjut" button**, even though their details were saved. The saved data loads after the first render. | Medium | **Fixed.** Fields fill once the saved data has loaded; covered by an E2E check. |
| U2 | **Tapping "Buat pesanan" several times created several orders** (four in testing). | High | **Fixed.** The button locks on first tap, and the server deduplicates with an idempotency key. |
| U3 | Recipe pages overflowed horizontally at 360 px. | Low | **Fixed.** |
| U4 | Gold text on cream failed contrast (WCAG AA). So did footer text, status badges and dimmed sold-out cards. | Low | **Fixed.** Gold ink darkened to `#765900` and warning text to `#935E00`, footer text lifted; brand palette unchanged. |
| U5 | Collection filters (category, storage, sort) had no accessible names. | Low | **Fixed.** |
| U6 | The 404 page was the default English Next.js page. | Low | **Fixed.** Branded bilingual 404 with links back to the shop. |
| U7 | Navigation landmarks were unlabelled, and the footer heading order was wrong. | Low | **Fixed.** |
| U8 | Admin weight inputs were pre-filled with the ordered quantity. A packer could save without weighing. | High (see B3) | **Fixed.** Inputs start empty, with the ordered quantity as a placeholder; a decimal comma is accepted. |
| U9 | Admin showed every status button, including going backwards or jumping to "completed". | High (see B5) | **Fixed.** Only the valid next step and "Batalkan" are shown. |
| U10 | One heading-order warning remains on a recipe card. | Low | Open (cosmetic). |

### 3.3 E-commerce functionality

| # | Finding | Severity | Status |
|---|---|---|---|
| E1 | **Quantities were not bounded.** A tampered cart placed an order for 100,000 kg; NaN and negative values were silently coerced. | Medium | **Fixed.** The server rejects non-numeric, ≤ 0 and > 500 per line, with a message pointing to WhatsApp for bulk. Fractional pack quantities snap to the variant's step grid, identically in TypeScript and SQL. |
| E2 | The same variant on two cart lines could pass the stock check twice (demo mode). | Low | **Fixed.** |
| E3 | Promo dates were compared as strings. | Low | **Fixed.** |
| E4 | Customer-supplied "Google Maps" link accepted any URL, including `javascript:`. | Low | **Fixed.** Only Google Maps hosts are stored, and admin re-validates before linking. |
| E5 | Name, address and notes had no length limit. | Low | **Fixed.** 80 / 400 / 400 characters. |
| E6 | **Order lookup in Supabase mode used a pattern match.** A code with `%` could match another customer's order. | High | **Fixed.** Exact, case-normalised match. |
| E7 | The "I have paid" button appeared before the final weighed total was known, and on cancelled orders. | Medium | **Fixed.** |
| E8 | Bots can fill delivery slots or burn first-order promos with fake orders. There is no CAPTCHA or rate limit. | Medium | **Done (R2).** Turnstile plus per-device and per-phone rate limits. |
| E9 | Unpaid prepaid orders never expire, so they hold stock and slot capacity. | Medium | **Done (R3).** Configurable payment window, automatic cancellation and a visible deadline. |
| E10 | The tracking link carries the phone number in the URL (`?hp=`). | Low | Open. The referrer policy already strips it from outbound links. Recommendation: a signed tracking token. |
| E11 | The checkout quote reveals whether a phone number has ordered before (first-order promo eligibility). | Low | **Mitigated (R2).** The lookup is rate-limited to a human pace. |

### 3.4 Business logic and operational workflows

| # | Finding | Severity | Status |
|---|---|---|---|
| B1 | **A paid order could be re-weighed, changing the amount after payment.** | High | **Fixed.** Weighing is locked once paid, completed or cancelled. |
| B2 | **Weighing re-applied the current promo and current delivery fee.** Editing a promo or area fee changed past orders, and weighing lighter could add a delivery fee the customer was never quoted. | Medium | **Fixed.** Promo terms are frozen on the order at checkout, and the fee after weighing never exceeds the quoted fee. |
| B3 | **Saving with some or all weights empty marked the order "weighed"** at ordered quantities. | High | **Fixed.** Every catch-weight line must be weighed with a valid weight (0–500 kg). |
| B4 | An order could be marked paid before weighing; the final amount was unknown. | High | **Fixed.** "Tandai lunas" requires the final total. |
| B5 | **The order status could move backwards, and a delivered order could be cancelled.** Cancelling returned stock that had already left the building. | High | **Fixed.** Forward-only flow. Cancel is allowed only before dispatch, and delivery requires weighing. |
| B6 | Cancelling a paid order left it "paid". Nobody was prompted to refund. | Medium | **Fixed.** A new **"Perlu pengembalian dana"** (refund due) status, with a "Dana sudah dikembalikan" button that closes it. |
| B7 | Cancelling did not return the promo use. | Low | **Fixed.** |
| B8 | **Gross profit in reports ignored discounts**; sales report totals drifted by rounding. | Medium | **Fixed.** Profit is net of discount; whole-rupiah totals reconcile. |
| B9 | The buying-list buffer (+10%) was added to fixed-weight packs, so the dawn buyer over-bought. The order count double-counted multi-line orders. | Low | **Fixed.** Buffer only on catch-weight lines; distinct order count. |
| B10 | Unpaid totals included voided orders. | Low | **Fixed.** |
| B11 | TypeScript and PostgreSQL rounded tier discounts differently. The cart preview could differ from the invoice by Rp1. | Low | **Fixed.** Both use integer arithmetic. |
| B12 | **Restaurants could "skip" a standing-order date after the order had already been created.** The UI showed skipped while the delivery still went out. | High | **Fixed.** Refused with the order code; the date shows as already placed. |
| B13 | Standing orders below the business minimum were accepted, then failed every night. | Medium | **Fixed.** Validated against the minimum when saved. |
| B14 | One unavailable item fails the whole standing order for that night. | Low | **Done (R12).** Partial placement; the missing item is noted, with a WhatsApp note to the restaurant. |
| B15 | A promo minimum spend is not re-checked when weighing brings the total below it. | Low | **Open (policy decision).** The current behaviour favours the customer. |
| B16 | Weighing a line to 0 kg (item unavailable) still charges the delivery fee. | Low | **Open (policy decision).** |

### 3.5 Security and data integrity

| # | Finding | Severity | Status |
|---|---|---|---|
| S1 | **Admin pages were readable without login.** The admin check sat in the layout only. A client-navigation (RSC) request skipped it and returned the customer list, with phone numbers and **business access codes**. | **Critical** | **Fixed.** Every admin page checks the session itself. The E2E suite sends forged RSC requests to three admin pages and asserts that nothing leaks. |
| S2 | **The production seed created three restaurant accounts whose access codes are published in the README.** | High | **Fixed.** Moved to `seed-demo.sql` (demo only). Migration 004 suspends them on existing projects and ends their sessions. |
| S3 | **Default secrets were accepted in production:** session secret `change-me…`, admin password `dipasaria`. The login page displayed the password. | High | **Fixed.** Production refuses to start with a missing or example secret; the password hint was removed. Admin cookie is signed with expiry (12 h), `SameSite=Strict`, constant-time compare. |
| S4 | Access codes could be guessed without limit, and were generated with `random()`. | Medium | **Fixed.** Lockout after 5 failures in 15 minutes; codes come from cryptographic random bytes. |
| S5 | Account access code and internal notes were sent to the customer's browser. | Medium | **Fixed.** Stripped server-side. |
| S6 | Buying cost (`cost`) was included in public product data. | Medium | **Fixed.** Only admin pages request it. |
| S7 | No security headers. The image optimiser fetched any URL on the internet (open proxy). | Medium | **Fixed.** CSP, `frame-ancestors 'none'`/`X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy; `X-Powered-By` removed. The image optimiser accepts only own files and Supabase Storage. |
| S8 | **Duplicate submissions** (see U2). | High | **Fixed.** `client_ref` unique key with an advisory lock in `place_order`. |
| S9 | CSP still allows inline scripts (needed by the Next.js bootstrap). | Low | Open. Recommendation: nonce-based CSP when adding Sentry (R5). |
| S10 | The admin login has no second factor. | Low | Open. Recommendation R14. |

**Confirmed correct (no change needed):**
- server-side price, promo and fee recomputation;
- COD and payment-terms eligibility;
- slot capacity and stock locked `FOR UPDATE`;
- RLS on all tables, with the anon key denied;
- fixed `search_path` on every `security definer` function;
- the cron endpoint requires its secret (401 otherwise, verified);
- server-action origin checks;
- standing-order ownership checks;
- tracking requires order code plus phone;
- HTML in form fields is rendered as text.

---

## 4. Prioritised fix list

Everything in the "Fixed" column above has shipped in this branch. Open items, in order:

| Priority | Item | Why now | Effort |
|---|---|---|---|
| 1 | **Run the launch checklist (§6)**, including one live order on Supabase | The Supabase adapter has not yet run against a live project | 2–3 h |
| 2 | **Turnstile CAPTCHA + rate limit** on checkout and business login (E8, E11) | Fake orders can block delivery slots on day one | 1 day |
| 3 | **Auto-expire unpaid prepaid orders** (E9) | Unpaid orders hold stock and slots | 0.5 day |
| 4 | **Error monitoring and uptime alerts** (P7) | You learn about failures from customers | 0.5 day |
| 5 | Daily backups (Supabase Pro) | Free tier has no point-in-time restore | Config |
| 6 | Partial standing-order placement (B14) | One sold-out item cancels a restaurant's whole delivery | 0.5 day |
| 7 | Catalogue caching (P6) | Faster first load, lower hosting cost | 1 day |
| 8 | Signed tracking token instead of `?hp=` (E10) | Privacy | 0.5 day |
| 9 | Policy decisions B15, B16 | Need your call, then 1 h each | — |

---

## 5. Feature roadmap

Complexity: **S** = up to 2 days · **M** = 3–7 days · **L** = 2+ weeks. Costs are monthly running costs at launch volume.

### Must-have (launch and first month)

| # | Feature | Business value | Functional requirements | Complexity | Running cost |
|---|---|---|---|---|---|
| R1 | **Launch hardening pack:** live Supabase smoke test, real bank/QRIS details, secrets | Avoids losing the first orders to a configuration error | Checklist in §6; one full order cycle on production | S | Rp 0 |
| R2 ✅ | **Bot and abuse protection:** Cloudflare Turnstile + rate limiting | Protects slot capacity and promo budget from fake orders; stops access-code guessing at the network edge | Invisible challenge on checkout and business login; server verifies token; per-IP and per-phone limits (e.g. 5 orders/hour) in a Supabase table | S | Free |
| R3 ✅ | **Auto-expire unpaid orders** | Frees stock and delivery slots held by customers who never pay | Scheduled job every 15 min. Cancels transfer/QRIS orders still unpaid X hours after the final invoice (setting). WhatsApp reminder at half-time. Stock and promo returned automatically. | S | Rp 0 (Vercel Cron) |
| R4 ✅ (QRIS) | **QRIS / VA payments with automatic confirmation** (Midtrans; QRIS built, VA not yet) | Removes manual checking of transfer screenshots; customers pay in one tap; cash arrives faster; fewer payment disputes | Payment link generated after weighing (final amount). Webhook marks the order paid (signature verified). Refunds recorded against `refund_due`. | M | ~0.7% per QRIS transaction; VA ~Rp4,000 |
| R5 ✅ | **Error monitoring and uptime** (built in, no Sentry needed; uptime via `/api/health`) | You learn about a broken checkout before customers tell you | Server and browser errors with release tags; alert to WhatsApp/email; daily uptime ping of `/belanja` and the cron | S | Free tier |
| R6 | **Daily backups** | Recover from an accidental delete or bad import | Supabase Pro with daily backups; monthly restore test | S | US$25 |

### Should-have (months 2–3)

| # | Feature | Business value | Functional requirements | Complexity | Running cost |
|---|---|---|---|---|---|
| R7 ✅ | **Automated WhatsApp notifications** (WhatsApp Business Platform) | Cuts manual messaging at 05:00. Customers get the final invoice, "on the way" and "delivered" updates automatically. | Approved templates for: order received, final invoice after weighing (with payment link), out for delivery, unpaid reminder. Opt-out respected. | M | Per conversation (utility rates in Indonesia are low; roughly Rp300–500 each) |
| R8 | **Household customer accounts** (WhatsApp OTP login) | Repeat purchase: saved addresses, order history, one-tap reorder (already loved by B2B) | OTP via WhatsApp template; addresses book; order history; reorder; consent to marketing | M | OTP message cost |
| R9 | **B2B invoicing and receivables** | Restaurants on payment terms need proper invoices; you need to see who owes what | Monthly statement PDF per account; aging report (0–30 / 31–60 / 60+); credit limit blocking new orders when overdue; optional e-Faktur fields | M | Rp 0 |
| R10 | **Inventory movements and shrinkage** | Fresh seafood loses weight and spoils. Knowing the real margin per SKU drives buying decisions. | Stock in (dawn purchase with cost), stock out (orders), adjustments (waste, drip loss) with reason; shrinkage % report per product | M | Rp 0 |
| R11 | **Courier booking for out-of-zone areas** (Biteship) | Sell beyond your own fleet's routes without hiring drivers | Rates at checkout for extra areas; booking from the admin route sheet; tracking link in WhatsApp | M | Per shipment |
| R12 ✅ | **Partial standing orders** | A restaurant still gets 9 of 10 items instead of nothing | Place available lines; alert the account and admin about the missing item with a substitute suggestion | S | Rp 0 |
| R13 | **Catalogue caching (ISR)** | Faster pages, better Google ranking, lower server load | Cache product and collection pages; invalidate on price or stock edit in admin | S | Rp 0 |
| R14 | **Admin roles and 2-step login** | Packers can weigh and pack without seeing profits or changing prices | Roles: owner, admin, packer, driver. Supabase MFA for owner. Audit log of price, status and payment changes. | M | Rp 0 |

### Nice-to-have (after product–market fit)

| # | Feature | Business value | Functional requirements | Complexity |
|---|---|---|---|---|
| R15 | Loyalty and referral | Lower acquisition cost via word of mouth in apartment and office groups | Referral code per customer; credit after the friend's first paid order; points per rupiah | M |
| R16 | Accounting export (Jurnal / Accurate) | Saves bookkeeping hours each month | Daily sales, payments and COGS as CSV/API | S |
| R17 | Buying forecast | Less waste at the dawn auction | Suggested buying quantity per SKU from weekday history and confirmed orders | L |
| R18 | Ratings and photos per delivery | Social proof; early warning on quality issues | 1-tap rating link after delivery; low ratings alert the owner | S |
| R19 | App-store wrapper (TWA / Capacitor) | Presence in Play Store for customers who search there | Wrap the existing PWA; push notifications | M |
| R20 | Second hub / multi-warehouse | Expansion to Tangerang/Bekasi | Stock per hub, area → hub mapping, hub-specific buying list | L |

**Suggested sequence:**
- Week 1: R1–R3 and R5.
- Weeks 2–3: R4.
- Month 2: R7, R12, R13, R14.
- Month 3: R9, R10.
- Then R8 and R11 by demand.

---

## 6. Launch checklist

1. **Database:**
   - New project: run `supabase/schema.sql` then `supabase/seed.sql`.
   - Existing project: run `supabase/migrations/004_audit_fixes.sql`, then `schema.sql`, then `seed.sql`.
   - **Never run `seed-demo.sql` on production.**
2. **Environment (Vercel):**
   - Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
   - Set `SESSION_SECRET` and `CRON_SECRET` (generate each with `openssl rand -hex 32`).
   - Set `NEXT_PUBLIC_SITE_URL`.
   - Do **not** set `DEMO_MODE`.
3. **Admin user:** create it in Supabase Auth, insert into `admins`, and disable public sign-ups.
4. **Settings:**
   - Replace the placeholder bank account `0000000000`.
   - Add the QRIS image and the WhatsApp number.
   - Check the cut-off, minimums, areas, fees and slot capacity.
5. **Catalogue:** real prices and buying costs; stock levels; photos (see `docs/photo-brief.md`).
6. **Smoke test on production:**
   - Place an order from a phone.
   - Weigh it, then confirm, pack and mark paid.
   - Cancel a second order after payment and check that the refund-due flag and the stock are returned.
   - Log in as a business account.
   - Run the standing-order job once from the admin panel.
7. **Verify:**
   - `/admin` redirects to login in a private window.
   - Security headers are present (`curl -I`).
   - The cron returns 401 without the secret.

---

## 7. Test evidence

All suites were run on the final build of this branch.

| Suite | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | Clean |
| Production build (`next build`) | Succeeds; fails closed at runtime without configuration (verified: HTTP 500 with a clear message) |
| SQL tests (`npm run test:sql`, PostgreSQL 16) | **All pass**, including new sections 13 (order rules) and 14 (login lockout, code alphabet) |
| Migration 004 on a copy of the previous schema with data | Upgrade succeeds; new columns present; demo accounts suspended; `schema.sql` re-runs cleanly |
| End-to-end (Playwright) | **33 / 33 checks pass** |
| Abuse scripts | All tampered carts rejected with clear messages; anonymous admin requests redirect without data; cron 401 without the secret |
| axe-core, 92 pages | No serious violations, apart from one heading-order notice on a recipe card |
| 360 px overflow | 0 / 92 pages |

**New regression checks in the E2E suite:**
- weight inputs start empty;
- no skipping ahead or moving backwards in the order status;
- forged anonymous RSC requests to three admin pages leak nothing;
- security headers present and `X-Powered-By` hidden;
- the image optimiser refuses third-party hosts;
- branded 404;
- a triple tap on "Buat pesanan" creates exactly one order;
- checkout pre-fills the saved recipient.

**New SQL assertions:**
- quantity NaN, Infinity, negative and 100,000 are rejected;
- idempotent `client_ref`;
- non-Google maps links are dropped;
- weighing with missing or invalid weights is rejected;
- paid-before-weigh is blocked, and re-weigh after paid is blocked;
- the status cannot move backwards;
- cancelling a paid order gives refund-due and returns the stock;
- no cancel during delivery;
- promo use is returned on cancel;
- sales report totals are whole rupiah;
- login lockout after 5 failures;
- the access-code alphabet.

---

## 8. Files changed (for the developer)

- **Auth and configuration:**
  - `src/lib/auth.ts`: `requireAdmin`, signed expiring admin cookie, secret checks.
  - `src/lib/data/index.ts`: fail-closed configuration.
  - `requireAdmin()` added to all 13 admin pages.
- **Rules:**
  - `src/lib/orderRules.ts` (new): status flow, payment rules, weight parsing, maps-URL whitelist.
  - `src/lib/pricing.ts`: integer arithmetic, quantity limits.
  - `src/lib/standing.ts`.
- **Database:**
  - `supabase/schema.sql`: `place_order`, `weigh_order`, `set_order_status`, `set_payment_status`, reports, `business_login`, `random_code`, `login_attempts`.
  - `supabase/migrations/004_audit_fixes.sql`.
  - `supabase/seed-demo.sql`.
- **UI:**
  - `CheckoutForm`, `OrderAdmin`, `OrderTracking`, `StandingOrdersPanel`;
  - `Photo` (new), `not-found.tsx` (new);
  - footer, header, badges, colour tokens.
- **Platform:**
  - `next.config.ts`: CSP and headers, image policy.
  - `public/sw.js`: no page caching.

---

## 9. Implemented after approval: R2, R3, R5, R12

These are built, tested and documented in the README ("Protection and monitoring"). Database change: `supabase/migrations/005_protection_and_monitoring.sql`.

| Item | What was built | How it was verified |
|---|---|---|
| **R2: Bot protection** | **Rate limits** (`hit_rate_limit`, table `rate_hits`):<br>• per device: 10 orders/hour, 20 logins per 15 min, 5 applications/hour, 60 lookups per 10 min<br>• per phone: 6 household orders/day<br>• first-order checks (which reveal if a phone has ordered) are rate-limited<br><br>**Cloudflare Turnstile** on household checkout, business login and the account application:<br>• keys are read at runtime, so no rebuild is needed<br>• the form explains itself if the widget cannot load<br>• the server fails open only if Cloudflare is unreachable, and logs the outage | **SQL:** limit enforced, keys independent.<br>**E2E:** a script guessing logins from one device is stopped after 20 tries.<br>**Separate run with Turnstile keys:**<br>• CSP allows the widget<br>• login and checkout stay disabled until the check passes<br>• a blocked widget shows a WhatsApp fallback |
| **R3: Unpaid orders expire** | **Scope:** household transfer/QRIS orders with a known total get `pay_by`:<br>• window set in Pengaturan (default 120 min)<br>• never later than midnight before delivery day<br><br>**Expiry** (`expire_unpaid_orders()`) cancels unpaid orders and releases stock, slot and promo use. It runs:<br>• on checkout, order lookups and back-office pages<br>• via `/api/cron/expire-unpaid`<br>• via pg_cron<br><br>**Payments:** "I have paid" or "paid" removes the deadline permanently.<br><br>**Customer:** the deadline and the reason for cancellation are shown on the tracking page.<br><br>**Admin:** WhatsApp reminder, +2 h, or switch off per order.<br><br>**Not affected:** weighed orders, restaurants, COD and terms. | **SQL:**<br>• deadline set and capped<br>• no early expiry<br>• expiry cancels and returns stock<br>• a payment claim protects the order<br>• weighed orders and window 0 are exempt<br><br>**E2E:** a real order with a 1-minute window is cancelled after the window, and the customer sees why. |
| **R5: Monitoring** | **Errors captured** in table `error_events`, grouped by fingerprint, from:<br>• server errors (`instrumentation.ts`)<br>• browser crashes and uncaught errors (`ErrorReporter`, `error.tsx`, `global-error.tsx`)<br>• failed standing orders<br><br>**Back-office → Sistem:**<br>• launch checks: database, bot check, alerts, cron secret, bank placeholder, QRIS, payment window<br>• last job runs<br>• the error list with resolve buttons<br><br>**Also:**<br>• red banner on the dashboard<br>• new errors pushed to Telegram/Slack/Discord via `ALERT_WEBHOOK_URL`<br>• `/api/health` for UptimeRobot | **SQL:** grouping and re-opening.<br><br>**E2E:**<br>• a browser error appears on Sistem and the dashboard banner<br>• "resolve all" clears it<br>• the placeholder bank account is flagged<br>• health answers 200<br>• the expiry cron needs its secret |
| **R12: Partial standing orders** | Each line is checked against tonight's catalogue and stock. Unavailable lines are dropped, and the rest is placed. A stock race is retried without the line.<br><br>The missing items are recorded:<br>• on the run<br>• on the order note<br>• on the restaurant's account page<br>• in Pesanan rutin, with a "Kabari via WA" message<br><br>If what remains is below the business minimum, the run fails visibly and can be retried. | **E2E:** with eggs switched off, the standing order is placed without them; "Dikirim sebagian. Telur Ayam Negeri habis hari ini." and the WhatsApp button appear; a second run does not duplicate. |

**Updated test totals:**
- SQL: all pass, including sections 15–17.
- End-to-end: 47 checks pass.
- Turnstile run: 5 checks pass.
- Migration 005: tested on a copy of the previous schema with data.

---

## 10. Implemented after approval: R4, QRIS with automatic confirmation (Midtrans)

**Gateway choice.** Midtrans Core API, dynamic QRIS:
- The QR string comes back in the charge response and is drawn in the browser.
- Midtrans signs its notifications (SHA-512 over order id, status code, amount and server key).
- It has a status API to read the truth back.

Xendit would also work. The gateway sits behind a small interface (`src/lib/payments/gateway.ts`), so it can be swapped.

| Part | Behaviour |
|---|---|
| **Eligibility** | A QR is issued for QRIS orders with a known final total that is unpaid and not cancelled or completed. That is right after checkout for fixed-weight items, or after the weigh-in. |
| **QR** | Exact amount in whole rupiah. Midtrans order id is `<order code>-Q<n>`. Valid for 30 minutes and ending 5 minutes before the order's payment deadline. An open QR is reused on reload, and older open QRs are withdrawn. |
| **Confirmation** | The notification route verifies the signature (401 otherwise), then reads Midtrans' status API. Only `settlement`/`capture` from that API marks a payment paid. |
| **Recording** | `record_gateway_payment()` in SQL, with a row lock and idempotency. A matching amount makes the order "Lunas". Other cases are noted on the order and sent as an alert, never auto-paid:<br>• a different amount waits for the owner;<br>• money after cancellation becomes "perlu pengembalian dana";<br>• a second payment is noted for refund. |
| **Missed notifications** | The customer's page polls. After 15 seconds the server asks Midtrans directly (at most every 10 seconds per payment). Opening the order in the back-office does the same. |
| **Order changes** | Re-weighing or cancelling marks open QRs cancelled in the database and withdraws them at Midtrans. |
| **Fallback** | No key: the static QRIS image with manual confirmation. Gateway error: a bank-transfer fallback, and the error is logged. Demo mode: a demo gateway with a "Simulasikan pembayaran" button. |

**Tests**

SQL section 18, all passing:
- paid, idempotent repeat;
- duplicate;
- mismatch;
- late after cancel (refund due);
- expired;
- re-weigh cancels the QR;
- unknown payment.

The real Midtrans adapter, run against a local stand-in of the Midtrans API (20 checks, all passing):
- **Charge request:** `payment_type: qris`, GoPay acquirer, whole-rupiah `gross_amount`, order id format, Basic auth header, `custom_expiry` in minutes.
- **Reload:** reuses the open QR.
- **Notifications:**
  - a bad signature gets 401;
  - a signed "settlement" that the status API contradicts changes nothing;
  - an unknown order id is ignored;
  - a real settlement turns the order "Lunas" and the customer's page confirms without a reload;
  - a repeat is a no-op.
- **Missed notification:** polling confirms the payment through the status API.
- **Wrong amount:** not paid; the owner sees a note.
- **System page:** shows the gateway.

Main end-to-end suite: 49 checks pass, including the demo-gateway payment.

**Not yet verified.** The live Midtrans sandbox could not be reached from the build environment. So the first real step is the sandbox test order in the README setup. Midtrans field names were confirmed from Midtrans' documentation via search; the adapter reads the status API defensively.

---

## 11. Implemented after approval: R7, automatic WhatsApp notifications, plus a deployment self-check

**Self-check.** Production refused to run on unsafe settings (§3.5, S3). On the live preview, that showed a generic "Something went wrong" page. The root layout now checks the settings first and shows a **setup page** listing exactly what is missing. It names variables only, never values. The cases it covers:
- no database chosen;
- a missing or example `SESSION_SECRET`;
- a missing demo admin password;
- a missing Supabase anon key;
- Supabase unreachable;
- a database missing the tables from migrations 004–006.

**WhatsApp.**

| Part | Behaviour |
|---|---|
| **Channel** | Official WhatsApp Cloud API: `POST /v26.0/<phone-number-id>/messages`, `type: template`, Utility templates in Indonesian. The 7 templates, with sample values, are in `docs/whatsapp-templates.md`. |
| **Events** | Order received, final invoice after weighing, payment received, out for delivery, payment reminder 30 minutes before the deadline, cancellation with the reason, and standing order placed. Each can be switched off in Pengaturan. |
| **Consent** | A checkbox at checkout (stored as `orders.wa_opt_in`); customers who untick it get nothing. |
| **Outbox** | `wa_messages`, unique per (order, event, dedupe), so an event is never sent twice. A corrected invoice uses the new amount as its dedupe key. Sending claims the row atomically ("sending"), so two processes cannot send the same message. This was found and fixed during testing. |
| **Failures** | Temporary errors (429, 5xx) are retried by the sweep, up to 3 times within 24 hours. Permanent errors, such as a template not yet approved, stop, appear in Pesan WA with the error, and alert the owner. "Kirim ulang" resends. |
| **Without API keys** | Messages are prepared in Pesan WA. One tap opens WhatsApp with the text and records it as sent by hand. |
| **Timing** | Sent after the response (`after()`), so checkout and admin actions stay fast. |

**Tests**
- SQL section 19: de-duplication, corrected invoice, opt-out stored, default events.
- `scripts/test-whatsapp.cjs`, against a local Cloud API stand-in, 15 checks pass:
  - **Request shape:** exact endpoint, Bearer token, template, language, 5 parameters, clean parameter text.
  - **One send per event:** exactly one order-received message.
  - **Opt-out:** respected.
  - **Payment:** a confirmed payment sends a message.
  - **Retries:** a temporary error is retried and delivered; a permanent error is not retried, appears in Pesan WA, and "Kirim ulang" delivers it.
  - **System page:** shows the API.
- Main E2E: 54 checks pass, including manual sending from Pesan WA.

**Not yet verified.** Meta's live API could not be reached from the build environment, so the first real send happens when you set the token. Template approval is Meta's process.
