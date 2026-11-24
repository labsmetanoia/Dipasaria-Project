-- Gift orders and trader's-pick boxes (November 2026). Run once on an existing project, then re-run
-- supabase/schema.sql (place_order learns the gift fields), then supabase/seed.sql (adds the trader's-pick box product;
-- existing products, prices and stock are not touched).
alter table products add column if not exists curated boolean not null default false;
alter table products add column if not exists weekly_contents text not null default '';
alter table products add column if not exists weekly_contents_en text;
alter table products add column if not exists weekly_contents_at timestamptz;
alter table orders add column if not exists recipient_phone text;
alter table orders add column if not exists gift_from text;
alter table orders add column if not exists gift_message text;
