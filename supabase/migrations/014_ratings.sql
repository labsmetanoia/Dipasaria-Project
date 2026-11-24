-- Ratings after delivery (November 2026). Run once on an existing project, then re-run supabase/schema.sql
-- (it creates the create_rating and product_rating_summary functions and re-applies row-level security).
create table if not exists ratings (
  id text primary key default new_id('rt'),
  order_id text not null unique references orders(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists rating_items (
  rating_id text not null references ratings(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  primary key (rating_id, product_id)
);
create index if not exists rating_items_product_idx on rating_items(product_id);
create index if not exists ratings_created_idx on ratings(created_at desc);
