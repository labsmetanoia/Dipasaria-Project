-- Household weekly boxes (November 2026): standing orders can belong to a household customer. Run once on an existing
-- project, then re-run supabase/schema.sql. (schema.sql contains the same statements; this file exists so the upgrade
-- order stays one numbered file per feature.)
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
