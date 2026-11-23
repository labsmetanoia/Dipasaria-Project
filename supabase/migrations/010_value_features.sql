-- Delivery mode, freshness-guarantee claims, substitution preference, back-in-stock alerts and the dawn buying log
-- (November 2026). Run once on an existing project, then re-run supabase/schema.sql (it creates the new tables and
-- functions and re-applies row-level security).
alter table orders add column if not exists substitution text not null default 'contact';
alter table orders add column if not exists delivered_at timestamptz;
alter table orders add column if not exists delivery_note text;
alter table orders add column if not exists cod_collected numeric;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_substitution_check') then
    alter table orders add constraint orders_substitution_check check (substitution in ('similar','contact','remove'));
  end if;
end $$;
-- WhatsApp outbox: back-in-stock alerts are not tied to an order; three new message kinds.
alter table wa_messages alter column order_id drop not null;
alter table wa_messages drop constraint if exists wa_messages_kind_check;
alter table wa_messages add constraint wa_messages_kind_check
  check (kind in ('received','invoice','paid','delivering','reminder','cancelled','standing','delivered','claim','restock'));
-- Switch the three new messages on for existing projects (they can be switched off in Pengaturan).
update settings set wa_events = wa_events || array['delivered','claim','restock'] where not (wa_events @> array['delivered']);
