-- Restaurant receivables and contract prices (November 2026). Run once on an existing project, then re-run
-- supabase/schema.sql (it creates the payment, allocation and contract-price tables and the new functions, and
-- re-applies row-level security).
alter table business_accounts add column if not exists credit_limit numeric;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'business_accounts_credit_limit_check') then
    alter table business_accounts add constraint business_accounts_credit_limit_check check (credit_limit is null or credit_limit >= 0);
  end if;
end $$;
alter table settings add column if not exists terms_grace_days int not null default 3;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'settings_terms_grace_days_check') then
    alter table settings add constraint settings_terms_grace_days_check check (terms_grace_days between 0 and 60);
  end if;
end $$;

-- Due date of each tempo invoice: delivery date + the account's terms (3 days, or 7 for weekly).
alter table orders add column if not exists due_date date;
update orders o
   set due_date = o.delivery_date + case (select payment_terms from business_accounts a where a.id = o.account_id) when 'days3' then 3 else 7 end
 where o.payment_method = 'terms' and o.due_date is null;

-- WhatsApp: the statement message, and a key for messages without an order (the old key let them be queued twice).
alter table wa_messages drop constraint if exists wa_messages_kind_check;
alter table wa_messages add constraint wa_messages_kind_check
  check (kind in ('received','invoice','paid','delivering','reminder','cancelled','standing','delivered','claim','restock','statement'));
delete from wa_messages w
 where w.order_id is null
   and exists (select 1 from wa_messages w2 where w2.order_id is null and w2.kind = w.kind and w2.dedupe = w.dedupe and w2.created_at < w.created_at);
create unique index if not exists wa_messages_no_order_key on wa_messages(kind, dedupe) where order_id is null;
