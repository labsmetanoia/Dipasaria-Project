-- Automatic WhatsApp notifications (November 2026). Run once on a project created from an earlier schema.sql,
-- then re-run supabase/schema.sql (it creates the wa_messages outbox and updates place_order).
alter table settings add column if not exists wa_events text[] not null default array['received','invoice','paid','delivering','reminder','cancelled','standing'];
alter table orders add column if not exists wa_opt_in boolean not null default true;
