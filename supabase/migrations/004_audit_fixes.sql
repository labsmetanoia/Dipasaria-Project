-- Audit fixes (November 2026). Run once on a project created from an earlier schema.sql,
-- then re-run supabase/schema.sql (safe to re-run: it only creates missing tables and replaces functions).

-- Idempotent checkout and promo terms frozen at order time
alter table orders add column if not exists client_ref text;
create unique index if not exists orders_client_ref_key on orders(client_ref);
alter table orders add column if not exists promo_type text;
alter table orders add column if not exists promo_value numeric;
update orders o set promo_type = p.type, promo_value = p.value from promos p where o.promo_code = p.code and o.promo_type is null;

-- Cancelled-after-payment orders are flagged for a refund instead of staying "paid"
alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check check (payment_status in ('unpaid','awaiting_confirmation','paid','refund_due','void'));

-- Lockout for access-code guessing
create table if not exists login_attempts (phone text not null, at timestamptz not null default now());
create index if not exists login_attempts_phone_idx on login_attempts(phone, at);
alter table login_attempts enable row level security;
drop policy if exists admin_all on login_attempts;
create policy admin_all on login_attempts for all to authenticated using (is_admin()) with check (is_admin());

-- The example restaurant accounts (published demo codes) must not exist in production
update business_accounts set status = 'suspended', access_code = null where id in ('ba_bahari', 'ba_minang', 'ba_kemang');
delete from business_sessions where account_id in ('ba_bahari', 'ba_minang', 'ba_kemang');
