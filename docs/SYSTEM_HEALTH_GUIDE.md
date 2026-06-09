# SaaS System Health & Monitoring Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

Active infrastructure monitoring is critical when hosting 100+ clients with physically isolated database schemas on a single cluster. Use this guide to ensure high availability and prevent resource exhaustion.

---

## 🩺 1. API Endpoint Health Diagnostics

### **Master Gateway Status**

Query `https://app.yourdomain.com/health` (or your backend port `/health` endpoint):

- **Healthy State:** Returns `{"status": "healthy", "database": "connected", "timestamp": "2026-05-17T..."}`.
- **Degraded State:** If a `503 Service Unavailable` is returned, the backend gateway can no longer reach or authenticate with the `tile_exporter_master` coordinator database.

### **Active Connection Audits**

Run this SQL query on your PostgreSQL cluster to monitor active database connection counts per company:

```bash
sudo -u postgres psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname ORDER BY count DESC;"
```

If any single company database maintains close to 100 open active handlers, verify that:

1.  **PgBouncer** transaction pooling (`pool_mode = transaction`) is running properly.
2.  Idle connections are successfully closing via backend connection cache timeouts.

---

## 📜 2. Logs & Diagnostic Auditing

All system events are logged under `backend/logs/`:

- **`error.log`**: Checked daily for HTTP 500 exceptions, query failures, or tenant database route timeouts.
- **`combined.log`**: Tracks overall HTTP API traffic and request rates.

**💡 Tip:** Run `pm2 monit` on the host to monitor CPU usage, memory foot print, and real-time thread safety across all tenant connection pools.

---

## 💾 3. Storage & Document Space Warnings

Because each company can generate extensive high-fidelity A4 print PDF documents, monitor disk capacity proactively:

- **Check Disk Space:** `df -h`
- **Purge Backups:** Every 30 days, clean up or archive compressed historical dumps to off-site cloud storage.
- **Clean Uploads:** Periodically review `/uploads/` to remove unlinked or orphaned business logo files.

---

## 🚨 4. Database Self-Healing & Emergency Syncs

If a company reports database schema issues, missing columns, or dynamic lock conversion errors:

1.  **Run Core Tenant Schemas Audit:** Automatically inspect and repair all dynamic database schemas:
    ```bash
    cd /var/www/tile-exporter/backend
    node src/scripts/sync-tenant-db.js
    ```
    This script queries every registered company database, running structural checks and patching missing status parameters in real-time.
2.  **Verify Router Settings:** Check the `companies` coordinator table to ensure the tenant's `db_name` and encrypted credentials are valid.
3.  **Inspect Dynamic Document Locks:** If a document is incorrectly locked, query the database to verify the child reference fields (`is_used`, `is_converted`, `linked_document_id`) match the downstream pipeline state.

---

**Following this guide helps you resolve technical friction proactively before clients experience service disruption.**
