-- Round 9: restaurant standing orders. Run once on a project created from an earlier schema.sql.

-- Standing orders: a business account's recurring order (items, weekdays, slot, payment).
-- A scheduled job (src/app/api/cron/standing-orders) turns the next day's due standing orders into real
-- orders through place_order; standing_order_runs records each attempt and its unique key makes the run idempotent.
create table if not exists standing_orders (
  id text primary key,
  account_id text not null references business_accounts(id) on delete cascade,
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
  created_at timestamptz not null default now(),
  unique (standing_order_id, delivery_date)
);

do $$
declare t text;
begin
  for t in select unnest(array['standing_orders','standing_order_runs']) loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists admin_all on %I', t);
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;
