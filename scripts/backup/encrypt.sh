#!/usr/bin/env bash
# Encrypt the dump with a passphrase (AES-256, GnuPG) and delete the plain copy.
# Usage: BACKUP_PASSPHRASE=… bash scripts/backup/encrypt.sh <dir-with-dump>
set -euo pipefail
: "${BACKUP_PASSPHRASE:?Set BACKUP_PASSPHRASE}"
DIR=$1
DUMP=$(ls -1 "$DIR"/dipasaria-*.dump | tail -n 1)
printf '%s' "$BACKUP_PASSPHRASE" | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 0 \
  --symmetric --cipher-algo AES256 --output "$DUMP.gpg" "$DUMP"
rm -f "$DUMP"
echo "Encrypted: $DUMP.gpg ($(du -h "$DUMP.gpg" | cut -f1))"
