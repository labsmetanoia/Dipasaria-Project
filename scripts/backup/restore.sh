#!/usr/bin/env bash
# Disaster recovery: restore an encrypted backup into a NEW, EMPTY Supabase project.
#   1. Create a new Supabase project. Copy its Session pooler connection string (Connect → Session pooler).
#   2. Download the backup artifact from GitHub (Actions → Daily database backup → latest run → Artifacts) and unzip it.
#   3. Run:  BACKUP_PASSPHRASE='…' TARGET_DATABASE_URL='postgresql://…' bash scripts/backup/restore.sh dipasaria-YYYYMMDD-HHMM.dump.gpg
#   4. In the new project: Authentication → add your admin user, then in SQL run
#        insert into admins (user_id, label) values ('<user uuid>', 'Pemilik') on conflict do nothing;
#   5. Point Vercel's NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY at the new project; redeploy.
set -euo pipefail
: "${BACKUP_PASSPHRASE:?Set BACKUP_PASSPHRASE (the one stored in GitHub secrets / your password manager)}"
: "${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL to the connection string of the NEW project}"
SRC=${1:?Path to dipasaria-….dump.gpg}
n=$(psql "$TARGET_DATABASE_URL" -X -At -c "select count(*) from information_schema.tables where table_schema = 'public'")
if [ "$n" != "0" ]; then echo "The target database already has $n tables in public. Restore only into a new, empty project." >&2; exit 1; fi
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
printf '%s' "$BACKUP_PASSPHRASE" | gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 0 --decrypt --output "$TMP/backup.dump" "$SRC"
pg_restore --no-owner --no-privileges --dbname "$TARGET_DATABASE_URL" "$TMP/backup.dump" 2> "$TMP/restore.log" || true
if grep -v 'schema "public" already exists' "$TMP/restore.log" | grep -E "error:" > /dev/null; then cat "$TMP/restore.log"; exit 1; fi
psql "$TARGET_DATABASE_URL" -X -At -c "select 'orders: ' || count(*) from orders"
echo "Restored. Continue with steps 4 and 5 at the top of this file."
