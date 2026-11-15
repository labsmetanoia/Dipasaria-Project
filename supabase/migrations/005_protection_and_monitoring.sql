-- Bot protection, automatic expiry of unpaid orders, partial standing orders and error monitoring (November 2026).
-- Run once on a project created from an earlier schema.sql, then re-run supabase/schema.sql
-- (it creates the new tables and functions and re-applies row-level security).

alter table settings add column if not exists payment_window_minutes int not null default 120;
alter table orders add column if not exists pay_by timestamptz;
create index if not exists orders_pay_by_idx on orders(pay_by) where payment_status = 'unpaid';
alter table standing_order_runs add column if not exists note text;

-- Optional: cancel unpaid orders every 10 minutes from inside Supabase (Database → Extensions → enable pg_cron first).
-- The app also runs the expiry on every checkout, back-office visit and order lookup, so this only makes it punctual.
--   select cron.schedule('expire-unpaid-orders', '*/10 * * * *', 'select expire_unpaid_orders()');
