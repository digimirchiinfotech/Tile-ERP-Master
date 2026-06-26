# Disaster Recovery & Backup Strategy

This document outlines the disaster recovery (DR) procedures and backup strategy for the newname system. Because the system utilizes a multi-tenant database-per-tenant architecture, backups must comprehensively capture both the master orchestrator database and all isolated tenant databases.

## 1. Backup Schedule & Retention Policy

Automated backups are scheduled to run off-hours to minimize performance impact on the live system.

- **Schedule**: Daily full backup at **2:00 AM IST** via cron.
- **Scope**: Master DB + every active tenant DB registered in the `companies` table.
- **Storage**: AWS S3 (or S3-compatible alternatives like Cloudflare R2 / Backblaze B2).
- **Compression**: gzip (`.sql.gz`).

### Retention Policy
We employ a standard Grandfather-Father-Son (GFS) retention scheme configured at the S3 bucket lifecycle policy level:
- **Daily Backups**: Kept for 30 days.
- **Weekly Backups**: Kept for 12 weeks.
- **Monthly Backups**: Kept for 3 months.

## 2. Recovery Objectives

- **Recovery Time Objective (RTO)**: Target < 1 hour.
  *This is the maximum acceptable time to restore service after a disruption.*
- **Recovery Point Objective (RPO)**: Target < 24 hours.
  *In a worst-case complete infrastructure loss, up to 24 hours of data could be lost (since the last 2 AM backup).*

## 3. Environment Variables

To enable backups, ensure the following environment variables are set in your `.env` file (or Railway variables):
```env
BACKUP_S3_BUCKET=your-bucket-name
BACKUP_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## 4. How to Trigger a Manual Backup

If you need to perform maintenance or apply risky migrations, always trigger a manual backup first:

```bash
cd backend/scripts
chmod +x backup.sh
./backup.sh
```
This script dynamically fetches all tenant databases (including newly added ones), dumps them, uploads them to S3, deletes the local files, and sends a notification email via SMTP.

## 5. How to Restore a Database

In the event of accidental data loss (e.g., a dropped table) for a specific tenant, you can restore that tenant's isolated database without affecting the rest of the SaaS platform.

1. Locate the backup file in S3 (e.g., `backup_tenant_123_2026-06-25_02-00.sql.gz`).
2. Run the restore script:

```bash
cd backend/scripts
chmod +x restore.sh
./restore.sh backup_tenant_123_2026-06-25_02-00.sql.gz tenant_123
```

This script will:
- Download the specified backup from S3.
- Decompress it.
- Terminate any active connections to the target database.
- Drop and recreate the database if necessary, then run the restore.
- Print estimated row counts for the top 10 tables to verify success.
