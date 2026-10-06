#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
restore_dir="${1:?Usage: bash scripts/restore.sh BACKUP_DIR --confirm-replace}"
if [[ "${2:-}" != '--confirm-replace' ]]; then
  printf 'Restore replaces the current database. Take a backup first, then use --confirm-replace.\n' >&2
  exit 1
fi
test -f "$restore_dir/database.dump"
test -f "$restore_dir/uploads.tar.gz"
docker compose stop app
# On failure, leave app stopped to avoid serving a partially restored archive.
docker compose exec -T db pg_restore -U digitallab -d digitallab --clean --if-exists --exit-on-error < "$restore_dir/database.dump"
docker compose run --rm --no-deps -T --user root --entrypoint tar app -C /app/uploads -xzf - < "$restore_dir/uploads.tar.gz"
docker compose run --rm --no-deps -T --user root --entrypoint chown app -R 1001:1001 /app/uploads
docker compose start app
printf 'Restore complete. Verify member login, an internal file and a public equipment page.\n'
