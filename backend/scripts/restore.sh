#!/bin/bash
# restore.sh - Disaster Recovery Restore Script
# Downloads a specific database backup from S3 and restores it.
# Usage: ./restore.sh <filename> <target_db_name>
# Example: ./restore.sh backup_tenant123_2026-06-25_02-00.sql.gz tenant123

set -e

# Change to the directory where the script is located
cd "$(dirname "$0")"

# Load environment variables
if [ -f "../.env" ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

FILENAME=$1
TARGET_DB=$2

if [ -z "$FILENAME" ] || [ -z "$TARGET_DB" ]; then
  echo "Usage: $0 <filename> <target_db_name>"
  echo "Example: $0 backup_tenant123_2026-06-25_02-00.sql.gz tenant123"
  exit 1
fi

S3_BUCKET="${BACKUP_S3_BUCKET:-my-backup-bucket}"
FILEPATH="/tmp/$FILENAME"
UNCOMPRESSED_FILE="/tmp/${FILENAME%.gz}"

echo "1. Downloading $FILENAME from S3..."
aws s3 cp "s3://${S3_BUCKET}/${FILENAME}" "$FILEPATH"

echo "2. Decompressing backup file..."
gzip -d "$FILEPATH"

# Connect via psql using superuser credentials from .env
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASSWORD:-}

export PGPASSWORD=$DB_PASS

echo "3. Terminating active connections to $TARGET_DB..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET_DB';"

# Ensure database exists
echo "4. Ensuring target database exists..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$TARGET_DB\";" || true

echo "5. Restoring database $TARGET_DB..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET_DB" < "$UNCOMPRESSED_FILE"

echo "6. Verifying restore (row counts)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET_DB" -c "
SELECT relname as table_name, n_live_tup as estimated_row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;"

echo "Cleaning up local files..."
rm -f "$UNCOMPRESSED_FILE"

echo "✅ Restore completed successfully."
