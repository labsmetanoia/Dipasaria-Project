# Architecture

## Principles (from the project brief)

| Principle | How this codebase meets it |
| --- | --- |
| Managed services | Supabase (Postgres, Auth, Storage) + Vercel/Cloudflare hosting. No servers to patch. |
| Pay as you grow | Free tiers at launch; Supabase Pro at ~US$25 when daily sales justify it. No licences. |
| Server-side business logic | `place_order`, `weigh_order`, promo and stock rules are PL/pgSQL functions. The browser only sends variant ids and quantities; prices are recomputed on the server. |
| Unified codebase | Storefront, corporate site and back-office are one Next.js app sharing types, formatting and pricing rules. |
| Data ownership | Plain Postgres tables in your own Supabase project; `pg_dump` or the dashboard exports everything. |
| Modular | Data access behind a `Repo` interface (`src/lib/data/repo.ts`) with two adapters; integrations (Midtrans, WhatsApp API, Biteship) slot in as new server actions without touching the UI. |

## Layers

```
Browser (PWA)  ──server actions──▶  Next.js server  ──service role──▶  Supabase Postgres
   zustand cart                     src/actions/*                      supabase/schema.sql
   client quote (display)           src/lib/auth.ts (sessions)         SQL functions = authority
                                    src/lib/data/{supabase,memory}.ts
```

- `src/lib/types.ts` — domain types.
- `src/lib/pricing.ts` — quote rules used by the browser for live totals and by the in-memory adapter. The SQL functions implement the same rules and are the authority in production.
- `src/lib/data/` — `Repo` interface, `supabase.ts` (production), `memory.ts` (demo/preview), `seed.ts` (single source for the catalogue; `scripts/gen-seed.mts` writes `supabase/seed.sql`).
- `src/lib/auth.ts` — business session cookie (`dp_biz`, token stored in `business_sessions`), admin session (Supabase Auth + `admins` table; demo password in demo mode).
- `src/actions/shop.ts`, `src/actions/admin.ts` — server actions; admin actions call `isAdmin()` first.
- `src/app/(marketing)` corporate pages (cached, revalidated every 10 minutes), `src/app/(shop)` storefront, `src/app/admin/(panel)` back-office.
- `public/sw.js` — service worker: cache-first static assets, network-first pages, offline fallback; never caches checkout or admin.

## Data model

```
settings (1 row)         categories ─┬─ products ─┬─ variants (unit, min, step, retail, business, cost, stock, business_only)
delivery_areas (fee)                 │            └─ prep_options (surcharge per unit)
delivery_slots (segment, capacity)   │
promos                                │
business_accounts ── business_sessions
orders (segment, delivery_date, slot, payment, status, est + final totals, history jsonb)
  └─ order_items (snapshot of names, prices, cost; qty_ordered, qty_final)
admins (Supabase Auth user ids)
```

Order items snapshot product names, prices and costs at order time, so later price changes never alter a past invoice and gross-margin reports stay exact.

## Security model

- Row-level security is enabled on every table; the only policy allows users listed in `admins`. The anon key can read nothing.
- The Next.js server uses the service-role key (never exposed to the browser) and calls SQL functions whose execute rights are revoked from `anon` and `authenticated`.
- Customers see an order only with its code **and** the WhatsApp number that placed it.
- Business accounts log in with phone + 6-character code; a session token lives in an httpOnly cookie for 90 days. Regenerating the code invalidates all sessions.
- Slot capacity uses a transaction-scoped advisory lock so two simultaneous checkouts cannot overbook.
- Personal data notice (UU 27/2022) is published at `/privasi`.

## Catch-weight flow

1. Customer orders 1 kg of a product flagged `is_catch_weight`; the order stores `total_est` and leaves `total_final` null.
2. At 04:30 the founder enters weighed kg; `weigh_order` recomputes line totals, the promo (percent/fixed) and the delivery-fee threshold, then sets `total_final` and `weighed_at`.
3. The customer's tracking page shows ordered vs weighed quantities and the final amount; payment instructions appear only when the final total is known.

## Phase plan for integrations

| Phase | Add | Where it plugs in |
| --- | --- | --- |
| 2 | Midtrans Snap + webhook | New route handler sets `payment_status = 'paid'` via `set_payment_status`; replace the static QRIS block in `OrderTracking.tsx`. |
| 3 | WhatsApp Business API | Replace the click-to-chat links in `src/lib/wa.ts` with API sends triggered from `setOrderStatusAction` / `weighOrderAction`. |
| 3 | Biteship courier booking | Action on the route sheet; store the tracking id on `orders`. |
| 3 | Standing orders | Table `standing_orders(account_id, weekday, lines)`; a scheduled function creates draft orders at 18:00. |
| 4 | Rider view, e-Faktur, app-store wrapper | Rider page under `/admin/rute` with proof-of-delivery upload to Supabase Storage; TWA/Capacitor wrapper around the PWA. |
