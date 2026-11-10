# Dipasaria — Seafood-Led Protein Commerce Platform

Corporate website, installable mobile storefront (PWA) and founder back-office for a Jakarta supplier of graded seafood, halal chicken, eggs and kitchen essentials. One Next.js codebase on Supabase; Rp 0 a month on free tiers until daily sales justify Supabase Pro. Customer-facing pages are bilingual (Bahasa Indonesia default, English via the header toggle); the back-office is in Indonesian.

| Surface | Where | Who |
| --- | --- | --- |
| Storefront (PWA), the landing page | `/belanja`, `/belanja/semua`, `/belanja/kategori/[slug]`, `/belanja/produk/[slug]`, `/keranjang`, `/checkout`, `/pesanan`, `/akun` | Households (guest checkout) and restaurants (phone + access code) |
| Corporate pages | `/tentang`, `/restoran`, `/rumah-tangga`, `/panduan`, `/kontak`, `/privasi` | Prospects, partners, search engines |
| Back-office | `/admin` | The founder, from a phone at 02:30 or a laptop in the afternoon |

Screenshots of every screen are in `docs/screenshots/`. Architecture and data model: `docs/architecture.md`. Photo slots and shot list: `docs/photo-brief.md`.

## Run it in two minutes (demo mode, no database)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Supabase credentials the app runs on an in-memory copy of the seed catalogue with four example orders for tomorrow. Data resets when the server restarts.

- Storefront: http://localhost:3000/belanja
- Restaurant login: phone `081200000001`, code `BHR123` (or `081200000002` / `MNG456`)
- Back-office: http://localhost:3000/admin, any email, password `dipasaria` (`DEMO_ADMIN_PASSWORD`)

## Go live on Supabase + Vercel (about two hours)

1. **Supabase**: create a free project in the Singapore region. In the SQL editor run `supabase/schema.sql`, then `supabase/seed.sql`. (A project created from the round-1 schema instead runs `supabase/migrations/002_bilingual_content.sql`, then `seed.sql` again.)
2. **Admin user**: Authentication → Users → add your email and password (disable public sign-ups under Auth settings). Then in SQL: `insert into admins (user_id, label) values ('<the user uuid>', 'Pemilik');`
3. **Delete the example accounts** before sharing the link: `delete from business_accounts where id in ('ba_bahari','ba_minang','ba_kemang');`
4. **Vercel** (or any Node host): import this repository, set the environment variables from `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`), deploy, connect your domain.
5. **Back-office → Pengaturan**: WhatsApp number, bank account, QRIS image link, cut-off, minimums, areas and slots. **Produk & stok**: real prices and buying costs.
6. Place one test order from your own phone, weigh it, mark it paid, cancel it (stock comes back). Then send the first access codes from **Pelanggan**.

The service-role key is used only by the Next.js server; the browser never receives it. Row-level security denies everything to the anon key, so even a leaked anon key reads nothing.

## The daily loop on your phone

| Time | Screen | What you do |
| --- | --- | --- |
| 20:00 | Ringkasan | Cut-off passes; confirm new orders (WA konfirmasi button opens WhatsApp with the message filled in) |
| 02:30 | Belanja subuh | Buying list by temperature zone with the +5% buffer and the cleaning partner's prep notes; tick as you buy |
| 04:30 | Pesanan → order | Type weighed kg, **Simpan timbangan**; server re-prices promo and delivery fee; send **WA invoice final** |
| 05:00 | Rute & packing | Drops grouped by slot and area, bags per temperature zone, amount to collect for COD, **WA sedang dikirim** |
| 08:00 | Pesanan | Mark delivered and, once money is in the bank app, **Tandai lunas** |
| Afternoon | Produk & stok | Update prices and costs before 18:00; the margin column turns red under 10% |
| Weekly | Laporan | Sales, gross margin, non-seafood share; CSV export for the accountant |

## Design direction (round 3)

Benchmarked on a chef's-butcher e-commerce site, with Dipasaria's brand palette (cream `#FAF8F4`, parchment `#EEE7DA`, gold `#EAB200`, deep gold `#C09200`, black `#000000`): bold condensed uppercase headings (Barlow Condensed) with Barlow body text, a black header bar with a category mega-menu and cart drawer, a gold cut-off strip, cream collection headers with filters and sort, white product cards with a "from" price and a square gold cart button, a gold "How it works" strip, cream story sections, FAQ accordions, an outline-text marquee and a black footer with a WhatsApp newsletter.

**Belanja is the primary landing and conversion page** (`/` redirects to `/belanja`): hero carousel, shop-by-category tiles, "find your next order" cards, how it works, standards split with today's catch, story band, most-reordered and freezer sections, and a closing image band. Category pages are collection pages; the product page carries trust icons, "often bought together", related products and an FAQ.

**Photography (round 4).** Every product, category, hero and story section now carries a real photo: 47 temporary Pexels-licensed images, self-hosted under `public/images` (about 10 MB) and credited in `docs/photo-credits.md`. Product cards are photo-led with category, species, size and preparation summary and a from-price; product pages have a four-image gallery and a details table; collection pages have photographic headers. Cumi Segar and Otak-otak Tenggiri keep the illustrated placeholder until own photos exist. Replace any photo through the product's "URL foto" field in the back-office or in `src/lib/content/images.ts`; the shot list for your own photography is `docs/photo-brief.md`.

**Brand identity and Indonesian copy (round 5).** A new logo system: a single fish mark whose body is a "D" (straight back, full curve), a flared forked tail and one eye, set with a Barlow Condensed ExtraBold wordmark and the descriptor "Protein pilihan · Jakarta", plus a circular seal for packaging. App icons, favicons, social preview and lockups are in `public/brand`, `public/icons` and `public/og.jpg`, regenerated by `node scripts/export-brand.cjs`. A `gold-ink` colour (`#866500`) carries small gold text on light backgrounds so it meets WCAG AA. Every Indonesian string (pages, product catalogue, checkout, WhatsApp messages, error messages from the database functions and the admin panel) was edited for natural, consistent Indonesian under EYD V: `Rp150.000`, `pukul 20.00 WIB`, one glossary (*ukuran* not *grade*, *jam pengiriman* not *slot*, *tagihan akhir* not *invoice final*, *ongkos kirim* not *ongkir*). The rules, glossary, logo usage, palette, type, iconography, photography and voice are in `docs/brand-guidelines.md`.

**Brand identity v2 (round 6).** Rebuilt as a full consumer-brand system within the same palette: an emblem of a snapper leaping out of a Muara Baru market basket with a gold "senyum" arc beneath, a two-tone Plus Jakarta Sans wordmark (**Dipa**saria), the tagline "— Segar & terpilih —", horizontal and stacked lockups, a quality seal, and the "sisik" scale pattern used on black and gold surfaces. Plus Jakarta Sans is now the brand sans for all body and interface text, with Barlow Condensed kept for headlines. Everything is generated from one script (`npm run brand`): SVG and PNG logo files, app icons, the social image and the brand board at `docs/brand/brand-board.png`.

**Refinement (round 7).** The emblem was redrawn with more craft (curved snapper with tapered gill and lateral line, finer basket with rim line, tapered gold crescent), the wordmark set in Bold with a gold square dot on the "i", and an arch badge added for packaging. An independent copy review drove a full Indonesian pass: EYD V list commas, one term per concept across storefront and admin (jam pengiriman, titik antar, cadangan, Bisnis/Rumah tangga, Pilihan dapur), Indonesian unit labels and decimal commas in every quantity a customer sees (including WhatsApp messages and database error messages, via `qtyUnit()` and the SQL `unit_label()`), sentence-case category names and corrected factual inconsistencies (kitchen delivery "sebelum pukul 08.00", weighing at 04.30).

## What is built

**Storefront**: bilingual catalogue by category with quick-add on cards, add-to-cart toast and a sticky cart bar, "today's catch" / "kitchen favourites" / "stock the freezer" sections, two value boxes, search across Indonesian/English/scientific/market names, product sheet with size grades, preparation options (siangi, fillet, kupas) and storage notes, catch-weight transparency ("perkiraan" totals until weighed), cart with minimum-order progress bar, three-step checkout with delivery areas, date chips honouring the 20:00 WIB cut-off, slots with live remaining capacity, promo codes, QRIS/transfer/COD/terms, order confirmation, tracking by order code + WhatsApp number from any device, "Saya sudah bayar", business login without passwords, one-tap **Pesan lagi**, installable PWA with offline fallback.

**Back-office**: daily summary with delivery-date selector (orders, sales, estimated gross margin, non-seafood share against the Gate B target, unpaid, to-weigh), orders list with filters and search, order detail with status flow, cancel (stock returned), weigh-and-reprice, payment status, internal notes and three prepared WhatsApp messages, dawn buying list, route and packing sheet (printable), products with inline auto-saving price/cost/stock edits and an "available today" switch, product and variant editor, business account approvals with generated access codes sent via WhatsApp, promo codes, settings (store, payment, cut-off, minimums, areas, slots), sales report with CSV.

**Server-side rules** (in `supabase/schema.sql` and mirrored in `src/lib/pricing.ts` for demo mode): prices from the price list, account discount, prep surcharge, minimum qty and step, stock reservation, business-only variants, daily availability, cut-off and date window, slot capacity with locking, payment-method rights, promo validity (segment, dates, quota, minimum spend, first order per phone), delivery fee thresholds, re-pricing after weighing, stock return on cancel.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Next.js |
| `npm run typecheck` | TypeScript |
| `npm run test:sql` | Loads schema + seed into a local PostgreSQL and runs `scripts/sql-tests.sql` (needs `psql`; set `PGHOST`/`PGPORT`/`PGUSER`) |
| `node scripts/gen-seed.mts` | Regenerates `supabase/seed.sql` from `src/lib/data/seed.ts` |

## Costs and roadmap

Launch: Rp 0 a month (Supabase Free, Vercel Hobby) plus a domain. Supabase Pro (US$25) at Gate A/B for daily backups. Midtrans or a static QRIS from your bank for payments; WhatsApp Business API alerts, Biteship courier booking, standing orders and accounting export are Phase 3 items (see `docs/architecture.md`). Native apps only as a thin wrapper around this PWA, after Gate D.

## Not yet tested against a real Supabase project

The SQL functions are tested on PostgreSQL 16 (`npm run test:sql`), and the whole app is driven end to end in demo mode (Playwright: household order with promo, business reorder, tracking from another device, admin weigh/confirm/pay, inline price edit, account approval). The Supabase adapter (`src/lib/data/supabase.ts`) has not yet been run against a live project: the test order in step 6 above covers it.
