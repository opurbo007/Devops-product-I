#!/bin/sh
# Creates one logical database per service (the shared Prisma schema is
# migrated into each of them; services only touch their own tables).
set -e
for db in inventory shipping payment notification cart; do
  if ! psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE \"$db\""
    echo "created database $db"
  fi
done
