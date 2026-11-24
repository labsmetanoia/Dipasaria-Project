-- Restaurant sales kit and virtual-account transfers (November 2026). Run once on an existing project, then re-run
-- supabase/schema.sql (it adds the constraints and the functions record_gateway_payment, record_refund and
-- accept_quote). No seed changes.
alter table payments alter column order_id drop not null;
alter table payments add column if not exists account_id text references business_accounts(id) on delete cascade;
alter table payments add column if not exists va_bank text;
alter table payments add column if not exists va_number text;

create table if not exists refunds (
  id text primary key default new_id('rf'),
  order_id text not null references orders(id) on delete cascade,
  claim_id text references claims(id) on delete set null,
  amount numeric not null check (amount > 0 and amount <= 1000000000),
  refunded_on date not null,
  method text not null check (method in ('transfer','cash','qris','va','other')),
  reference text not null default '',
  proof text,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table business_accounts add column if not exists npwp text;
alter table business_accounts add column if not exists tax_name text;
alter table business_accounts add column if not exists tax_address text;
alter table settings add column if not exists npwp text;
alter table settings add column if not exists legal_name text;

create table if not exists quotes (
  id text primary key default new_id('qt'),
  code text not null unique,
  account_id text references business_accounts(id) on delete set null,
  business_name text not null check (length(business_name) between 2 and 120),
  contact_name text not null default '',
  phone text not null default '',
  address text not null default '',
  business_type text not null default '',
  npwp text,
  tax_name text,
  tax_address text,
  lines jsonb not null default '[]'::jsonb,
  valid_until date not null,
  price_from date not null,
  price_to date,
  note text not null default '',
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  accepted_at timestamptz,
  accepted_name text,
  created_at timestamptz not null default now(),
  check (price_to is null or price_to >= price_from)
);
