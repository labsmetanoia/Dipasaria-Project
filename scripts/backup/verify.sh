#!/usr/bin/env bash
# Prove a dump can be restored: load it into an EMPTY throwaway database and compare row counts with counts.json.
# Usage: bash scripts/backup/verify.sh <dir-with-dump> <throwaway-database-url>
set -euo pipefail
DIR=$1
TARGET=$2
DUMP=$(ls -1 "$DIR"/dipasaria-*.dump | tail -n 1)

# Stand-ins for what Supabase provides (auth.uid(), its roles, pgcrypto), so the schema loads on plain PostgreSQL.
psql "$TARGET" -X -q -v ON_ERROR_STOP=1 <<'SQL'
create extension if not exists pgcrypto;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
SQL

# The public schema already exists in any new database; that one notice is expected, anything else fails the check.
pg_restore --no-owner --no-privileges --dbname "$TARGET" "$DUMP" 2> "$DIR/restore.log" || true
if grep -v 'schema "public" already exists' "$DIR/restore.log" | grep -qE "error:"; then
  echo "Restore failed:"; cat "$DIR/restore.log"; exit 1
fi

RESTORED=$(psql "$TARGET" -X -At -v ON_ERROR_STOP=1 -c "select json_build_object(
  'orders', (select count(*) from public.orders), 'order_items', (select count(*) from public.order_items),
  'business_accounts', (select count(*) from public.business_accounts), 'products', (select count(*) from public.products),
  'variants', (select count(*) from public.variants), 'settings', (select count(*) from public.settings))")
echo "$RESTORED" > "$DIR/restored-counts.json"
python3 - "$DIR/counts.json" "$DIR/restored-counts.json" <<'PY'
import json, sys
before, after = (json.load(open(p)) for p in sys.argv[1:3])
bad = [k for k in before if after.get(k, -1) < before[k]]
if after.get("settings") != 1 or after.get("products", 0) == 0: bad.append("settings/products empty")
print("counts at start:", before); print("restored counts:", after)
if bad: sys.exit(f"Restored database is missing rows: {bad}")
print("Verified: the backup restores completely.")
PY
# The schema's own functions must work after restore (catches a dump that lost functions or policies).
psql "$TARGET" -X -At -v ON_ERROR_STOP=1 -c "select public.random_code(4)" > /dev/null
