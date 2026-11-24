-- Seasonal pre-orders (November 2026). Run once on an existing project, then re-run supabase/schema.sql (place_order
-- learns the campaign rules), then supabase/seed.sql (adds an example New Year's Eve campaign that starts inactive;
-- existing products, prices and stock are not touched).
create table if not exists campaigns (
  id text primary key default new_id('cm'),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  name text not null check (length(name) between 2 and 80),
  name_en text,
  intro text not null default '',
  intro_en text,
  image_url text,
  opens_on date not null,
  order_by date not null,
  deliver_from date not null,
  deliver_to date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (opens_on <= order_by and order_by < deliver_from and deliver_from <= deliver_to and deliver_to - deliver_from <= 13)
);
alter table products add column if not exists campaign_id text references campaigns(id) on delete set null;
alter table orders add column if not exists campaign_id text references campaigns(id) on delete set null;
