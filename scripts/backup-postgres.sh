#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL este obligatoriu pentru backup." >&2
  exit 1
fi

mkdir -p backups
timestamp="$(date +%Y%m%d-%H%M%S)"
pg_dump "$DATABASE_URL" > "backups/eveniment-app-$timestamp.sql"
echo "Backup creat: backups/eveniment-app-$timestamp.sql"
