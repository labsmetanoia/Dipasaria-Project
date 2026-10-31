#!/usr/bin/env bash
# Runs supabase/schema.sql + seed.sql + scripts/sql-tests.sql against a PostgreSQL server.
# Set PGHOST/PGPORT/PGUSER (defaults: local socket, postgres). Needs psql.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-dipasaria_test}
psql -v ON_ERROR_STOP=1 -d postgres -qc "drop database if exists $DB" -qc "create database $DB"
# Stand-ins for Supabase-managed objects so the schema loads on plain PostgreSQL.
psql -v ON_ERROR_STOP=1 -d "$DB" -q <<'SQL'
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
SQL
psql -v ON_ERROR_STOP=1 -d "$DB" -q -f supabase/schema.sql
psql -v ON_ERROR_STOP=1 -d "$DB" -q -f supabase/seed.sql
psql -v ON_ERROR_STOP=1 -d "$DB" -q -f scripts/sql-tests.sql
echo "SQL tests passed."
