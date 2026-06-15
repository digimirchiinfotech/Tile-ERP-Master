#!/bin/bash
 
 # ==========================================================================
 # TILE EXPORTER SAAS - MULTI-TENANT BACKUP SYSTEM
 # This script backs up the Master DB and ALL isolated tenant databases.
 # ==========================================================================
 
 BACKUP_DIR="/var/backups/tile-exporter/$(date +%Y-%m-%d_%H-%M)"
 MASTER_DB="tile_exporter_master"
 DB_USER="postgres"
 
 mkdir -p "$BACKUP_DIR"
 
 echo "📂 Starting Full SaaS Backup to $BACKUP_DIR..."
 
 # 1. Backup Master Database
 echo "💎 Backing up Master Database..."
 pg_dump -U $DB_USER $MASTER_DB > "$BACKUP_DIR/master_db_backup.sql"
 
 # 2. Identify and Backup All Tenant Databases
 echo "👥 Identifying Tenant Databases..."
 
 # We query the master database to find all unique 'db_name' entries
 TENANT_DBS=$(psql -U $DB_USER -d $MASTER_DB -t -c "SELECT DISTINCT db_name FROM companies WHERE db_name IS NOT NULL AND db_name != '';")
 
 for DB in $TENANT_DBS; do
     echo "📦 Backing up Tenant: $DB..."
     pg_dump -U $DB_USER $DB > "$BACKUP_DIR/tenant_$DB.sql"
 done
 
 # 3. Compress for storage
 echo "📦 Compressing backup..."
 tar -czf "$BACKUP_DIR.tar.gz" -C "/var/backups/tile-exporter" "$(date +%Y-%m-%d_%H-%M)"
 rm -rf "$BACKUP_DIR"
 
 echo "✅ BACKUP COMPLETE: $BACKUP_DIR.tar.gz"
 echo "💡 TIP: Add this script to crontab -e to run every night at 2:00 AM."
