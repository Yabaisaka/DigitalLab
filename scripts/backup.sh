#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
backup_dir="${1:-backups/$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$backup_dir"
# Stop writes to make the database dump and file snapshot consistent.
docker compose stop app
trap 'docker compose start app >/dev/null' EXIT
docker compose exec -T db pg_dump -U digitallab -d digitallab -Fc > "$backup_dir/database.dump"
docker compose run --rm --no-deps -T --user root --entrypoint tar app -C /app/uploads -czf - . > "$backup_dir/uploads.tar.gz"
printf 'Backup saved: %s\n' "$backup_dir"
