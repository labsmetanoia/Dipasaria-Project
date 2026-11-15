#!/usr/bin/env bash
# End-to-end test of the backup scripts on a local PostgreSQL: dump → verify (restore + counts) → encrypt → disaster
# restore, plus the failure cases (truncated dump, non-empty target, wrong passphrase).
# Needs psql/pg_dump/gpg and the database built by `npm run test:sql` (TEST_DB, default dipasaria_test).
set -euo pipefail
cd "$(dirname "$0")/../.."
SRC_DB=${TEST_DB:-dipasaria_test}
url() { echo "postgresql://${PGUSER:-postgres}@${PGHOST:-localhost}:${PGPORT:-5432}/$1"; }
WORK=$(mktemp -d)
cleanup() { for d in bk_t_verify bk_t_bad bk_t_restore; do dropdb --if-exists "$d" >/dev/null 2>&1 || true; done; rm -rf "$WORK"; }
trap cleanup EXIT
fail() { echo "FAIL: $1"; exit 1; }
for d in bk_t_verify bk_t_bad bk_t_restore; do dropdb --if-exists "$d" >/dev/null 2>&1; createdb "$d"; done

DATABASE_URL=$(url "$SRC_DB") bash scripts/backup/dump.sh "$WORK/b" >/dev/null
bash scripts/backup/verify.sh "$WORK/b" "$(url bk_t_verify)" >/dev/null || fail "verify of a good dump"
echo "ok: dump restores with matching row counts"
bash scripts/backup/verify.sh "$WORK/b" "$(url bk_t_verify)" >/dev/null 2>&1 && fail "restoring into a non-empty database was accepted"
echo "ok: restore into a non-empty database is rejected"
mkdir "$WORK/bad"; cp "$WORK/b/counts.json" "$WORK/bad/"; D=$(ls "$WORK"/b/dipasaria-*.dump); head -c 20000 "$D" > "$WORK/bad/$(basename "$D")"
bash scripts/backup/verify.sh "$WORK/bad" "$(url bk_t_bad)" >/dev/null 2>&1 && fail "a truncated dump passed verification"
echo "ok: a truncated dump fails verification"
BACKUP_PASSPHRASE='test passphrase 0123456789' bash scripts/backup/encrypt.sh "$WORK/b" >/dev/null
ls "$WORK"/b/dipasaria-*.dump >/dev/null 2>&1 && fail "plain dump left behind after encryption"
echo "ok: encrypted, plain copy removed"
# A new Supabase project already has auth.uid() and the roles: simulate that, then restore.
psql -q -d bk_t_restore -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
SQL
BACKUP_PASSPHRASE='wrong' TARGET_DATABASE_URL=$(url bk_t_restore) bash scripts/backup/restore.sh "$WORK"/b/*.gpg >/dev/null 2>&1 && fail "wrong passphrase accepted"
echo "ok: wrong passphrase is refused"
BACKUP_PASSPHRASE='test passphrase 0123456789' TARGET_DATABASE_URL=$(url bk_t_restore) bash scripts/backup/restore.sh "$WORK"/b/*.gpg >/dev/null || fail "disaster restore"
[ "$(psql -At -d bk_t_restore -c 'select count(*) from orders')" = "$(psql -At -d "$SRC_DB" -c 'select count(*) from orders')" ] || fail "restored order count differs"
echo "ok: disaster restore into a new database brings back every order"
BACKUP_PASSPHRASE='test passphrase 0123456789' TARGET_DATABASE_URL=$(url "$SRC_DB") bash scripts/backup/restore.sh "$WORK"/b/*.gpg >/dev/null 2>&1 && fail "restore over a live database was allowed"
echo "ok: restore refuses to write over an existing database"
echo "Backup tests passed."
