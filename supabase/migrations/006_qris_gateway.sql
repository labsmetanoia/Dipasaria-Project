-- QRIS payments with automatic confirmation through Midtrans (November 2026).
-- Run once on a project created from an earlier schema.sql, then re-run supabase/schema.sql
-- (it creates the payments table, record_gateway_payment(), and re-applies row-level security).
-- Nothing to migrate: existing orders keep the manual QRIS/transfer flow until a QR code is issued for them.
select 1;
