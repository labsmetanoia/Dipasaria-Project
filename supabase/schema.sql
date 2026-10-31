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
begin
  for i in 1..len loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return out;
end $$;

create or replace function normalize_phone(raw text) returns text language plpgsql immutable as $$
declare p text;
begin
  p := regexp_replace(coalesce(raw, ''), '[^0-9+]', '', 'g');
  if left(p, 1) = '+' then p := substr(p, 2); end if;
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
  announcement text
);

create table if not exists categories (
  id text primary key default new_id('c'),
  slug text unique not null,
  name text not null,
  description text not null default '',
  sort int not null default 0,
  icon text not null default 'fish',
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
  origin text not null default '',
  storage_class text not null check (storage_class in ('chilled','frozen','ambient')),
  storage_note text not null default '',
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
  surcharge numeric not null default 0,
  note text,
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
  approved_at timestamptz
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
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','awaiting_confirmation','paid','void')),
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
  history jsonb not null default '[]'::jsonb
);
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
  line_total_final numeric
);
create index if not exists order_items_order_idx on order_items(order_id);

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

do $$
declare t text;
begin
  for t in select unnest(array['settings','categories','products','variants','prep_options','delivery_areas','delivery_slots','promos','business_accounts','business_sessions','orders','order_items','admins']) loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists admin_all on %I', t);
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- ---------- order placement ----------
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
begin
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
  if coalesce(trim(p->>'address'), '') = '' then raise exception 'Alamat wajib diisi.'; end if;
  if jsonb_array_length(coalesce(p->'lines', '[]'::jsonb)) = 0 then raise exception 'Keranjang kosong.'; end if;

  -- delivery date vs cut-off
  d := (p->>'delivery_date')::date;
  first_date := jnow::date + case when jnow::time < s.cutoff_time::time then 1 else 2 end;
  if d < first_date or d > jnow::date + s.max_days_ahead then
    raise exception 'Tanggal pengiriman tidak tersedia (batas pesan % WIB).', s.cutoff_time;
  end if;

  select * into area from delivery_areas where id = p->>'area_id' and is_active;
  if not found then raise exception 'Area pengiriman tidak valid.'; end if;

  select * into slot from delivery_slots where id = p->>'slot_id' and is_active and (segment = 'all' or segment = seg);
  if not found then raise exception 'Slot pengiriman tidak valid.'; end if;
  perform pg_advisory_xact_lock(hashtext(d::text || slot.id));
  select count(*) into used from orders where delivery_date = d and slot_id = slot.id and status <> 'cancelled';
  if used >= slot.capacity then raise exception 'Slot pengiriman sudah penuh, pilih slot lain.'; end if;

  pm := p->>'payment_method';
  if pm not in ('qris','transfer','cod','terms') then raise exception 'Metode pembayaran tidak valid.'; end if;
  if pm = 'cod' and not (seg = 'business' and acc.allow_cod) then raise exception 'COD hanya untuk akun bisnis yang disetujui.'; end if;
  if pm = 'terms' and not (seg = 'business' and acc.payment_terms <> 'prepaid') then raise exception 'Tempo hanya untuk akun bisnis dengan fasilitas tempo.'; end if;

  -- unique order code, then the header row (totals are filled in after the lines)
  loop
    v_code := 'DP-' || to_char(d, 'YYMMDD') || '-' || random_code(4);
    exit when not exists (select 1 from orders where orders.code = v_code);
  end loop;
  insert into orders (id, code, segment, account_id, customer_name, phone, address, area_id, area_name, maps_url, delivery_date,
    slot_id, slot_label, payment_method, payment_status, status, customer_note, history)
  values (oid, v_code, seg, acc.id, trim(p->>'customer_name'), v_phone, trim(p->>'address'), area.id, area.name, nullif(trim(p->>'maps_url'), ''), d,
    slot.id, slot.label || ' ' || slot.start_time || '–' || slot.end_time, pm, 'unpaid', 'new', coalesce(trim(p->>'customer_note'), ''),
    jsonb_build_array(jsonb_build_object('status', 'new', 'at', now())));

  -- lines
  for line in select * from jsonb_array_elements(p->'lines') loop
    select * into var from variants where id = line->>'variant_id' and is_active for update;
    if not found then raise exception 'Salah satu produk sudah tidak tersedia.'; end if;
    select * into prod from products where id = var.product_id and is_active;
    if not found then raise exception 'Salah satu produk sudah tidak dijual.'; end if;
    if not prod.available_today then raise exception '% habis hari ini.', prod.name; end if;
    if var.business_only and seg <> 'business' then raise exception '% (%) hanya untuk akun bisnis.', prod.name, var.label; end if;

    q := var.min_qty + greatest(0, round(((line->>'qty')::numeric - var.min_qty) / var.step_qty)) * var.step_qty;
    if q < var.min_qty then raise exception '%: minimum % %.', prod.name, var.min_qty, var.unit; end if;
    if var.stock_qty is not null and q > var.stock_qty then
      raise exception '% (%): stok tersisa % %.', prod.name, var.label, var.stock_qty, var.unit;
    end if;

    has_prep := false;
    if coalesce(line->>'prep_option_id', '') <> '' then
      select * into prep from prep_options where id = line->>'prep_option_id' and product_id = prod.id;
      if not found then raise exception '%: opsi penyiapan tidak tersedia.', prod.name; end if;
      has_prep := true;
    end if;

    price := case when seg = 'business'
                  then round(var.price_business * (1 - coalesce(acc.discount_pct, 0) / 100))
                  else var.price_retail end
             + case when has_prep then prep.surcharge else 0 end;

    if var.stock_qty is not null then
      update variants set stock_qty = stock_qty - q where id = var.id;
    end if;

    insert into order_items (order_id, product_id, variant_id, category_id, product_name, variant_label, unit, storage_class,
      is_catch_weight, qty_ordered, unit_price, prep_option_id, prep_label, prep_surcharge, unit_cost, line_total_est)
    values (oid, prod.id, var.id, prod.category_id, prod.name, var.label, var.unit, prod.storage_class,
      prod.is_catch_weight, q, price,
      case when has_prep then prep.id end, case when has_prep then prep.label end, case when has_prep then prep.surcharge else 0 end,
      var.cost, round(price * q));

    v_subtotal := v_subtotal + round(price * q);
    has_catch := has_catch or prod.is_catch_weight;
    items_count := items_count + 1;
  end loop;

  min_order := case when seg = 'business' then s.min_order_business else s.min_order_retail end;
  if v_subtotal < min_order then raise exception 'Minimum pesanan Rp %.', to_char(min_order, 'FM999G999G999'); end if;

  threshold := case when seg = 'business' then s.free_delivery_business else s.free_delivery_retail end;
  v_fee := case when v_subtotal >= threshold then 0 else area.fee end;

  -- promo
  if coalesce(trim(p->>'promo_code'), '') <> '' then
    select * into promo from promos where upper(code) = upper(trim(p->>'promo_code')) for update;
    if not found then raise exception 'Kode promo tidak ditemukan.'; end if;
    if not promo.is_active then raise exception 'Kode promo tidak aktif.'; end if;
    if promo.segment <> 'all' and promo.segment <> seg then raise exception 'Kode promo tidak berlaku untuk akun ini.'; end if;
    if promo.starts_at is not null and now() < promo.starts_at then raise exception 'Promo belum dimulai.'; end if;
    if promo.ends_at is not null and now() > promo.ends_at then raise exception 'Promo sudah berakhir.'; end if;
    if promo.quota is not null and promo.used_count >= promo.quota then raise exception 'Kuota promo sudah habis.'; end if;
    if v_subtotal < promo.min_spend then raise exception 'Minimum belanja promo Rp %.', to_char(promo.min_spend, 'FM999G999G999'); end if;
    if promo.first_order_only and exists (select 1 from orders o2 where o2.phone = v_phone and o2.status <> 'cancelled' and o2.id <> oid) then
      raise exception 'Promo hanya untuk pesanan pertama.';
    end if;
    if promo.type = 'percent' then v_discount := round(v_subtotal * promo.value / 100);
    elsif promo.type = 'fixed' then v_discount := least(promo.value, v_subtotal);
    else v_fee := 0; end if;
    update promos set used_count = used_count + 1 where id = promo.id;
    has_promo := true;
  end if;

  v_total := greatest(0, v_subtotal - v_discount + v_fee);

  update orders
     set subtotal_est = v_subtotal, discount = v_discount, delivery_fee = v_fee, total_est = v_total,
         subtotal_final = case when has_catch then null else v_subtotal end,
         total_final = case when has_catch then null else v_total end,
         has_catch_weight = has_catch,
         promo_code = case when has_promo then promo.code end
   where id = oid;

  return oid;
end $$;

-- ---------- weighing and re-pricing ----------
create or replace function weigh_order(p_order_id text, p_items jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  s settings%rowtype;
  it jsonb;
  v_subtotal numeric;
  v_fee numeric;
  disc numeric;
  promo promos%rowtype;
  area_fee numeric;
  threshold numeric;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  select * into s from settings where id = 1;

  for it in select * from jsonb_array_elements(p_items) loop
    if (it->>'qty_final')::numeric < 0 then raise exception 'Berat harus angka positif.'; end if;
    update order_items
       set qty_final = (it->>'qty_final')::numeric,
           line_total_final = round(unit_price * (it->>'qty_final')::numeric)
     where id = it->>'item_id' and order_id = p_order_id;
    if not found then raise exception 'Baris pesanan tidak ditemukan.'; end if;
  end loop;

  -- non-weighed lines are final as ordered
  update order_items set qty_final = qty_ordered, line_total_final = line_total_est
   where order_id = p_order_id and qty_final is null and not is_catch_weight;

  if exists (select 1 from order_items where order_id = p_order_id and qty_final is null) then
    update orders set weighed_at = now() where id = p_order_id; -- partial weigh: totals stay estimated
    return;
  end if;

  select coalesce(sum(line_total_final), 0) into v_subtotal from order_items where order_id = p_order_id;
  select coalesce(delivery_areas.fee, 0) into area_fee from delivery_areas where id = o.area_id;
  threshold := case when o.segment = 'business' then s.free_delivery_business else s.free_delivery_retail end;
  v_fee := case when v_subtotal >= threshold then 0 else area_fee end;
  disc := o.discount;
  if o.promo_code is not null then
    select * into promo from promos where code = o.promo_code;
    if found then
      if promo.type = 'percent' then disc := round(v_subtotal * promo.value / 100);
      elsif promo.type = 'fixed' then disc := least(promo.value, v_subtotal);
      else v_fee := 0; end if;
    end if;
  end if;

  update orders
     set subtotal_final = v_subtotal,
         discount = disc,
         delivery_fee = v_fee,
         total_final = greatest(0, v_subtotal - disc + v_fee),
         weighed_at = now(),
         history = history || jsonb_build_object('status', 'weighed', 'at', now())
   where id = p_order_id;
end $$;

-- ---------- status changes ----------
create or replace function set_order_status(p_order_id text, p_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; it order_items%rowtype;
begin
  if p_status not in ('new','confirmed','packing','delivering','completed','cancelled') then raise exception 'Status tidak valid.'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  if o.status = 'cancelled' then raise exception 'Pesanan sudah dibatalkan.'; end if;
  if p_status = 'cancelled' then
    for it in select * from order_items where order_id = p_order_id loop
      update variants set stock_qty = stock_qty + it.qty_ordered where id = it.variant_id and stock_qty is not null;
    end loop;
    if o.payment_status <> 'paid' then update orders set payment_status = 'void' where id = p_order_id; end if;
  end if;
  update orders
     set status = p_status,
         history = history || jsonb_strip_nulls(jsonb_build_object('status', p_status, 'at', now(), 'note', p_note))
   where id = p_order_id;
end $$;

create or replace function set_payment_status(p_order_id text, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('unpaid','awaiting_confirmation','paid','void') then raise exception 'Status pembayaran tidak valid.'; end if;
  update orders
     set payment_status = p_status,
         history = case when p_status = 'paid' then history || jsonb_build_object('status', 'paid', 'at', now()) else history end
   where id = p_order_id;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
end $$;

-- Customer: "I have paid" (only moves unpaid → awaiting confirmation; the owner confirms against the bank app).
create or replace function customer_confirm_payment(p_code text, p_phone text)
returns text
language plpgsql security definer set search_path = public as $$
declare oid text;
begin
  select id into oid from orders where upper(code) = upper(trim(p_code)) and phone = normalize_phone(p_phone);
  if oid is null then raise exception 'Pesanan tidak ditemukan.'; end if;
  update orders set payment_status = 'awaiting_confirmation' where id = oid and payment_status = 'unpaid';
  return oid;
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
    raise exception 'Nomor ini sudah terdaftar. Hubungi kami via WhatsApp untuk kode akses.';
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
declare aid text; tok text;
begin
  select id into aid from business_accounts
   where phone = normalize_phone(p_phone) and status = 'approved'
     and access_code is not null and upper(access_code) = upper(trim(p_code));
  if aid is null then return null; end if;
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into business_sessions (token, account_id, expires_at) values (tok, aid, now() + interval '90 days');
  delete from business_sessions where expires_at < now();
  return tok;
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
         coalesce(sum(coalesce(subtotal_final, subtotal_est)), 0),
         coalesce(sum(case when payment_status <> 'paid' then coalesce(total_final, total_est) else 0 end), 0),
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
         case when oi.storage_class = 'chilled'
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
  select o.delivery_date as date,
         count(distinct o.id) as orders,
         sum(distinct_total.t) as sales,
         sum(coalesce(oi.line_total_final, oi.line_total_est) - oi.unit_cost * coalesce(oi.qty_final, oi.qty_ordered)) as gross_profit,
         sum(case when not coalesce(c.is_seafood, true) then coalesce(oi.line_total_final, oi.line_total_est) else 0 end) as non_seafood_sales
    from orders o
    join order_items oi on oi.order_id = o.id
    left join categories c on c.id = oi.category_id
    join lateral (select coalesce(o.total_final, o.total_est) / nullif((select count(*) from order_items x where x.order_id = o.id), 0) as t) distinct_total on true
   where o.status <> 'cancelled' and o.delivery_date between p_from and p_to
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
    'regenerate_access_code(text)', 'business_login(text, text)', 'daily_summary(date)', 'buying_list(date)', 'sales_report(date, date)']) loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
exception when undefined_object then
  -- roles anon/authenticated/service_role do not exist outside Supabase (e.g. local test DB)
  null;
end $$;
