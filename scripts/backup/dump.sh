#!/usr/bin/env bash
# Dump the shop's data (everything in the public schema: orders, products, accounts, settings, functions, policies)
# from DATABASE_URL into a compressed custom-format file. Row counts are taken first, so the restore check can prove
# the dump holds at least that much.
# Usage: DATABASE_URL=postgresql://… bash scripts/backup/dump.sh <out-dir>
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL (Supabase → Connect → Session pooler connection string)}"
OUT=${1:-backup}
mkdir -p "$OUT"
STAMP=$(date -u +%Y%m%d-%H%M)
FILE="$OUT/dipasaria-$STAMP.dump"

psql "$DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "select json_build_object(
  'orders', (select count(*) from public.orders), 'order_items', (select count(*) from public.order_items),
  'business_accounts', (select count(*) from public.business_accounts), 'products', (select count(*) from public.products),
  'variants', (select count(*) from public.variants), 'settings', (select count(*) from public.settings))" > "$OUT/counts.json"

pg_dump "$DATABASE_URL" --schema=public --no-owner --no-privileges --format=custom --compress=9 --file "$FILE"
pg_restore --list "$FILE" > /dev/null # the archive's table of contents must be readable
echo "Dump: $FILE ($(du -h "$FILE" | cut -f1)); counts at start: $(cat "$OUT/counts.json")"
