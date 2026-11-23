# Dipasaria — Seafood-Led Protein Commerce Platform

Corporate website, installable mobile storefront (PWA) and founder back-office for a Jakarta supplier of graded seafood, halal chicken, eggs and kitchen essentials. One Next.js codebase on Supabase; Rp 0 a month on free tiers until daily sales justify Supabase Pro. Customer-facing pages are bilingual (Bahasa Indonesia default, English via the header toggle); the back-office is in Indonesian.

| Surface | Where | Who |
| --- | --- | --- |
| Storefront (PWA), the landing page | `/belanja`, `/belanja/semua`, `/belanja/kategori/[slug]`, `/belanja/produk/[slug]`, `/keranjang`, `/checkout`, `/pesanan`, `/akun` | Households (guest checkout) and restaurants (phone + access code) |
| Corporate pages | `/tentang`, `/restoran`, `/rumah-tangga`, `/panduan`, `/kontak`, `/privasi` | Prospects, partners, search engines |
| Back-office | `/admin` | The founder, from a phone at 02:30 or a laptop in the afternoon |

Audit report, fix list and feature roadmap (November 2026): `docs/audit-report.md`. Next recommendations: `docs/roadmap-next.md`. Second audit with its fixes and seven value features (23 November 2026): `docs/audit-round-2.md`. Screenshots of every screen are in `docs/screenshots/`. Architecture and data model: `docs/architecture.md`. Photo slots and shot list: `docs/photo-brief.md`.

## Run it in two minutes (demo mode, no database)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. `npm run dev` always allows demo mode. On a deployment with a missing or unsafe setting, every page shows a **setup page** that names the exact variable to fix (names only, never values), instead of an error. A production build (`npm run build && npm start`) refuses to start without Supabase unless you set `DEMO_MODE=1`, and needs a real `SESSION_SECRET` (16+ characters, not the example value) and `DEMO_ADMIN_PASSWORD`. Without Supabase credentials the app runs on an in-memory copy of the seed catalogue with four example orders for tomorrow. Data resets when the server restarts.

- Storefront: http://localhost:3000/belanja
- Restaurant login: phone `081200000001`, code `BHR123` (or `081200000002` / `MNG456`)
- Back-office: http://localhost:3000/admin, any email, password `dipasaria` (`DEMO_ADMIN_PASSWORD`)

## Go live on Supabase + Vercel (about two hours)

1. **Supabase**: create a free project in the Singapore region. In the SQL editor run `supabase/schema.sql`, then `supabase/seed.sql`. Never run `supabase/seed-demo.sql` on a real project: it adds example restaurant accounts whose access codes are published in this README. (A project created from an earlier schema runs the files in `supabase/migrations/` it has not run yet, in order, then `schema.sql` again. `seed.sql` is safe to re-run too: it only inserts missing rows and never overwrites prices, stock, settings or the bank account. `004_audit_fixes.sql` also suspends the example accounts; `005_protection_and_monitoring.sql` adds the payment deadline, rate limits, error log and partial standing-order notes; `006_qris_gateway.sql` goes with the QRIS gateway, whose `payments` table is created by `schema.sql`; `007_whatsapp_notifications.sql` adds WhatsApp opt-in and settings; `008_customer_accounts.sql` goes with household accounts, whose tables `schema.sql` creates; `009_integrity_fixes.sql` fixes stock returns on cancel, phone formats and cut-off format before the new data-integrity rules apply; `010_value_features.sql` goes with substitution preferences, delivery confirmation, guarantee claims, restock alerts and the buying log; `011_receivables.sql` goes with restaurant receivables and contract prices.)
2. **Admin user**: Authentication → Users → add your email and password (disable public sign-ups under Auth settings). Then in SQL: `insert into admins (user_id, label) values ('<the user uuid>', 'Pemilik');`
3. **Example accounts**: `seed.sql` no longer creates them. On a project seeded before November 2026, migration 004 suspends them; you can also delete them: `delete from business_accounts where id in ('ba_bahari','ba_minang','ba_kemang');`
4. **Vercel** (or any Node host): import this repository, set the environment variables from `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`; generate secrets with `openssl rand -hex 32`). The server refuses to start in production if Supabase or `SESSION_SECRET` is missing, so a typo cannot silently put the shop into demo mode. Deploy, connect your domain. `vercel.json` schedules the standing-order job daily at 19.45 WIB; Vercel sends `CRON_SECRET` with each call.
5. **Back-office → Pengaturan**: WhatsApp number, bank account (replace the `0000000000` placeholder), QRIS image link, cut-off, minimums, areas and slots. **Produk & stok**: real prices and buying costs.
6. Place one test order from your own phone, weigh it, mark it paid, cancel it (stock comes back). Then send the first access codes from **Pelanggan**.
7. **Protection and monitoring** (about 20 minutes, all free; see the next section). Then open **Back-office → Sistem**: every line should read "Baik".

## Protection and monitoring

All four pieces work without a paid service. **Back-office → Sistem** shows which ones are set up.

| What | What it does | Setup |
|---|---|---|
| **Rate limits** | Stop scripts placing fake orders, guessing access codes or flooding account applications. Limits per device: 10 orders an hour, 20 logins every 15 minutes, 5 applications an hour. Per phone number: 6 household orders a day. | Always on (table `rate_hits`). |
| **Bot check** (Cloudflare Turnstile) | A mostly invisible "are you human" check on household checkout, business login and the account application. Signed-in restaurants skip it at checkout. | Cloudflare dashboard → Turnstile → add widget for your domain. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Vercel. No rebuild needed. If Cloudflare itself is down, orders still go through, the rate limits still apply, and the outage is logged. |
| **Unpaid orders expire** | A household order paid by transfer or QRIS with a known total must be paid within **Pengaturan → Batas waktu pembayaran** (default 120 minutes, and never later than midnight before the delivery day). Otherwise it is cancelled, and its stock, delivery slot and promo use are released. The customer sees the deadline on the tracking page. The admin can send a WhatsApp reminder, add 2 hours or switch it off per order. Orders with weighed items, restaurant accounts, COD and payment terms are never cancelled automatically. | Runs by itself on every checkout, order lookup and back-office visit. To make it punctual overnight, call `GET /api/cron/expire-unpaid` with `Authorization: Bearer $CRON_SECRET` every 10 minutes from a free scheduler such as cron-job.org. This is the recommended way: it also checks open QR codes with Midtrans first and sends the WhatsApp messages. (pg_cron in Supabase, `select expire_unpaid_orders()`, only cancels; the messages then follow on the next visit to the site.) Vercel Hobby runs cron only daily. |
| **Error monitoring** | Server errors, crashed customer screens and failed standing orders are grouped on **Sistem**, with a count and technical detail. The dashboard shows a red banner while any are unresolved. A new error is pushed to your phone. | Telegram: message @BotFather → `/newbot` → copy the token; send your bot a message, open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id`. Set `ALERT_WEBHOOK_URL=https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>`. Slack and Discord webhooks work too. |
| **Uptime** | `GET /api/health` answers 200 while the app and the database are up, and 503 otherwise. | UptimeRobot (free): add an HTTP monitor for `https://<your-domain>/api/health` every 5 minutes, with alerts to email or Telegram. |

**Household accounts (sign in with WhatsApp):**

*What the customer gets at `/akun`*
- Sign in with their phone number and a 6-digit code sent on WhatsApp. There is no password.
- All their orders, including guest orders placed with that number before they signed up.
- One-tap reorder.
- An address book, with a default address that fills checkout. New addresses can be saved during checkout.
- Their name, and a separate yes/no for promotional WhatsApp messages (recorded with the date).
- **Hapus akun saya**, which deletes the profile and addresses, as Indonesia's data protection law (UU PDP) expects. Orders stay as transaction records.

*Signed-in customers at checkout*
- The order goes to their verified number.
- They skip the bot check.

*How the code works*
- Codes expire after 10 minutes, are single-use, and lock after 5 wrong tries.
- Requests are limited to one a minute and 3 per 15 minutes per number.
- Only hashes of codes and session tokens are stored.

*Other places it shows up*
- Restaurant login stays on the same page, below the household login.
- Back-office → Pelanggan lists household accounts and their consent.

*Delivering the codes*
- Requires the WhatsApp Cloud API and one **Authentication** template, `dipasaria_kode_masuk` (`docs/whatsapp-templates.md`).
- Without it, the page says sign-in isn't available yet, and guests can still order.
- In demo mode the code is shown on screen.

**Automatic WhatsApp messages to customers:**

*Messages and when they go out*
- **Pesanan diterima:** at checkout.
- **Tagihan akhir:** after the dawn weigh-in, with the final amount and how to pay. A corrected amount sends a corrected invoice.
- **Pembayaran diterima:** when payment is confirmed.
- **Dalam pengiriman:** when the order goes out for delivery.
- **Pengingat bayar:** 30 minutes before an unpaid order's deadline.
- **Pesanan dibatalkan:** with the reason.
- **Pesanan rutin dibuat:** for restaurants, naming any item left out that night.

*Rules*
- Customers can untick updates at checkout, and each message type can be switched off in Pengaturan.
- Each message is written once to an outbox (`wa_messages`), so nothing is sent twice. Failed sends are retried by the background sweep.
- Every message, with its status, appears on the order page and in **Back-office → Pesan WA**.

*Without the API (works today)*
- Messages wait in Pesan WA, prepared with the customer's name, amount and tracking link.
- Tap **Kirim via WhatsApp**, then press send in WhatsApp.

*With the API (WhatsApp Cloud API by Meta, the official channel)*
1. In Meta Business Suite, add a WhatsApp Business Account and register a phone number. It must not be in use in the WhatsApp app; a new number is simplest.
2. Create a System User with a permanent token (permission `whatsapp_business_messaging`).
3. Set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.
4. Create the 7 templates in `docs/whatsapp-templates.md` (Utility, Indonesian) and wait for approval.

*Cost*
- Meta charges per utility template, roughly Rp300–500 each in Indonesia; check Meta's rate card.
- Utility templates are free while the customer has messaged you within the last 24 hours.

**QRIS with automatic confirmation (Midtrans):**

*How it works for the customer*
- A customer who chose QRIS sees a QR code for the exact final amount once it is known: at checkout for fixed-weight items, after the dawn weigh-in for weighed items.
- They pay with any bank or e-wallet app, and the order page confirms by itself within seconds.
- On the same phone, they can save the QR image and pick it from the gallery.
- QR codes last 30 minutes (always ending before the order's payment deadline) and renew with one tap.

*Safety checks*
- Midtrans' notification must carry a valid signature, and even then the result is read back from Midtrans' status API before anything changes.
- If a notification is missed, the order page and the back-office ask Midtrans directly.
- Re-weighing or cancelling an order withdraws its open QR.
- Anything unusual is noted on the order and sent to your alert chat, never marked paid on its own:
  - a different amount;
  - a second payment;
  - money arriving after an order was cancelled.

*Setup*
1. Create a Midtrans account and complete activation for QRIS. QRIS MDR is about 0.7% per transaction; check your Midtrans agreement.
2. Put the sandbox server key in `MIDTRANS_SERVER_KEY` (keys starting with `SB-` use the sandbox automatically).
3. In the Midtrans dashboard set **Payment Notification URL** to `https://<your-domain>/api/payments/midtrans`.
4. Run `supabase/migrations/006_qris_gateway.sql`, then `schema.sql`.
5. Place a QRIS test order and pay it with Midtrans' sandbox QRIS simulator. Check that it turns "Lunas" by itself.
6. Switch to the production key.

*What stays the same*
- Back-office → Sistem shows which gateway is active.
- Without a key, QRIS orders keep the static QRIS image and manual confirmation.
- Bank transfer stays manual.
- Refunds are still made by hand (the order shows "Perlu pengembalian dana").
- In demo mode, a built-in demo gateway shows the whole flow, with a "Simulasikan pembayaran" button.

**Partial standing orders:**
- If an item in a restaurant's standing order is switched off, sold out today or short on stock at 19:45, the rest of the order is still placed.
- The missing item is noted on the order and in **Pesanan rutin**, with a "Kabari via WA" button to tell the restaurant. The restaurant also sees it on its account page.
- If what remains is below the business minimum, the run fails visibly and can be retried after restocking.

The service-role key is used only by the Next.js server; the browser never receives it. Row-level security denies everything to the anon key, so even a leaked anon key reads nothing.

## Daily backups

Every night at 02.17 WIB, a GitHub Action (`.github/workflows/backup.yml`):
1. dumps the database (all shop data: orders, products, accounts, settings, functions and access rules);
2. **proves the dump works** by restoring it into a throwaway database and comparing row counts;
3. encrypts it with your passphrase (AES-256) and keeps 30 days of copies in GitHub;
4. optionally copies it off-site, for example to Cloudflare R2 (free up to 10 GB);
5. reports to the shop. **Back-office → Sistem** shows the last verified backup, and you get an alert if a backup fails or none has run for 36 hours.

**Cost:** Rp 0. It uses about 2 minutes of the 2,000 free GitHub Actions minutes a month, and a few MB of artifact storage.

**Setup (10 minutes):**
1. Merge this branch into the repository's default branch. GitHub only runs scheduled workflows from the default branch.
2. Repository → Settings → Secrets and variables → Actions → **New repository secret**:
   - **`SUPABASE_DB_URL`:** Supabase → **Connect** → **Session pooler** connection string, with your database password filled in. The session pooler works over IPv4, which GitHub needs.
   - **`BACKUP_PASSPHRASE`:** a long random passphrase. **Also save it in your password manager: without it a backup cannot be opened.**
   - **`APP_URL`:** your shop address, for example `https://dipasaria.id`.
   - **`CRON_SECRET`:** the same value as in Vercel.
   - Optional off-site copy: `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`.
3. Actions → **Daily database backup** → **Run workflow** once. Back-office → Sistem should then show "Cadangan harian: Baik".

**Restoring** (if the database is lost or damaged):
1. Create a new Supabase project.
2. Download the latest artifact from Actions.
3. Run `scripts/backup/restore.sh` (the steps are at the top of the file). It decrypts the backup, refuses to write over a database that already has data, and restores everything.
4. Re-create your admin login and point Vercel at the new project.

Practise once a month: restore into a scratch project and check that your latest orders are there.

**Supabase's own backups:** Supabase Pro (US$25 a month) adds 7 days of automatic daily backups, plus optional point-in-time recovery. Worth it once the shop is busy; this workflow is the independent, free copy either way.

## The daily loop on your phone

| Time | Screen | What you do |
| --- | --- | --- |
| 20:00 | Ringkasan | Cut-off passes; confirm new orders (WA konfirmasi button opens WhatsApp with the message filled in) |
| 02:30 | Belanja subuh | Buying list by temperature zone with the +5% buffer and the cleaning partner's prep notes; tick as you buy and log what you paid (**Catat**); log leftovers and waste after the round to see real margin and shrinkage |
| 04:30 | Pesanan → order | Type weighed kg, **Simpan timbangan**; server re-prices promo and delivery fee; send **WA invoice final** |
| 05:00 | Rute & packing | Drops grouped by slot and area, bags per temperature zone, amount to collect for COD, the customer's substitution choice, **WA sedang dikirim** |
| 06:00–08:00 | Rute & packing | **Diterima** at each drop (who received it, COD cash counted) or **Gagal antar** with the reason; the summary shows COD collected and still due |
| Morning | Garansi | Decide guarantee claims (replace, refund or decline); the customer is told by WhatsApp |
| 08:00 | Pesanan | Once transfer money is in the bank app, **Tandai lunas** |
| Afternoon | Produk & stok | Update prices and costs before 18:00; the margin column turns red under 10% |
| When a transfer arrives | Piutang | Record a restaurant's payment once; it settles its oldest invoices first |
| Weekly | Piutang | Check ageing; send each restaurant its statement by WhatsApp (one tap) |
| Weekly | Laporan | Sales, gross margin, non-seafood share; CSV export for the accountant |

## Design direction (round 3)

Benchmarked on a chef's-butcher e-commerce site, with Dipasaria's brand palette (cream `#FAF8F4`, parchment `#EEE7DA`, gold `#EAB200`, deep gold `#C09200`, black `#000000`): bold condensed uppercase headings (Barlow Condensed) with Barlow body text, a black header bar with a category mega-menu and cart drawer, a gold cut-off strip, cream collection headers with filters and sort, white product cards with a "from" price and a square gold cart button, a gold "How it works" strip, cream story sections, FAQ accordions, an outline-text marquee and a black footer with a WhatsApp newsletter.

**Belanja is the primary landing and conversion page** (`/` redirects to `/belanja`): hero carousel, shop-by-category tiles, "find your next order" cards, how it works, standards split with today's catch, story band, most-reordered and freezer sections, and a closing image band. Category pages are collection pages; the product page carries trust icons, "often bought together", related products and an FAQ.

**Photography (round 4).** Every product, category, hero and story section now carries a real photo: 47 temporary Pexels-licensed images, self-hosted under `public/images` (about 10 MB) and credited in `docs/photo-credits.md`. Product cards are photo-led with category, species, size and preparation summary and a from-price; product pages have a four-image gallery and a details table; collection pages have photographic headers. Cumi Segar and Otak-otak Tenggiri keep the illustrated placeholder until own photos exist. Replace any photo through the product's "URL foto" field in the back-office or in `src/lib/content/images.ts`; the shot list for your own photography is `docs/photo-brief.md`.

**Brand identity and Indonesian copy (round 5).** A new logo system: a single fish mark whose body is a "D" (straight back, full curve), a flared forked tail and one eye, set with a Barlow Condensed ExtraBold wordmark and the descriptor "Protein pilihan · Jakarta", plus a circular seal for packaging. App icons, favicons, social preview and lockups are in `public/brand`, `public/icons` and `public/og.jpg`, regenerated by `node scripts/export-brand.cjs`. A `gold-ink` colour (`#866500`) carries small gold text on light backgrounds so it meets WCAG AA. Every Indonesian string (pages, product catalogue, checkout, WhatsApp messages, error messages from the database functions and the admin panel) was edited for natural, consistent Indonesian under EYD V: `Rp150.000`, `pukul 20.00 WIB`, one glossary (*ukuran* not *grade*, *jam pengiriman* not *slot*, *tagihan akhir* not *invoice final*, *ongkos kirim* not *ongkir*). The rules, glossary, logo usage, palette, type, iconography, photography and voice are in `docs/brand-guidelines.md`.

**Brand identity v2 (round 6).** Rebuilt as a full consumer-brand system within the same palette: an emblem of a snapper leaping out of a Muara Baru market basket with a gold "senyum" arc beneath, a two-tone Plus Jakarta Sans wordmark (**Dipa**saria), the tagline "— Segar & terpilih —", horizontal and stacked lockups, a quality seal, and the "sisik" scale pattern used on black and gold surfaces. Plus Jakarta Sans is now the brand sans for all body and interface text, with Barlow Condensed kept for headlines. Everything is generated from one script (`npm run brand`): SVG and PNG logo files, app icons, the social image and the brand board at `docs/brand/brand-board.png`.

**Refinement (round 7).** The emblem was redrawn with more craft (curved snapper with tapered gill and lateral line, finer basket with rim line, tapered gold crescent), the wordmark set in Bold with a gold square dot on the "i", and an arch badge added for packaging. An independent copy review drove a full Indonesian pass: EYD V list commas, one term per concept across storefront and admin (jam pengiriman, titik antar, cadangan, Bisnis/Rumah tangga, Pilihan dapur), Indonesian unit labels and decimal commas in every quantity a customer sees (including WhatsApp messages and database error messages, via `qtyUnit()` and the SQL `unit_label()`), sentence-case category names and corrected factual inconsistencies (kitchen delivery "sebelum pukul 08.00", weighing at 04.30).

**Round 8.** The logo became a concept with a story, "Fajar di pasar": a dawn sun (*dipa*, light) rising from the market basket (*pasar*), a snapper leaping across it with the light showing through its eye, gill and lateral line, a gold crescent of service beneath, and the gold dot on the "i" as *sari*, the best of each lot. The meaning is told on the About page (`/tentang#makna-logo`) and in `docs/brand-guidelines.md`. Hero and page headers were rebuilt for readability on every screen shape. The catalogue grew from 31 to 53 products, and every product now has a photo (see `docs/photo-credits.md` for the ones to replace first). New: a two-stage cart progress bar (minimum order, then free delivery), a sticky add-to-cart bar on mobile product pages, a category rail with counts, popular-search chips, and Product and Organization structured data for search engines.

**Round 9: recipe bundles and restaurant standing orders.**
- *Recipe bundles* (`/resep`, plus a band on Belanja and "Masak dengan ini" on product pages): seven tested recipes, each mapped to catalogue items with the right size and preparation. The shopper sets the servings (quantities scale and round to each product's step), unticks what they already have, sees the estimated total and adds everything in one tap. Recipes live in `src/lib/content/recipes.ts`.
- *Standing orders* for approved business accounts (`/akun`): choose items (or start from a past order), weekdays, delivery slot and payment; pause, edit, delete, or skip a single date. Every evening at 19.45 WIB, before the 20.00 cut-off, `src/app/api/cron/standing-orders` places the next day's orders through the normal pricing and stock rules; `standing_order_runs` has a unique key per order and date so a repeated run never duplicates. The back-office page **Pesanan rutin** shows weekly recurring value, what is due tomorrow, a manual "process now" button, WhatsApp reminders and run history. Rules are in `src/lib/standing.ts`.
- The hero headline is larger and the favicon now uses a dedicated tab-sized mark (`/favicon.ico` and `icons/favicon.svg`); the service worker cache version was bumped so browsers drop the old icon and photos.

**Round 12: second audit and value features.** 32 issues found and fixed (7 high: gateway payment checks, expiry racing a paid QR, Midtrans outages, the cut-off format, restaurant lock-out, re-running the seed, and the backup check). Seven features, each with a measurable aim (details in `docs/audit-round-2.md`):
- *Substitution preference* at checkout: replace with similar, call me first, or remove.
- *Delivery mode* on the route sheet: delivered with recipient and COD cash, or failed with a reason; the customer sees it and gets a WhatsApp message.
- *Two-hour freshness guarantee*: the customer reports with photos from the order page; the owner decides on **Garansi**, tracked against a 1.5% of sales budget.
- *Kabari saya*: sold-out products take a WhatsApp number and send one message when back in stock; **Produk & stok** shows how many are waiting.
- *Buying log*: actual purchase cost, leftovers and waste per product; real margin and shrinkage on the buying list and in **Laporan**.
- *Lengkapi masakan*: the cart offers the missing ingredients of a recipe whose main fish is in the cart, in one tap.
- *CI*: every test suite runs on each change.

**Restaurant receivables and contract prices.** Every tempo order is an invoice with a due date. On **Piutang**, the owner:
- records each transfer once; it settles the oldest invoices first, and any overpayment is kept as credit;
- sees ageing per restaurant (not yet due, 1–7, 8–14, 15–30, over 30 days) and sets a credit limit;
- adds contract prices per product with validity dates;
- prints a statement for any period, or sends it by WhatsApp with a signed link.

The database refuses a tempo order that would pass the limit, or while an invoice is past due beyond the grace days set in **Pengaturan**. The restaurant sees the reason at checkout and its balance on **Akun**. Details are in `docs/audit-round-2.md`, section 10.

## What is built

**Storefront**: bilingual catalogue by category with quick-add on cards, add-to-cart toast and a sticky cart bar, "today's catch" / "kitchen favourites" / "stock the freezer" sections, two value boxes, search across Indonesian/English/scientific/market names, product sheet with size grades, preparation options (siangi, fillet, kupas) and storage notes, catch-weight transparency ("perkiraan" totals until weighed), cart with minimum-order progress bar, three-step checkout with delivery areas, date chips honouring the 20:00 WIB cut-off, slots with live remaining capacity, promo codes, QRIS/transfer/COD/terms, order confirmation, tracking by order code + WhatsApp number from any device, "Saya sudah bayar", business login without passwords, one-tap **Pesan lagi**, installable PWA with offline fallback.

**Back-office**: daily summary with delivery-date selector (orders, sales, estimated gross margin, non-seafood share against the Gate B target, unpaid, to-weigh), orders list with filters and search, order detail with status flow, cancel (stock returned), weigh-and-reprice, payment status, internal notes and three prepared WhatsApp messages, dawn buying list, route and packing sheet (printable), products with inline auto-saving price/cost/stock edits and an "available today" switch, product and variant editor, business account approvals with generated access codes sent via WhatsApp, promo codes, settings (store, payment, cut-off, minimums, areas, slots), sales report with CSV.

**Server-side rules** (in `supabase/schema.sql` and mirrored in `src/lib/pricing.ts` for demo mode): prices from the price list, account discount, prep surcharge, minimum qty and step, stock reservation, business-only variants, daily availability, cut-off and date window, slot capacity with locking, payment-method rights, promo validity (segment, dates, quota, minimum spend, first order per phone), delivery fee thresholds, re-pricing after weighing, stock return on cancel.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Next.js |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `.github/workflows/ci.yml` | Runs lint, types, build, the SQL and backup suites and the three browser suites on every push and pull request |
| `node scripts/test-e2e.cjs` | Main end-to-end suite (Playwright); start a fresh demo server first, see the file header |
| `npm run test:backup` | Dump → verify → encrypt → disaster-restore on a local PostgreSQL, plus the failure cases (run `npm run test:sql` first) |
| `node scripts/test-whatsapp.cjs` | WhatsApp notifications against a local Cloud API stand-in (see the file header) |
| `node scripts/test-midtrans.cjs` | QRIS gateway test against a local Midtrans stand-in (see the header of the file for how to start the app) |
| `npm run test:sql` | Loads schema + seed into a local PostgreSQL and runs `scripts/sql-tests.sql` (needs `psql`; set `PGHOST`/`PGPORT`/`PGUSER`) |
| `node scripts/gen-seed.mts` | Regenerates `supabase/seed.sql` from `src/lib/data/seed.ts` |

## Costs and roadmap

Launch: Rp 0 a month (Supabase Free, Vercel Hobby) plus a domain. Supabase Pro (US$25) at Gate A/B for daily backups. Midtrans or a static QRIS from your bank for payments; WhatsApp Business API alerts, Biteship courier booking, standing orders and accounting export are Phase 3 items (see `docs/architecture.md`). Native apps only as a thin wrapper around this PWA, after Gate D.

## Not yet tested against a real Supabase project

The SQL functions are tested on PostgreSQL 16 (`npm run test:sql`), and the whole app is driven end to end in demo mode (Playwright: household order with promo, business reorder, tracking from another device, admin weigh/confirm/pay, inline price edit, account approval). The Supabase adapter (`src/lib/data/supabase.ts`) has not yet been run against a live project: the test order in step 6 above covers it.
