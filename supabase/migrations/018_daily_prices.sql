-- Daily prices from auction cost (November 2026). Run once on an existing project, then re-run supabase/schema.sql.
-- The gross margin each price list aims for; Harga hari ini suggests prices from the morning's cost to keep them.
alter table settings add column if not exists target_margin_retail numeric not null default 20;
alter table settings add column if not exists target_margin_business numeric not null default 12;
