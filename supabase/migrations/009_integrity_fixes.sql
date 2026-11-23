-- Audit round 2 (November 2026). Run once on an existing project, then re-run supabase/schema.sql
-- (it adds the integrity rules, the promo-code index and the login indexes, and updates the functions).
-- Do NOT re-run seed.sql on a live project for catalogue changes: it now only inserts rows that are missing.

-- Lines whose stock was deducted at order time; only these give stock back when an order is cancelled.
alter table order_items add column if not exists stock_reserved boolean not null default false;
-- Best guess for existing open orders: their variant tracks stock now, so it most likely did when ordered.
update order_items oi set stock_reserved = true
  from orders o, variants v
 where oi.order_id = o.id and v.id = oi.variant_id and v.stock_qty is not null
   and o.status not in ('completed', 'cancelled') and not oi.stock_reserved;

-- "+62 0812…" was stored as 620812…: store it like "0812…" (6281…), so one customer is one number.
update orders set phone = '62' || substr(phone, 4) where phone like '620%';
update business_accounts set phone = '62' || substr(phone, 4)
 where phone like '620%' and not exists (select 1 from business_accounts b2 where b2.phone = '62' || substr(business_accounts.phone, 4));
update customers set phone = '62' || substr(phone, 4)
 where phone like '620%' and not exists (select 1 from customers c2 where c2.phone = '62' || substr(customers.phone, 4));
delete from login_codes where phone like '620%';

-- Cut-off times written with a dot ("20.00") break checkout: store them as "20:00" before the format rule is added.
update settings set cutoff_time = replace(cutoff_time, '.', ':') where cutoff_time ~ '^[0-9]{2}\.[0-9]{2}$';
