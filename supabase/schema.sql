-- Dipasaria platform schema for Supabase (PostgreSQL 15+).
-- Run this once in the SQL editor, then seed.sql. All business rules that money depends on
-- live in the SQL functions below; the Next.js server calls them with the service-role key.

set client_min_messages = warning;
create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function new_id(prefix text) returns text language sql volatile as $$
  select prefix || '_' || left(replace(gen_random_uuid()::text, '-', ''), 12);
$$;

create or replace function random_code(len int default 6) returns text language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
  -- gen_random_uuid() uses the cryptographically secure generator; 256 is a multiple of 32, so there is no bias
  b bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
begin
  if len > 32 then raise exception 'random_code: maximum length is 32'; end if;
  for i in 1..len loop
    out := out || substr(alphabet, 1 + (get_byte(b, i - 1) % 32), 1);
  end loop;
  return out;
end $$;

create or replace function normalize_phone(raw text) returns text language plpgsql immutable as $$
declare p text;
begin
  p := regexp_replace(coalesce(raw, ''), '[^0-9+]', '', 'g');
  if left(p, 1) = '+' then p := substr(p, 2); end if;
  if left(p, 3) = '620' then p := '62' || substr(p, 4); end if; -- "+62 0812…" is the same number as "0812…"
  if left(p, 1) = '0' then p := '62' || substr(p, 2); end if;
  if left(p, 1) = '8' then p := '62' || p; end if;
  return p;
end $$;

create or replace function jakarta_now() returns timestamp language sql stable as $$
  select (now() at time zone 'Asia/Jakarta');
$$;

-- ---------- tables ----------
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Dipasaria',
  tagline text not null default '',
  tagline_en text,
  whatsapp_number text not null default '',
  bank_name text not null default '',
  bank_account text not null default '',
  bank_holder text not null default '',
  qris_image_url text,
  cutoff_time text not null default '20:00',
  min_order_retail numeric not null default 150000,
  min_order_business numeric not null default 750000,
  free_delivery_retail numeric not null default 250000,
  free_delivery_business numeric not null default 750000,
  catch_weight_buffer_pct numeric not null default 5,
  max_days_ahead int not null default 6,
  instagram text not null default '',
  address_line text not null default '',
  announcement text,
  announcement_en text,
  hero_image_url text,
  about_image_url text,
  -- minutes a household transfer/QRIS order with a known total has to be paid before it is cancelled automatically (0 = never)
  payment_window_minutes int not null default 120 check (payment_window_minutes between 0 and 10080),
  -- which automatic WhatsApp messages are sent to customers
  wa_events text[] not null default array['received','invoice','paid','delivering','reminder','cancelled','standing','delivered','claim','restock'],
  -- days a restaurant's tempo invoice may be past due before new tempo orders are refused
  terms_grace_days int not null default 3 check (terms_grace_days between 0 and 60)
);

create table if not exists categories (
  id text primary key default new_id('c'),
  slug text unique not null,
  name text not null,
  name_en text,
  description text not null default '',
  description_en text,
  sort int not null default 0,
  icon text not null default 'fish',
  image_url text,
  is_seafood boolean not null default true
);

create table if not exists products (
  id text primary key default new_id('p'),
  slug text unique not null,
  category_id text not null references categories(id),
  name text not null,
  name_en text,
  scientific_name text,
  aliases text[] not null default '{}',
  description text not null default '',
  description_en text,
  origin text not null default '',
  origin_en text,
  storage_class text not null check (storage_class in ('chilled','frozen','ambient')),
  storage_note text not null default '',
  storage_note_en text,
  is_catch_weight boolean not null default false,
  available_today boolean not null default true,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  image_url text,
  icon text not null default 'fish',
  sort int not null default 0
);

create table if not exists variants (
  id text primary key default new_id('v'),
  product_id text not null references products(id) on delete cascade,
  label text not null,
  label_en text,
  unit text not null check (unit in ('kg','pack','tray','pcs','bottle','crate','box')),
  min_qty numeric not null default 1,
  step_qty numeric not null default 1 check (step_qty > 0),
  price_retail numeric not null default 0,
  price_business numeric not null default 0,
  cost numeric not null default 0,
  stock_qty numeric,
  business_only boolean not null default false,
  is_active boolean not null default true,
  sort int not null default 0
);
create index if not exists variants_product_idx on variants(product_id);

create table if not exists prep_options (
  id text primary key default new_id('pp'),
  product_id text not null references products(id) on delete cascade,
  label text not null,
  label_en text,
  surcharge numeric not null default 0,
  note text,
  note_en text,
  sort int not null default 0
);

create table if not exists delivery_areas (
  id text primary key default new_id('a'),
  name text not null,
  fee numeric not null default 0,
  is_active boolean not null default true,
  sort int not null default 0
);

create table if not exists delivery_slots (
  id text primary key default new_id('s'),
  label text not null,
  start_time text not null,
  end_time text not null,
  segment text not null default 'all' check (segment in ('all','retail','business')),
  capacity int not null default 10,
  is_active boolean not null default true,
  sort int not null default 0
);

create table if not exists promos (
  id text primary key default new_id('pr'),
  code text unique not null,
  type text not null check (type in ('percent','fixed','free_delivery')),
  value numeric not null default 0,
  min_spend numeric not null default 0,
  segment text not null default 'all' check (segment in ('all','retail','business')),
  quota int,
  used_count int not null default 0,
  first_order_only boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  description text not null default ''
);

create table if not exists business_accounts (
  id text primary key default new_id('ba'),
  business_name text not null,
  contact_name text not null,
  phone text unique not null,
  address text not null default '',
  area_id text references delivery_areas(id),
  business_type text not null default '',
  discount_pct numeric not null default 0,
  payment_terms text not null default 'prepaid' check (payment_terms in ('prepaid','days3','weekly')),
  allow_cod boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  access_code text,
  preferred_slot_id text references delivery_slots(id),
  notes text not null default '',
  applied_at timestamptz not null default now(),
  approved_at timestamptz,
  -- most a restaurant may owe on tempo (open invoices, including orders not yet delivered); null = no limit
  credit_limit numeric check (credit_limit is null or credit_limit >= 0)
);

create table if not exists business_sessions (
  token text primary key,
  account_id text not null references business_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists orders (
  id text primary key default new_id('o'),
  code text unique not null,
  segment text not null check (segment in ('retail','business')),
  account_id text references business_accounts(id),
  customer_name text not null,
  phone text not null,
  address text not null,
  area_id text references delivery_areas(id),
  area_name text not null default '',
  maps_url text,
  delivery_date date not null,
  slot_id text references delivery_slots(id),
  slot_label text not null default '',
  payment_method text not null check (payment_method in ('qris','transfer','cod','terms')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','awaiting_confirmation','paid','refund_due','void')),
  status text not null default 'new' check (status in ('new','confirmed','packing','delivering','completed','cancelled')),
  subtotal_est numeric not null default 0,
  discount numeric not null default 0,
  delivery_fee numeric not null default 0,
  total_est numeric not null default 0,
  subtotal_final numeric,
  total_final numeric,
  has_catch_weight boolean not null default false,
  weighed_at timestamptz,
  promo_code text,
  customer_note text not null default '',
  internal_note text not null default '',
  created_at timestamptz not null default now(),
  history jsonb not null default '[]'::jsonb,
  -- idempotency key from the checkout page: a retried or double-tapped submit returns the same order
  client_ref text unique,
  -- terms frozen at order time, so weighing re-prices with the promo and fee the customer agreed to
  promo_type text,
  promo_value numeric,
  -- unpaid by this time → cancelled automatically by expire_unpaid_orders(); null = never (weighed orders, accounts, COD, terms)
  pay_by timestamptz,
  -- the customer agreed at checkout to receive order updates on WhatsApp
  wa_opt_in boolean not null default true,
  -- if an item is short at the dawn auction: replace with similar / contact me first / just leave it out
  substitution text not null default 'contact' check (substitution in ('similar','contact','remove')),
  -- proof of delivery (delivery mode)
  delivered_at timestamptz,
  delivery_note text,
  cod_collected numeric check (cod_collected is null or cod_collected >= 0),
  -- tempo invoices: delivery date + the account's terms (3 or 7 days), fixed when the order is placed
  due_date date
);
create index if not exists orders_pay_by_idx on orders(pay_by) where payment_status = 'unpaid';

-- QRIS payments through a payment gateway (Midtrans). One row per QR code issued; the id is the gateway's order_id.
-- Only record_gateway_payment() marks an order paid from here, after the server has verified the result with the gateway.
create table if not exists payments (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  provider text not null check (provider in ('midtrans', 'mock')),
  method text not null default 'qris',
  amount numeric not null check (amount > 0),
  amount_paid numeric,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'failed', 'cancelled')),
  qr_string text,
  qr_url text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  raw jsonb
);
create index if not exists payments_order_idx on payments(order_id, created_at desc);

-- Outbox of automatic WhatsApp messages to customers. One row per (order, kind, dedupe), so a message is never sent
-- twice; `body` is the text as the customer reads it (also used for sending by hand when the API is not set up).
create table if not exists wa_messages (
  id text primary key,
  order_id text references orders(id) on delete cascade, -- null for messages not tied to an order (back-in-stock alerts)
  kind text not null check (kind in ('received','invoice','paid','delivering','reminder','cancelled','standing','delivered','claim','restock','statement')),
  dedupe text not null default '',
  phone text not null,
  template text not null,
  params jsonb not null default '[]'::jsonb,
  body text not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','manual','skipped')),
  provider_id text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (order_id, kind, dedupe)
);
create index if not exists wa_messages_pending_idx on wa_messages(status, created_at) where status in ('queued','sending','failed');
-- The unique key above treats NULL order ids as all different, so messages without an order (back-in-stock alerts,
-- statements) need their own key or they could be queued twice.
create unique index if not exists wa_messages_no_order_key on wa_messages(kind, dedupe) where order_id is null;

create index if not exists orders_delivery_idx on orders(delivery_date, slot_id);
create index if not exists orders_phone_idx on orders(phone);
create index if not exists orders_account_idx on orders(account_id);

create table if not exists order_items (
  id text primary key default new_id('oi'),
  order_id text not null references orders(id) on delete cascade,
  product_id text not null,
  variant_id text not null,
  category_id text not null,
  product_name text not null,
  variant_label text not null,
  unit text not null,
  storage_class text not null,
  is_catch_weight boolean not null default false,
  qty_ordered numeric not null,
  qty_final numeric,
  unit_price numeric not null,
  prep_option_id text,
  prep_label text,
  prep_surcharge numeric not null default 0,
  unit_cost numeric not null default 0,
  line_total_est numeric not null,
  line_total_final numeric,
  -- stock was deducted for this line at order time (only these lines give stock back on cancel)
  stock_reserved boolean not null default false
);
create index if not exists order_items_order_idx on order_items(order_id);

-- Standing orders: a business account's recurring order (items, weekdays, slot, payment).
-- A scheduled job (src/app/api/cron/standing-orders) turns the next day's due standing orders into real
-- orders through place_order; standing_order_runs records each attempt and its unique key makes the run idempotent.
create table if not exists standing_orders (
  id text primary key,
  -- the restaurant that owns it; null for a household's weekly box (customer_id is set instead, see below)
  account_id text references business_accounts(id) on delete cascade,
  name text not null default 'Pesanan rutin',
  weekdays int[] not null check (array_length(weekdays, 1) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7]),
  slot_id text not null references delivery_slots(id),
  payment_method text not null check (payment_method in ('qris','transfer','cod','terms')),
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) > 0),
  status text not null default 'active' check (status in ('active','paused')),
  skip_dates date[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists standing_orders_account_idx on standing_orders(account_id);

create table if not exists standing_order_runs (
  id text primary key,
  standing_order_id text not null references standing_orders(id) on delete cascade,
  delivery_date date not null,
  order_id text references orders(id) on delete set null,
  order_code text,
  error text,
  -- items left out because they were unavailable that night (the rest of the order still goes out)
  note text,
  created_at timestamptz not null default now(),
  unique (standing_order_id, delivery_date)
);

-- Failed business logins, for the lockout in business_login (5 failures per phone per 15 minutes).
create table if not exists login_attempts (
  phone text not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_phone_idx on login_attempts(phone, at);

-- Request counters for rate limits on public endpoints (checkout, login, account applications).
create table if not exists rate_hits (
  key text not null,
  at timestamptz not null default now()
);
create index if not exists rate_hits_key_idx on rate_hits(key, at);

-- Application errors (server and browser), grouped by fingerprint so a repeating error is one row with a count.
create table if not exists error_events (
  fingerprint text primary key,
  source text not null,
  message text not null,
  path text not null default '',
  digest text,
  detail text,
  count int not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  resolved boolean not null default false
);
create index if not exists error_events_last_idx on error_events(resolved, last_at desc);

-- Last run of each scheduled job, for the system page.
create table if not exists job_runs (
  job text primary key,
  last_at timestamptz not null default now(),
  result text not null default ''
);


-- Household customer accounts: a phone number verified with a one-time WhatsApp code. Orders stay linked by phone,
-- so a customer sees every order placed with their number, including guest orders from before they signed in.
create table if not exists customers (
  id text primary key default new_id('cu'),
  phone text unique not null,
  name text not null default '',
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create table if not exists customer_addresses (
  id text primary key default new_id('ca'),
  customer_id text not null references customers(id) on delete cascade,
  label text not null default 'Rumah',
  recipient text not null default '',
  address text not null,
  area_id text references delivery_areas(id) on delete set null,
  maps_url text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists customer_addresses_idx on customer_addresses(customer_id);
-- Only a hash of the session token and of the login code is stored.
create table if not exists customer_sessions (
  token_hash text primary key,
  customer_id text not null references customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists login_codes (
  phone text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

-- Freshness-guarantee claims: reported by the customer from the order page within the window after delivery,
-- decided by the owner. Photos are small JPEGs (compressed in the browser) stored as data URLs.
-- Household weekly boxes: a standing order owned by a household customer instead of a restaurant. Added here (after
-- the customer tables exist) and idempotently, so re-running this file upgrades an existing project.
alter table standing_orders alter column account_id drop not null;
alter table standing_orders add column if not exists customer_id text references customers(id) on delete cascade;
alter table standing_orders add column if not exists address_id text references customer_addresses(id) on delete set null;
alter table standing_orders add column if not exists every_weeks int not null default 1;
alter table standing_orders add column if not exists anchor_date date;
alter table standing_orders add column if not exists paused_reason text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'standing_orders_owner_check') then
    alter table standing_orders add constraint standing_orders_owner_check check ((account_id is null) <> (customer_id is null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'standing_orders_every_weeks_check') then
    alter table standing_orders add constraint standing_orders_every_weeks_check check (every_weeks in (1, 2));
  end if;
end $$;
create index if not exists standing_orders_customer_idx on standing_orders(customer_id);

create table if not exists claims (
  id text primary key default new_id('cl'),
  order_id text not null references orders(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  reason text not null check (reason in ('not_fresh','wrong_item','short_weight','damaged','missing','other')),
  note text not null default '',
  photos jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','replace','refund','declined')),
  resolution_note text not null default '',
  refund_amount numeric check (refund_amount is null or refund_amount >= 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists claims_order_idx on claims(order_id);
create index if not exists claims_status_idx on claims(status, created_at desc);

-- "Kabari saya": customers waiting for a sold-out product; notified once when it is available again.
create table if not exists stock_alerts (
  id text primary key default new_id('sa'),
  product_id text not null references products(id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (product_id, phone)
);

-- Dawn buying log: what was actually bought (and at what price), and what was left over or thrown away.
create table if not exists purchases (
  id text primary key default new_id('pu'),
  delivery_date date not null,
  product_id text not null references products(id),
  kind text not null default 'purchase' check (kind in ('purchase','leftover','waste')),
  qty numeric not null check (qty > 0),
  unit text not null,
  total_cost numeric not null default 0 check (total_cost >= 0),
  supplier text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists purchases_date_idx on purchases(delivery_date);

-- ---------- restaurant receivables ----------
-- Money received from a restaurant against its tempo invoices (one transfer can settle several orders).
create table if not exists account_payments (
  id text primary key default new_id('ap'),
  account_id text not null references business_accounts(id) on delete cascade,
  amount numeric not null check (amount > 0 and amount <= 1000000000),
  paid_on date not null,
  method text not null default 'transfer' check (method in ('transfer','cash','qris','giro','other')),
  reference text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists account_payments_account_idx on account_payments(account_id, paid_on);

-- Which payment settled which invoice, oldest invoice first (written only by allocate_account_credit()).
create table if not exists payment_allocations (
  id text primary key default new_id('pa'),
  payment_id text not null references account_payments(id) on delete cascade,
  order_id text not null references orders(id) on delete cascade,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists payment_allocations_order_idx on payment_allocations(order_id);
create index if not exists payment_allocations_payment_idx on payment_allocations(payment_id);

-- Agreed price per restaurant and product size, for a period; replaces the wholesale price and account discount.
create table if not exists contract_prices (
  id text primary key default new_id('cp'),
  account_id text not null references business_accounts(id) on delete cascade,
  variant_id text not null references variants(id) on delete cascade,
  price numeric not null check (price > 0),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (account_id, variant_id, starts_on)
);
create index if not exists contract_prices_account_idx on contract_prices(account_id);

-- Supabase Auth users allowed into the back-office.
create table if not exists admins (
  user_id uuid primary key,
  label text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------
-- Everything is denied to anon. Authenticated users listed in admins may read and write
-- through the Supabase client; the Next.js server uses the service role (bypasses RLS)
-- and is the only path customers' requests take.
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Data-integrity rules, added idempotently so upgraded projects get them too. NOT VALID: enforced for every new
-- write without failing on old rows.
do $$
declare c record;
begin
  for c in select * from (values
    ('variants', 'variants_prices_nonneg', 'check (price_retail >= 0 and price_business >= 0 and cost >= 0)'),
    ('variants', 'variants_min_qty_pos', 'check (min_qty > 0)'),
    ('variants', 'variants_stock_nonneg', 'check (stock_qty is null or stock_qty >= 0)'),
    ('prep_options', 'prep_surcharge_nonneg', 'check (surcharge >= 0)'),
    ('delivery_areas', 'areas_fee_nonneg', 'check (fee >= 0)'),
    ('delivery_slots', 'slots_capacity_nonneg', 'check (capacity >= 0)'),
    ('promos', 'promos_value_valid', 'check (value >= 0 and (type <> ''percent'' or value <= 100))'),
    ('business_accounts', 'accounts_discount_range', 'check (discount_pct between 0 and 100)'),
    ('settings', 'settings_cutoff_format', 'check (cutoff_time ~ ''^([01][0-9]|2[0-3]):[0-5][0-9]$'')'),
    ('settings', 'settings_payment_window_range', 'check (payment_window_minutes between 0 and 10080)')
  ) as t(tbl, name, def) loop
    if not exists (select 1 from pg_constraint where conname = c.name) then
      execute format('alter table %I add constraint %I %s not valid', c.tbl, c.name, c.def);
    end if;
  end loop;
end $$;

-- One promo per code regardless of letter case (checkout matches codes case-insensitively).
do $$ begin
  create unique index if not exists promos_code_upper_key on promos (upper(code));
exception when unique_violation then
  raise notice 'promos: two codes differ only in letter case; rename one, then re-run this file';
end $$;

-- Cleanup deletes and lookups on these columns run on every login.
create index if not exists login_attempts_at_idx on login_attempts(at);
create index if not exists rate_hits_at_idx on rate_hits(at);
create index if not exists business_sessions_expires_idx on business_sessions(expires_at);
create index if not exists customer_sessions_expires_idx on customer_sessions(expires_at);

do $$
declare t text;
begin
  for t in select unnest(array['settings','categories','products','variants','prep_options','delivery_areas','delivery_slots','promos','business_accounts','business_sessions','orders','order_items','admins','standing_orders','standing_order_runs','login_attempts','rate_hits','error_events','job_runs','payments','wa_messages','customers','customer_addresses','customer_sessions','login_codes','claims','stock_alerts','purchases','account_payments','payment_allocations','contract_prices']) loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists admin_all on %I', t);
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- ---------- order placement ----------
-- Indonesian unit labels for customer-facing error messages ("tray" -> "rak").
create or replace function unit_label(u text) returns text language sql immutable as $$
  select case u when 'pack' then 'kemasan' when 'tray' then 'rak' when 'pcs' then 'buah' when 'bottle' then 'botol'
                when 'crate' then 'peti' when 'box' then 'kotak' else u end;
$$;

create or replace function place_order(p jsonb, p_account_id text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  s settings%rowtype;
  acc business_accounts%rowtype;
  seg text;
  jnow timestamp := jakarta_now();
  first_date date;
  d date;
  area delivery_areas%rowtype;
  slot delivery_slots%rowtype;
  used int;
  line jsonb;
  prod products%rowtype;
  var variants%rowtype;
  prep prep_options%rowtype;
  has_prep boolean;
  q numeric;
  price numeric;
  v_subtotal numeric := 0;
  has_catch boolean := false;
  promo promos%rowtype;
  has_promo boolean := false;
  v_discount numeric := 0;
  v_fee numeric;
  v_total numeric;
  min_order numeric;
  oid text := new_id('o');
  v_code text;
  v_phone text;
  pm text;
  threshold numeric;
  items_count int := 0;
  existing text;
  rawq numeric;
  v_ref text := nullif(trim(coalesce(p->>'client_ref', '')), '');
  v_maps text := nullif(trim(coalesce(p->>'maps_url', '')), '');
  cprice numeric;
  ex record;
begin
  -- Idempotency: the same checkout submission never creates a second order.
  if v_ref is not null then
    if length(v_ref) > 64 then raise exception 'Permintaan tidak valid.'; end if;
    perform pg_advisory_xact_lock(hashtext('ref:' || v_ref));
    select id into existing from orders where client_ref = v_ref;
    if existing is not null then return existing; end if;
  end if;
  select * into s from settings where id = 1;
  if p_account_id is not null then
    select * into acc from business_accounts where id = p_account_id and status = 'approved';
    if not found then raise exception 'Akun bisnis tidak valid.'; end if;
    seg := 'business';
  else
    seg := 'retail';
  end if;

  if coalesce(trim(p->>'customer_name'), '') = '' then raise exception 'Nama penerima wajib diisi.'; end if;
  v_phone := normalize_phone(p->>'phone');
  if v_phone !~ '^62[0-9]{8,13}$' then raise exception 'Nomor WhatsApp tidak valid.'; end if;
  if coalesce(trim(p->>'address'), '') = '' then raise exception 'Alamat pengiriman wajib diisi.'; end if;
  if length(p->>'customer_name') > 80 or length(p->>'address') > 400 or length(coalesce(p->>'customer_note', '')) > 400 then
    raise exception 'Teks terlalu panjang. Nama maksimal 80, alamat dan catatan maksimal 400 karakter.';
  end if;
  -- Only Google Maps links are kept (they are shown to the courier as a clickable link).
  if v_maps is not null and (length(v_maps) > 300 or v_maps !~* '^https://(maps\.app\.goo\.gl|goo\.gl/maps|(www\.)?google\.[a-z.]+/maps|maps\.google\.[a-z.]+)/') then
    v_maps := null;
  end if;
  if jsonb_array_length(coalesce(p->'lines', '[]'::jsonb)) = 0 then raise exception 'Keranjang Anda masih kosong.'; end if;

  -- delivery date vs cut-off
  d := (p->>'delivery_date')::date;
  first_date := jnow::date + case when jnow::time < s.cutoff_time::time then 1 else 2 end;
  if d < first_date or d > jnow::date + s.max_days_ahead then
    raise exception 'Tanggal pengiriman tidak tersedia. Batas pemesanan untuk pengiriman besok pukul % WIB.', replace(s.cutoff_time, ':', '.');
  end if;

  select * into area from delivery_areas where id = p->>'area_id' and is_active;
  if not found then raise exception 'Wilayah pengiriman tidak valid.'; end if;

  select * into slot from delivery_slots where id = p->>'slot_id' and is_active and (segment = 'all' or segment = seg);
  if not found then raise exception 'Jam pengiriman ini tidak tersedia untuk pesanan Anda.'; end if;
  perform pg_advisory_xact_lock(hashtext(d::text || slot.id));
  select count(*) into used from orders where delivery_date = d and slot_id = slot.id and status <> 'cancelled';
  if used >= slot.capacity then raise exception 'Kuota jam pengiriman ini sudah penuh. Silakan pilih jam lain.'; end if;

  pm := p->>'payment_method';
  if pm not in ('qris','transfer','cod','terms') then raise exception 'Metode pembayaran tidak valid.'; end if;
  if pm = 'cod' and not (seg = 'business' and acc.allow_cod) then raise exception 'Bayar di tempat (COD) hanya tersedia untuk akun bisnis yang telah disetujui.'; end if;
  if pm = 'terms' and not (seg = 'business' and acc.payment_terms <> 'prepaid') then raise exception 'Pembayaran tempo hanya tersedia untuk akun bisnis dengan fasilitas tempo.'; end if;

  -- unique order code, then the header row (totals are filled in after the lines)
  loop
    v_code := 'DP-' || to_char(d, 'YYMMDD') || '-' || random_code(4);
    exit when not exists (select 1 from orders where orders.code = v_code);
  end loop;
  insert into orders (id, code, segment, account_id, customer_name, phone, address, area_id, area_name, maps_url, delivery_date,
    slot_id, slot_label, payment_method, payment_status, status, customer_note, history, client_ref, wa_opt_in, substitution)
  values (oid, v_code, seg, acc.id, trim(p->>'customer_name'), v_phone, trim(p->>'address'), area.id, area.name, v_maps, d,
    slot.id, slot.label || ' ' || replace(slot.start_time, ':', '.') || '–' || replace(slot.end_time, ':', '.'), pm, 'unpaid', 'new', coalesce(trim(p->>'customer_note'), ''),
    jsonb_build_array(jsonb_build_object('status', 'new', 'at', now())), v_ref, coalesce(p->>'wa_opt_in', 'true') <> 'false',
    case when p->>'substitution' in ('similar','contact','remove') then p->>'substitution' else 'contact' end);

  -- lines
  for line in select value from jsonb_array_elements(p->'lines') order by value->>'variant_id', value->>'prep_option_id' loop
    select * into var from variants where id = line->>'variant_id' and is_active for update;
    if not found then raise exception 'Salah satu produk sudah tidak tersedia.'; end if;
    select * into prod from products where id = var.product_id and is_active;
    if not found then raise exception 'Salah satu produk sudah tidak tersedia.'; end if;
    if not prod.available_today then raise exception '% habis hari ini.', prod.name; end if;
    if var.business_only and seg <> 'business' then raise exception '% (%) khusus untuk akun bisnis.', prod.name, var.label; end if;

    -- Quantity must be a real, positive number within the per-line ceiling (NaN and Infinity are rejected).
    begin rawq := (line->>'qty')::numeric; exception when others then rawq := null; end;
    if rawq is null or rawq = 'NaN'::numeric or rawq <= 0 then raise exception '%: jumlah tidak valid.', prod.name; end if;
    if rawq > 500 then raise exception '%: maksimal 500 % per pesanan. Untuk jumlah lebih besar, hubungi kami melalui WhatsApp.', prod.name, unit_label(var.unit); end if;
    q := var.min_qty + greatest(0, round((rawq - var.min_qty) / var.step_qty)) * var.step_qty;
    if q < var.min_qty then raise exception '%: pembelian minimal % %.', prod.name, replace(trim_scale(var.min_qty)::text, '.', ','), unit_label(var.unit); end if;
    if var.stock_qty is not null and q > var.stock_qty then
      raise exception '% (%): stok tersisa % %.', prod.name, var.label, replace(trim_scale(var.stock_qty)::text, '.', ','), unit_label(var.unit);
    end if;

    has_prep := false;
    if coalesce(line->>'prep_option_id', '') <> '' then
      select * into prep from prep_options where id = line->>'prep_option_id' and product_id = prod.id;
      if not found then raise exception '%: cara penyiapan tidak tersedia.', prod.name; end if;
      has_prep := true;
    end if;

    -- A contract price valid on the delivery date replaces the wholesale price and the account discount.
    cprice := null;
    if seg = 'business' then
      select c.price into cprice from contract_prices c
       where c.account_id = acc.id and c.variant_id = var.id and c.starts_on <= d and (c.ends_on is null or c.ends_on >= d)
       order by c.starts_on desc limit 1;
    end if;
    price := case when seg = 'business'
                  then coalesce(cprice, round(var.price_business * (1 - coalesce(acc.discount_pct, 0) / 100)))
                  else var.price_retail end
             + case when has_prep then prep.surcharge else 0 end;

    if var.stock_qty is not null then
      update variants set stock_qty = stock_qty - q where id = var.id;
    end if;

    insert into order_items (order_id, product_id, variant_id, category_id, product_name, variant_label, unit, storage_class,
      is_catch_weight, qty_ordered, unit_price, prep_option_id, prep_label, prep_surcharge, unit_cost, line_total_est, stock_reserved)
    values (oid, prod.id, var.id, prod.category_id, prod.name, var.label, var.unit, prod.storage_class,
      prod.is_catch_weight, q, price,
      case when has_prep then prep.id end, case when has_prep then prep.label end, case when has_prep then prep.surcharge else 0 end,
      var.cost, round(price * q), var.stock_qty is not null);

    v_subtotal := v_subtotal + round(price * q);
    has_catch := has_catch or prod.is_catch_weight;
    items_count := items_count + 1;
  end loop;

  min_order := case when seg = 'business' then s.min_order_business else s.min_order_retail end;
  if v_subtotal < min_order then raise exception 'Pesanan belum mencapai minimal pesanan Rp%.', replace(to_char(min_order, 'FM999,999,999'), ',', '.'); end if;

  threshold := case when seg = 'business' then s.free_delivery_business else s.free_delivery_retail end;
  v_fee := case when v_subtotal >= threshold then 0 else area.fee end;

  -- promo
  if coalesce(trim(p->>'promo_code'), '') <> '' then
    select * into promo from promos where upper(code) = upper(trim(p->>'promo_code')) for update;
    if not found then raise exception 'Kode promo tidak ditemukan.'; end if;
    if not promo.is_active then raise exception 'Kode promo sudah tidak berlaku.'; end if;
    if promo.segment <> 'all' and promo.segment <> seg then raise exception 'Kode promo tidak berlaku untuk akun ini.'; end if;
    if promo.starts_at is not null and now() < promo.starts_at then raise exception 'Promo ini belum dimulai.'; end if;
    if promo.ends_at is not null and now() > promo.ends_at then raise exception 'Promo ini sudah berakhir.'; end if;
    if promo.quota is not null and promo.used_count >= promo.quota then raise exception 'Kuota promo sudah habis.'; end if;
    if v_subtotal < promo.min_spend then raise exception 'Promo ini berlaku untuk belanja minimal Rp%.', replace(to_char(promo.min_spend, 'FM999,999,999'), ',', '.'); end if;
    if promo.first_order_only and exists (select 1 from orders o2 where o2.phone = v_phone and o2.status <> 'cancelled' and o2.id <> oid) then
      raise exception 'Promo ini khusus untuk pesanan pertama.';
    end if;
    if promo.type = 'percent' then v_discount := round(v_subtotal * promo.value / 100);
    elsif promo.type = 'fixed' then v_discount := least(promo.value, v_subtotal);
    else v_fee := 0; end if;
    update promos set used_count = used_count + 1 where id = promo.id;
    has_promo := true;
  end if;

  v_total := greatest(0, v_subtotal - v_discount + v_fee);

  -- Tempo: refused while an invoice is past due beyond the grace days, or when this order would pass the credit limit.
  -- The account row is locked so two orders placed at once cannot both slip under the limit.
  if pm = 'terms' then
    perform 1 from business_accounts where id = acc.id for update;
    select * into ex from account_exposure(acc.id, oid);
    if ex.oldest_due is not null and ex.oldest_due < jnow::date - coalesce(s.terms_grace_days, 3) then
      raise exception 'Pembayaran tempo belum dapat dipakai: tagihan % jatuh tempo % belum lunas. Silakan lunasi tagihan tersebut atau pilih metode pembayaran lain.',
        ex.oldest_code, to_char(ex.oldest_due, 'DD/MM/YYYY');
    end if;
    if acc.credit_limit is not null and ex.outstanding - ex.credit + v_total > acc.credit_limit then
      raise exception 'Pesanan ini melebihi batas kredit tempo akun Anda (sisa Rp%). Pilih metode pembayaran lain atau hubungi kami.',
        replace(to_char(greatest(0, acc.credit_limit - (ex.outstanding - ex.credit)), 'FM999,999,999,990'), ',', '.');
    end if;
  end if;

  update orders
     set subtotal_est = v_subtotal, discount = v_discount, delivery_fee = v_fee, total_est = v_total,
         subtotal_final = case when has_catch then null else v_subtotal end,
         total_final = case when has_catch then null else v_total end,
         has_catch_weight = has_catch,
         promo_code = case when has_promo then promo.code end,
         promo_type = case when has_promo then promo.type end,
         promo_value = case when has_promo then promo.value end,
         -- households paying by transfer/QRIS a total known now: pay within the window, and before the delivery day starts
         pay_by = case when seg = 'retail' and pm in ('transfer', 'qris') and not has_catch and coalesce(s.payment_window_minutes, 0) > 0
                       then least(now() + make_interval(mins => s.payment_window_minutes), (d::timestamp) at time zone 'Asia/Jakarta') end,
         due_date = case when pm = 'terms' then d + case acc.payment_terms when 'days3' then 3 else 7 end end
   where id = oid;
  -- credit the restaurant already has (an overpayment) settles a tempo order whose total is known
  if pm = 'terms' and not has_catch then perform allocate_account_credit(acc.id); end if;

  return oid;
end $$;

-- ---------- weighing and re-pricing ----------
create or replace function weigh_order(p_order_id text, p_items jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  it jsonb;
  w numeric;
  v_subtotal numeric;
  v_fee numeric;
  disc numeric;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  if o.status in ('cancelled', 'completed') then raise exception 'Pesanan yang sudah selesai atau dibatalkan tidak dapat ditimbang ulang.'; end if;
  if o.payment_status = 'paid' then raise exception 'Pesanan sudah lunas. Batalkan status lunas terlebih dahulu bila perlu menimbang ulang.'; end if;
  if o.payment_status = 'awaiting_confirmation' then raise exception 'Pelanggan sudah melaporkan pembayaran untuk tagihan ini. Periksa dananya dulu: tandai lunas, atau ubah ke belum dibayar sebelum menimbang ulang.'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    begin w := (it->>'qty_final')::numeric; exception when others then w := null; end;
    if w is null or w = 'NaN'::numeric or w < 0 or w > 500 then raise exception 'Berat tidak valid. Isi berat dalam kg, misalnya 1,25.'; end if;
    update order_items
       set qty_final = w, line_total_final = round(unit_price * w)
     where id = it->>'item_id' and order_id = p_order_id and is_catch_weight;
    if not found then raise exception 'Baris pesanan tidak ditemukan.'; end if;
  end loop;

  -- every weighed line must have a weight before the order counts as weighed
  if exists (select 1 from order_items where order_id = p_order_id and is_catch_weight and qty_final is null) then
    raise exception 'Isi berat semua produk yang ditimbang.';
  end if;
  -- non-weighed lines are final as ordered
  update order_items set qty_final = qty_ordered, line_total_final = line_total_est
   where order_id = p_order_id and not is_catch_weight;

  select coalesce(sum(line_total_final), 0) into v_subtotal from order_items where order_id = p_order_id;
  -- Re-price with the terms agreed at order time: the delivery fee can only go down (a waived fee is never added
  -- because the fish weighed lighter), and the promo uses the type and value saved on the order.
  v_fee := o.delivery_fee;
  disc := 0;
  if o.promo_type = 'percent' then disc := round(v_subtotal * o.promo_value / 100);
  elsif o.promo_type = 'fixed' then disc := least(o.promo_value, v_subtotal);
  elsif o.promo_type = 'free_delivery' then v_fee := 0;
  elsif o.promo_code is not null then disc := least(o.discount, v_subtotal); -- orders placed before promo terms were saved
  end if;

  update orders
     set subtotal_final = v_subtotal,
         discount = disc,
         delivery_fee = v_fee,
         total_final = greatest(0, v_subtotal - disc + v_fee),
         weighed_at = now(),
         history = history || jsonb_build_object('status', 'weighed', 'at', now())
   where id = p_order_id;
  -- a QR code issued for the previous amount must not be paid any more
  update payments set status = 'cancelled' where order_id = p_order_id and status = 'pending';
  -- a tempo invoice now has its final amount: apply any credit, or release what a lighter weight no longer needs
  if o.payment_method = 'terms' and o.account_id is not null then perform allocate_account_credit(o.account_id); end if;
end $$;

-- ---------- status changes ----------
-- Orders move forward only: new → confirmed → packing → delivering → completed (steps may be skipped).
-- Cancelling is allowed until dispatch; it returns stock and promo usage, and money already received becomes refund_due.
create or replace function set_order_status(p_order_id text, p_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype; it order_items%rowtype; v_alloc numeric;
  flow text[] := array['new','confirmed','packing','delivering','completed'];
begin
  if p_status not in ('new','confirmed','packing','delivering','completed','cancelled') then raise exception 'Status tidak valid.'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  if o.status = 'cancelled' then raise exception 'Pesanan ini sudah dibatalkan.'; end if;
  if p_status = o.status then return; end if;
  if p_status = 'cancelled' then
    if o.status in ('delivering', 'completed') then raise exception 'Pesanan yang sudah dikirim tidak dapat dibatalkan. Catat retur atau pengembalian dana di catatan internal.'; end if;
    for it in select * from order_items where order_id = p_order_id loop
      if it.stock_reserved then
        update variants set stock_qty = stock_qty + it.qty_ordered where id = it.variant_id and stock_qty is not null;
      end if;
    end loop;
    if o.promo_code is not null then update promos set used_count = greatest(0, used_count - 1) where code = o.promo_code; end if;
    update orders set payment_status = case when o.payment_status in ('paid', 'awaiting_confirmation') then 'refund_due' else 'void' end where id = p_order_id;
    update payments set status = 'cancelled' where order_id = p_order_id and status = 'pending';
    -- a tempo invoice settled from the restaurant's payments: the money goes back to its credit, nothing to refund
    if o.payment_method = 'terms' then
      select coalesce(sum(amount), 0) into v_alloc from payment_allocations where order_id = p_order_id;
      if v_alloc > 0 then
        delete from payment_allocations where order_id = p_order_id;
        if v_alloc >= coalesce(o.total_final, o.total_est) or o.payment_status not in ('paid', 'awaiting_confirmation') then
          update orders set payment_status = 'void' where id = p_order_id;
        end if;
      end if;
    end if;
  elsif array_position(flow, p_status) < array_position(flow, o.status) then
    raise exception 'Status pesanan tidak dapat dimundurkan.';
  elsif p_status in ('delivering', 'completed') and o.has_catch_weight and o.total_final is null then
    raise exception 'Timbang pesanan ini terlebih dahulu.';
  end if;
  update orders
     set status = p_status,
         history = history || jsonb_strip_nulls(jsonb_build_object('status', p_status, 'at', now(), 'note', p_note))
   where id = p_order_id;
  if p_status = 'cancelled' and o.payment_method = 'terms' and o.account_id is not null then perform allocate_account_credit(o.account_id); end if;
end $$;

create or replace function set_payment_status(p_order_id text, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  if p_status not in ('unpaid','awaiting_confirmation','paid','refund_due','void') then raise exception 'Status pembayaran tidak valid.'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  if o.status = 'cancelled' and not (o.payment_status = 'refund_due' and p_status = 'void') then
    raise exception 'Pesanan dibatalkan: status pembayaran hanya dapat diubah dari "perlu pengembalian dana" menjadi "dibatalkan" setelah dana dikembalikan.';
  end if;
  if p_status = 'paid' and o.has_catch_weight and o.total_final is null then
    raise exception 'Timbang pesanan terlebih dahulu sebelum menandai lunas, agar jumlah yang dibayar sesuai tagihan akhir.';
  end if;
  -- a tempo invoice marked unpaid again gives its share of the restaurant's payments back to the account's credit
  if o.payment_method = 'terms' and o.payment_status = 'paid' and p_status in ('unpaid', 'awaiting_confirmation') then
    delete from payment_allocations where order_id = p_order_id;
  end if;
  update orders
     set payment_status = p_status,
         -- once a payment is recorded the order is never cancelled automatically, even if the status is later corrected
         pay_by = case when p_status in ('paid', 'awaiting_confirmation') then null else pay_by end,
         history = case when p_status = 'paid' then history || jsonb_build_object('status', 'paid', 'at', now()) else history end
   where id = p_order_id;
end $$;

-- Customer: "I have paid" (only moves unpaid → awaiting confirmation; the owner confirms against the bank app).
create or replace function customer_confirm_payment(p_code text, p_phone text)
returns text
language plpgsql security definer set search_path = public as $$
declare oid text;
begin
  select id into oid from orders where upper(code) = upper(trim(p_code)) and phone = normalize_phone(p_phone);
  if oid is null then raise exception 'Pesanan tidak ditemukan.'; end if;
  -- only once the final amount is known (weighed orders are paid on the final invoice)
  update orders set payment_status = 'awaiting_confirmation', pay_by = null where id = oid and payment_status = 'unpaid' and total_final is not null and status <> 'cancelled';
  return oid;
end $$;

-- Cancel household orders that were not paid by their pay_by time: stock, slot and promo use are released.
-- Safe to call often (checkout, back-office, cron, pg_cron); returns the number of orders cancelled.
create or replace function expire_unpaid_orders()
returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from orders
            where pay_by < now() and payment_status = 'unpaid' and status in ('new', 'confirmed')
              and not exists (select 1 from payments p where p.order_id = orders.id and p.status = 'pending' and p.expires_at > now())
            order by pay_by
            for update skip locked loop
    perform set_order_status(r.id, 'cancelled', 'Dibatalkan otomatis: pembayaran belum diterima sampai batas waktu.');
    n := n + 1;
  end loop;
  insert into job_runs (job, last_at, result) values ('expire_unpaid', now(), n || ' dibatalkan')
    on conflict (job) do update set last_at = excluded.last_at, result = excluded.result;
  return n;
end $$;

-- Record a gateway result the server has already verified with the gateway (signature + status API).
-- Returns: 'paid' (order marked paid), 'mismatch' (amount differs: left for the owner to check), 'late' (order was
-- cancelled: refund due), 'duplicate' (order was already paid: refund the extra payment), 'updated' or 'noop'.
create or replace function record_gateway_payment(p_payment_id text, p_status text, p_amount numeric, p_raw jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare pay payments%rowtype; o orders%rowtype; fmt text; oid text;
begin
  if p_status is null or p_status not in ('pending', 'paid', 'expired', 'failed', 'cancelled') then raise exception 'Status pembayaran gateway tidak valid.'; end if;
  -- lock order before payment, the same order as cancel and weighing use, so they cannot deadlock
  select order_id into oid from payments where id = p_payment_id;
  if oid is null then raise exception 'Pembayaran tidak ditemukan.'; end if;
  select * into o from orders where id = oid for update;
  select * into pay from payments where id = p_payment_id for update;
  if pay.status = 'paid' or p_status = 'pending' then return 'noop'; end if;
  if p_status <> 'paid' then
    update payments set status = p_status, raw = p_raw where id = p_payment_id and status = 'pending';
    return 'updated';
  end if;

  update payments set status = 'paid', paid_at = now(), amount_paid = p_amount, raw = p_raw where id = p_payment_id;
  fmt := coalesce('Rp' || replace(to_char(p_amount, 'FM999,999,999'), ',', '.'), 'nominal tidak diketahui');
  if o.status = 'cancelled' then
    update orders set payment_status = 'refund_due',
           internal_note = trim(both E'\n' from internal_note || E'\n' || '[QRIS] ' || fmt || ' diterima (' || p_payment_id || ') setelah pesanan dibatalkan. Kembalikan dana ke pelanggan.')
     where id = o.id;
    return 'late';
  elsif o.payment_status = 'paid' then
    update orders set internal_note = trim(both E'\n' from internal_note || E'\n' || '[QRIS] Pembayaran ganda ' || fmt || ' (' || p_payment_id || '). Kembalikan kelebihan dana.') where id = o.id;
    return 'duplicate';
  elsif o.total_final is null or p_amount is null or p_amount <> o.total_final then
    update orders set payment_status = 'awaiting_confirmation', pay_by = null,
           internal_note = trim(both E'\n' from internal_note || E'\n' || '[QRIS] Diterima ' || fmt || ', tagihan ' || coalesce('Rp' || replace(to_char(o.total_final, 'FM999,999,999'), ',', '.'), 'belum final') || '. Periksa selisih sebelum menandai lunas.')
     where id = o.id;
    return 'mismatch';
  end if;
  update orders set payment_status = 'paid', pay_by = null,
         history = history || jsonb_build_object('status', 'paid', 'at', now(), 'note', 'QRIS otomatis')
   where id = o.id;
  return 'paid';
end $$;

-- ---------- delivery mode ----------
-- Proof of delivery: completes the order, records time, who received it and any cash collected on delivery.
-- Cash covering the final total marks a COD order paid.
create or replace function mark_delivered(p_order_id text, p_note text, p_cod numeric)
returns void
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; v_total numeric;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  if o.status in ('cancelled', 'completed') then raise exception 'Pesanan ini sudah selesai atau dibatalkan.'; end if;
  if o.has_catch_weight and o.total_final is null then raise exception 'Timbang pesanan ini terlebih dahulu.'; end if;
  if p_cod is not null and (p_cod < 0 or p_cod > 100000000) then raise exception 'Jumlah uang tunai tidak valid.'; end if;
  v_total := coalesce(o.total_final, o.total_est);
  update orders
     set status = 'completed', delivered_at = now(),
         delivery_note = nullif(left(trim(coalesce(p_note, '')), 200), ''),
         cod_collected = case when p_cod is not null then p_cod else cod_collected end,
         payment_status = case when o.payment_method = 'cod' and p_cod is not null and p_cod >= v_total and o.payment_status <> 'paid' then 'paid' else payment_status end,
         pay_by = null,
         history = history
           || jsonb_strip_nulls(jsonb_build_object('status', 'completed', 'at', now(), 'note', 'Diterima' || coalesce(': ' || nullif(left(trim(coalesce(p_note, '')), 200), ''), '')))
           || case when o.payment_method = 'cod' and p_cod is not null and p_cod >= v_total and o.payment_status <> 'paid'
                   then jsonb_build_array(jsonb_build_object('status', 'paid', 'at', now(), 'note', 'Tunai saat diantar')) else '[]'::jsonb end
   where id = p_order_id;
end $$;

-- ---------- freshness-guarantee claims ----------
-- The customer (order code + phone) reports a problem within p_window_hours after delivery.
create or replace function create_claim(p_code text, p_phone text, p_items jsonb, p_reason text, p_note text, p_photos jsonb, p_window_hours numeric)
returns text
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; cid text; n int;
begin
  select * into o from orders where code = upper(trim(p_code)) and phone = normalize_phone(p_phone) for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  if o.status <> 'completed' or o.delivered_at is null then raise exception 'Laporan dapat dikirim setelah pesanan diterima.'; end if;
  if now() > o.delivered_at + make_interval(secs => p_window_hours * 3600) then
    raise exception 'Batas waktu laporan sudah lewat. Hubungi kami melalui WhatsApp.';
  end if;
  if p_reason is null or p_reason not in ('not_fresh','wrong_item','short_weight','damaged','missing','other') then raise exception 'Pilih alasan laporan.'; end if;
  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Pilih produk yang bermasalah.'; end if;
  if jsonb_typeof(coalesce(p_photos, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_photos, '[]'::jsonb)) > 3 or length(coalesce(p_photos, '[]'::jsonb)::text) > 2400000 then
    raise exception 'Maksimal 3 foto.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where not exists (select 1 from order_items oi where oi.order_id = o.id and oi.id = e->>'item_id')) then
    raise exception 'Produk tidak ada di pesanan ini.';
  end if;
  select count(*) into n from claims where order_id = o.id;
  if n >= 3 then raise exception 'Laporan untuk pesanan ini sudah kami terima. Hubungi kami melalui WhatsApp.'; end if;
  insert into claims (order_id, items, reason, note, photos)
  values (o.id, p_items, p_reason, left(coalesce(p_note, ''), 500), coalesce(p_photos, '[]'::jsonb))
  returning id into cid;
  return cid;
end $$;

create or replace function resolve_claim(p_id text, p_status text, p_note text, p_refund numeric)
returns text
language plpgsql security definer set search_path = public as $$
declare c claims%rowtype;
begin
  if p_status not in ('replace','refund','declined') then raise exception 'Keputusan tidak valid.'; end if;
  select * into c from claims where id = p_id for update;
  if not found then raise exception 'Laporan tidak ditemukan.'; end if;
  if c.status <> 'open' then raise exception 'Laporan ini sudah diputuskan.'; end if;
  if p_status = 'refund' and (p_refund is null or p_refund <= 0) then raise exception 'Isi jumlah pengembalian dana.'; end if;
  if p_status = 'declined' and coalesce(trim(p_note), '') = '' then raise exception 'Tulis alasan penolakan untuk pelanggan.'; end if;
  update claims set status = p_status, resolution_note = left(coalesce(p_note, ''), 500),
         refund_amount = case when p_status = 'refund' then p_refund end, resolved_at = now()
   where id = p_id;
  update orders set internal_note = trim(both E'\n' from internal_note || E'\n' || '[Garansi] ' ||
         case p_status when 'replace' then 'Diganti pada pengiriman berikutnya' when 'refund' then 'Dana dikembalikan Rp' || replace(to_char(p_refund, 'FM999,999,999'), ',', '.') else 'Ditolak' end ||
         coalesce(': ' || nullif(trim(p_note), ''), ''))
   where id = c.order_id;
  return c.order_id;
end $$;

-- ---------- restaurant receivables (functions) ----------
-- What a restaurant owes on tempo: open invoices (orders not yet delivered count at their estimate), unapplied
-- credit (payments not yet matched to an invoice), and the oldest invoice still open with its due date.
create or replace function account_exposure(p_account_id text, p_exclude text default null)
returns table (outstanding numeric, credit numeric, oldest_code text, oldest_due date)
language sql stable security definer set search_path = public as $$
  with inv as (
    select o.code, o.due_date,
           coalesce(o.total_final, o.total_est) - coalesce((select sum(a.amount) from payment_allocations a where a.order_id = o.id), 0) as remaining
      from orders o
     where o.account_id = p_account_id and o.payment_method = 'terms' and o.status <> 'cancelled'
       and o.payment_status in ('unpaid', 'awaiting_confirmation') and o.id is distinct from p_exclude
  ), oldest as (
    select code, due_date from inv where remaining > 0 and due_date is not null order by due_date, code limit 1
  )
  select coalesce((select sum(greatest(remaining, 0)) from inv), 0),
         coalesce((select sum(amount) from account_payments where account_id = p_account_id), 0)
           - coalesce((select sum(a.amount) from payment_allocations a join account_payments ap on ap.id = a.payment_id where ap.account_id = p_account_id), 0),
         (select code from oldest), (select due_date from oldest);
$$;

-- Match a restaurant's payments to its tempo invoices: oldest due invoice first, oldest payment first. Only invoices
-- with a final amount are settled. Money matched to a cancelled order, or more than a re-weighed invoice needs, goes
-- back to the account's credit. Safe to call any time; every change to payments or tempo invoices calls it.
create or replace function allocate_account_credit(p_account_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r record; x record; inv record; pay record;
  excess numeric; need numeric; take numeric;
begin
  perform 1 from business_accounts where id = p_account_id for update;
  delete from payment_allocations a using orders o
   where a.order_id = o.id and o.account_id = p_account_id and o.status = 'cancelled';
  for r in select o.id, coalesce(o.total_final, o.total_est) as amt, sum(a.amount) as al
             from orders o join payment_allocations a on a.order_id = o.id
            where o.account_id = p_account_id
            group by o.id having sum(a.amount) > coalesce(o.total_final, o.total_est) loop
    excess := r.al - r.amt;
    for x in select * from payment_allocations where order_id = r.id order by created_at desc, id desc loop
      exit when excess <= 0;
      if x.amount <= excess then
        delete from payment_allocations where id = x.id; excess := excess - x.amount;
      else
        update payment_allocations set amount = amount - excess where id = x.id; excess := 0;
      end if;
    end loop;
  end loop;
  for inv in select o.id, o.total_final as amt, coalesce((select sum(amount) from payment_allocations where order_id = o.id), 0) as al
               from orders o
              where o.account_id = p_account_id and o.payment_method = 'terms' and o.status <> 'cancelled'
                and o.payment_status in ('unpaid', 'awaiting_confirmation') and o.total_final is not null
              order by o.due_date nulls last, o.delivery_date, o.created_at, o.id loop
    need := inv.amt - inv.al;
    while need > 0 loop
      select ap.id, ap.amount - coalesce((select sum(amount) from payment_allocations where payment_id = ap.id), 0) as rem into pay
        from account_payments ap
       where ap.account_id = p_account_id
         and ap.amount > coalesce((select sum(amount) from payment_allocations where payment_id = ap.id), 0)
       order by ap.paid_on, ap.created_at, ap.id limit 1;
      exit when not found;
      take := least(need, pay.rem);
      insert into payment_allocations (payment_id, order_id, amount) values (pay.id, inv.id, take);
      need := need - take;
    end loop;
    if need <= 0 then
      update orders set payment_status = 'paid', pay_by = null,
             history = history || jsonb_build_object('status', 'paid', 'at', now(), 'note', 'Dari pembayaran tempo')
       where id = inv.id;
    end if;
  end loop;
end $$;

create or replace function record_account_payment(p_account_id text, p_amount numeric, p_paid_on date, p_method text, p_reference text, p_note text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_id text := new_id('ap');
begin
  if not exists (select 1 from business_accounts where id = p_account_id) then raise exception 'Akun tidak ditemukan.'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000000000 or p_amount <> round(p_amount) then raise exception 'Jumlah pembayaran tidak valid.'; end if;
  if p_paid_on is null or p_paid_on > jakarta_now()::date or p_paid_on < jakarta_now()::date - 366 then raise exception 'Tanggal pembayaran tidak valid.'; end if;
  if p_method is null or p_method not in ('transfer','cash','qris','giro','other') then raise exception 'Cara pembayaran tidak valid.'; end if;
  insert into account_payments (id, account_id, amount, paid_on, method, reference, note)
  values (v_id, p_account_id, p_amount, p_paid_on, p_method, left(trim(coalesce(p_reference, '')), 80), left(trim(coalesce(p_note, '')), 200));
  perform allocate_account_credit(p_account_id);
  return v_id;
end $$;

-- Remove a payment recorded by mistake: invoices it settled become unpaid again unless other payments still cover them.
create or replace function delete_account_payment(p_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_account text; r record;
begin
  select account_id into v_account from account_payments where id = p_id;
  if v_account is null then raise exception 'Pembayaran tidak ditemukan.'; end if;
  perform 1 from business_accounts where id = v_account for update;
  for r in select distinct order_id from payment_allocations where payment_id = p_id loop
    update orders
       set payment_status = 'unpaid',
           history = history || jsonb_build_object('status', 'unpaid', 'at', now(), 'note', 'Pembayaran tempo dihapus')
     where id = r.order_id and payment_status = 'paid'
       and coalesce(total_final, total_est) > coalesce((select sum(amount) from payment_allocations where order_id = r.order_id and payment_id <> p_id), 0);
  end loop;
  delete from account_payments where id = p_id;
  perform allocate_account_credit(v_account);
end $$;

-- Sliding-window rate limit: true (and the hit is counted) while under p_max hits in the last p_window_seconds.
create or replace function hit_rate_limit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare used int;
begin
  perform pg_advisory_xact_lock(hashtext('rl:' || p_key));
  select count(*) into used from rate_hits where key = p_key and at > now() - make_interval(secs => p_window_seconds);
  if used >= p_max then return false; end if;
  insert into rate_hits (key) values (p_key);
  if random() < 0.02 then delete from rate_hits where at < now() - interval '1 day'; end if;
  return true;
end $$;

-- Record an application error; returns how many times this fingerprint has occurred (1 = new, alert worthy).
create or replace function log_error(p_source text, p_message text, p_path text, p_digest text, p_detail text)
returns int
language plpgsql security definer set search_path = public as $$
declare fp text := md5(coalesce(p_source, '') || '|' || left(coalesce(p_message, ''), 300) || '|' || coalesce(p_path, '')); c int;
begin
  insert into error_events (fingerprint, source, message, path, digest, detail)
  values (fp, left(coalesce(p_source, 'server'), 20), left(coalesce(p_message, ''), 1000), left(coalesce(p_path, ''), 300), left(p_digest, 100), left(p_detail, 4000))
  on conflict (fingerprint) do update
    set count = case when error_events.resolved then 1 else error_events.count + 1 end,
        last_at = now(), resolved = false, digest = excluded.digest, detail = excluded.detail,
        first_at = case when error_events.resolved then now() else error_events.first_at end
  returning count into c;
  return c;
end $$;

-- ---------- business accounts ----------
create or replace function apply_account(p jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare v_phone text; aid text;
begin
  if coalesce(trim(p->>'business_name'), '') = '' or coalesce(trim(p->>'contact_name'), '') = '' then
    raise exception 'Nama usaha dan nama kontak wajib diisi.';
  end if;
  v_phone := normalize_phone(p->>'phone');
  if v_phone !~ '^62[0-9]{8,13}$' then raise exception 'Nomor WhatsApp tidak valid.'; end if;
  if exists (select 1 from business_accounts where business_accounts.phone = v_phone) then
    raise exception 'Nomor ini sudah terdaftar. Hubungi kami melalui WhatsApp untuk mendapatkan kode akses.';
  end if;
  insert into business_accounts (business_name, contact_name, phone, address, area_id, business_type, notes)
  values (trim(p->>'business_name'), trim(p->>'contact_name'), v_phone, coalesce(trim(p->>'address'), ''),
          nullif(p->>'area_id', ''), coalesce(p->>'business_type', ''), coalesce(trim(p->>'notes'), ''))
  returning id into aid;
  return aid;
end $$;

create or replace function approve_account(p_id text, p_discount numeric, p_terms text, p_cod boolean, p_slot text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update business_accounts
     set status = 'approved',
         discount_pct = coalesce(p_discount, 0),
         payment_terms = p_terms,
         allow_cod = p_cod,
         preferred_slot_id = coalesce(p_slot, preferred_slot_id),
         approved_at = coalesce(approved_at, now()),
         access_code = coalesce(access_code, random_code(6))
   where id = p_id;
  if not found then raise exception 'Akun tidak ditemukan.'; end if;
end $$;

create or replace function regenerate_access_code(p_id text)
returns text
language plpgsql security definer set search_path = public as $$
declare c text := random_code(6);
begin
  update business_accounts set access_code = c where id = p_id;
  if not found then raise exception 'Akun tidak ditemukan.'; end if;
  delete from business_sessions where account_id = p_id;
  return c;
end $$;

create or replace function business_login(p_phone text, p_code text)
returns text
language plpgsql security definer set search_path = public as $$
declare aid text; tok text; v_phone text := normalize_phone(p_phone);
begin
  perform pg_advisory_xact_lock(hashtext('bl:' || v_phone)); -- concurrent tries are counted one by one
  select id into aid from business_accounts
   where phone = v_phone and status = 'approved'
     and access_code is not null and upper(access_code) = upper(trim(p_code));
  if aid is null then
    -- Wrong codes: after 5 in 15 minutes every further wrong try is refused with a lockout message. The right code
    -- still works, so nobody can lock a restaurant out; guessing a 6-character code is also capped per device by the app.
    if (select count(*) from login_attempts where phone = v_phone and at > now() - interval '15 minutes') >= 5 then
      raise exception 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit atau hubungi kami melalui WhatsApp.';
    end if;
    insert into login_attempts (phone) values (v_phone);
    if random() < 0.05 then delete from login_attempts where at < now() - interval '1 day'; end if;
    return null;
  end if;
  delete from login_attempts where phone = v_phone;
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into business_sessions (token, account_id, expires_at) values (tok, aid, now() + interval '90 days');
  delete from business_sessions where expires_at < now();
  return tok;
end $$;

-- ---------- household customer login (one-time code by WhatsApp) ----------
-- A new code replaces the previous one; at most one per minute per phone (more limits in the app).
create or replace function customer_request_code(p_phone text, p_code_hash text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_phone text := normalize_phone(p_phone);
begin
  if v_phone !~ '^62[0-9]{8,13}$' then raise exception 'Nomor WhatsApp tidak valid.'; end if;
  if exists (select 1 from login_codes where phone = v_phone and created_at > now() - interval '60 seconds') then
    raise exception 'Kode baru saja dikirim. Tunggu satu menit sebelum meminta lagi.';
  end if;
  insert into login_codes (phone, code_hash, expires_at, attempts, created_at)
  values (v_phone, p_code_hash, now() + interval '10 minutes', 0, now())
  on conflict (phone) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, created_at = now(),
    attempts = case when login_codes.created_at > now() - interval '15 minutes' then login_codes.attempts else 0 end;
  delete from login_codes where expires_at < now() - interval '1 day';
  return v_phone;
end $$;

-- Check a code. Returns 'ok:<customer id>' (session created), or 'wrong', 'expired', 'locked' (5 wrong tries).
-- Wrong tries are counted (no exception, so the count is kept).
create or replace function customer_login(p_phone text, p_code_hash text, p_token_hash text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_phone text := normalize_phone(p_phone); c login_codes%rowtype; cid text;
begin
  select * into c from login_codes where phone = v_phone for update;
  if not found or c.expires_at < now() then return 'expired'; end if;
  if c.attempts >= 5 then return 'locked'; end if;
  if c.code_hash <> p_code_hash then
    update login_codes set attempts = attempts + 1 where phone = v_phone;
    return case when c.attempts + 1 >= 5 then 'locked' else 'wrong' end;
  end if;
  delete from login_codes where phone = v_phone;
  insert into customers (phone, last_login_at) values (v_phone, now())
    on conflict (phone) do update set last_login_at = now()
  returning id into cid;
  insert into customer_sessions (token_hash, customer_id, expires_at) values (p_token_hash, cid, now() + interval '90 days');
  delete from customer_sessions where expires_at < now();
  return 'ok:' || cid;
end $$;

-- ---------- reporting ----------
create or replace function daily_summary(p_date date)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  sales numeric := 0; cost numeric := 0; product_sales numeric := 0; non_sea numeric := 0; unpaid numeric := 0;
  to_weigh int := 0; n_total int := 0; n_retail int := 0; n_business int := 0;
  by_status jsonb;
begin
  select coalesce(sum(coalesce(total_final, total_est)), 0),
         coalesce(sum(coalesce(subtotal_final, subtotal_est) - discount), 0),
         coalesce(sum(case when payment_status not in ('paid', 'void') then coalesce(total_final, total_est) else 0 end), 0),
         count(*) filter (where has_catch_weight and weighed_at is null),
         count(*), count(*) filter (where segment = 'retail'), count(*) filter (where segment = 'business')
    into sales, product_sales, unpaid, to_weigh, n_total, n_retail, n_business
    from orders where delivery_date = p_date and status <> 'cancelled';

  select coalesce(sum(oi.unit_cost * coalesce(oi.qty_final, oi.qty_ordered)), 0),
         coalesce(sum(case when not c.is_seafood then coalesce(oi.line_total_final, oi.line_total_est) else 0 end), 0)
    into cost, non_sea
    from order_items oi
    join orders o on o.id = oi.order_id
    left join categories c on c.id = oi.category_id
   where o.delivery_date = p_date and o.status <> 'cancelled';

  select jsonb_object_agg(st, cnt) into by_status
    from (select s as st, count(o.id) as cnt
            from unnest(array['new','confirmed','packing','delivering','completed','cancelled']) s
            left join orders o on o.status = s and o.delivery_date = p_date
           group by s) x;

  return jsonb_build_object(
    'date', p_date, 'orders_total', n_total, 'orders_retail', n_retail, 'orders_business', n_business,
    'sales', sales, 'est_cost', cost, 'est_gross_profit', product_sales - cost,
    'margin_pct', case when product_sales > 0 then (product_sales - cost) / product_sales * 100 else 0 end,
    'non_seafood_share_pct', case when product_sales > 0 then non_sea / product_sales * 100 else 0 end,
    'unpaid_amount', unpaid, 'to_weigh', to_weigh, 'by_status', by_status);
end $$;

create or replace function buying_list(p_date date)
returns table (product_id text, product_name text, scientific_name text, variant_label text, unit text, storage_class text,
               qty numeric, qty_with_buffer numeric, order_count bigint, prep_notes text[])
language sql security definer set search_path = public as $$
  with s as (select catch_weight_buffer_pct from settings where id = 1)
  select oi.product_id, oi.product_name, p.scientific_name, oi.variant_label, oi.unit, oi.storage_class,
         sum(oi.qty_ordered) as qty,
         case when bool_or(oi.is_catch_weight)
              then ceil(sum(oi.qty_ordered) * (1 + (select catch_weight_buffer_pct from s) / 100) * 2) / 2
              else sum(oi.qty_ordered) end as qty_with_buffer,
         count(distinct oi.order_id) as order_count,
         array_remove(array_agg(case when oi.prep_label is not null then o.customer_name || ': ' || oi.prep_label || ' ' || oi.qty_ordered || ' ' || oi.unit end), null) as prep_notes
    from order_items oi
    join orders o on o.id = oi.order_id
    left join products p on p.id = oi.product_id
   where o.delivery_date = p_date and o.status <> 'cancelled'
   group by oi.product_id, oi.product_name, p.scientific_name, oi.variant_label, oi.unit, oi.storage_class
   order by case oi.storage_class when 'chilled' then 0 when 'frozen' then 1 else 2 end, oi.product_name;
$$;

create or replace function sales_report(p_from date, p_to date)
returns table (date date, orders bigint, sales numeric, gross_profit numeric, non_seafood_sales numeric)
language sql security definer set search_path = public as $$
  -- per-order totals first (no division drift), per-item margin second; promo discounts reduce gross profit
  with o as (
    select id, delivery_date, coalesce(total_final, total_est) as total, discount
      from orders where status <> 'cancelled' and delivery_date between p_from and p_to
  ), items as (
    select oi.order_id,
           sum(coalesce(oi.line_total_final, oi.line_total_est) - oi.unit_cost * coalesce(oi.qty_final, oi.qty_ordered)) as margin,
           sum(case when not coalesce(c.is_seafood, true) then coalesce(oi.line_total_final, oi.line_total_est) else 0 end) as non_sea
      from order_items oi left join categories c on c.id = oi.category_id
     where oi.order_id in (select id from o)
     group by oi.order_id
  )
  select o.delivery_date, count(*), sum(o.total), sum(coalesce(items.margin, 0) - o.discount), sum(coalesce(items.non_sea, 0))
    from o left join items on items.order_id = o.id
   group by o.delivery_date
   order by o.delivery_date;
$$;

-- Lock the functions down: only the service role (server) may call them.
do $$
declare f text;
begin
  for f in select unnest(array[
    'place_order(jsonb, text)', 'weigh_order(text, jsonb)', 'set_order_status(text, text, text)', 'set_payment_status(text, text)',
    'customer_confirm_payment(text, text)', 'apply_account(jsonb)', 'approve_account(text, numeric, text, boolean, text)',
    'regenerate_access_code(text)', 'business_login(text, text)', 'daily_summary(date)', 'buying_list(date)', 'sales_report(date, date)',
    'expire_unpaid_orders()', 'record_gateway_payment(text, text, numeric, jsonb)', 'customer_request_code(text, text)', 'customer_login(text, text, text)', 'mark_delivered(text, text, numeric)', 'create_claim(text, text, jsonb, text, text, jsonb, numeric)', 'resolve_claim(text, text, text, numeric)', 'account_exposure(text, text)', 'allocate_account_credit(text)', 'record_account_payment(text, numeric, date, text, text, text)', 'delete_account_payment(text)', 'hit_rate_limit(text, integer, integer)', 'log_error(text, text, text, text, text)']) loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
exception when undefined_object then
  -- roles anon/authenticated/service_role do not exist outside Supabase (e.g. local test DB)
  null;
end $$;
