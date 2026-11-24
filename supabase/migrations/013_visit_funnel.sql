-- Anonymous visit funnel (November 2026). Run once on an existing project, then re-run supabase/schema.sql
-- (it creates the track_event function and re-applies row-level security).
create table if not exists funnel_daily (
  day date not null,
  event text not null check (event in ('visit','product_view','add_to_cart','checkout_start','order_placed')),
  product_id text not null default '',
  n int not null default 0 check (n >= 0),
  primary key (day, event, product_id)
);
