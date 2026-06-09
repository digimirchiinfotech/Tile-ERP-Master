# Troubleshooting & FAQ Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Quick Reference

| Problem                      | First Step                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Cannot log in                | Verify admin credentials were printed during `node src/database/seed.js`       |
| Backend not starting         | Check `backend/.env` exists and `DATABASE_URL` / `DB_*` variables are set      |
| Database error               | Ensure PostgreSQL is running and the database `tile_exporter_crm` exists       |
| Frontend not loading         | Ensure both servers are running (port 5000 and 8000)                           |
| API returns 401              | Token expired — log out and log in again                                       |
| API returns 403              | Your role does not have access to this action                                  |
| PDF not generating           | Check backend logs for missing template or font errors                         |
| Migrations failed            | Check SQL syntax in migration files; run `node src/database/migrate.js` again  |
| 400 on Proforma Invoice save | FK constraint issue in isolated tenant DB — see "Foreign Key Relaxation" below |
| Module loading error in UI   | Hard refresh browser (Ctrl+F5) — Vite HMR chunk mismatch                       |

---

## Installation & Setup Issues

### npm install fails with permission errors

**Symptom:**

```
npm ERR! eacces: permission denied
```

**Solutions:**

Option A — Fix npm global permissions:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install
```

Option B — Use NVM (recommended for local development):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
npm install
```

---

### PostgreSQL connection refused

**Symptom:**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution — start PostgreSQL:**

```bash
# Windows
net start postgresql-x64-15

# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

Verify it is running:

```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

---

### Database "tile_exporter_crm" does not exist

**Symptom:**

```
FATAL: database "tile_exporter_crm" does not exist
```

**Solution:**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE tile_exporter_crm;

# Exit
\q

# Run migrations
cd backend
node src/database/migrate.js
```

---

### Migrations fail to run

**Symptom:**

```
Error running migration: ...
```

**Steps:**

1. Verify the database exists (see above)
2. Check that `DB_*` or `DATABASE_URL` is correctly set in `backend/.env`
3. Run the migration command from inside the `backend/` directory:
   ```bash
   cd backend
   node src/database/migrate.js
   ```
4. Review the specific SQL error message in the console output
5. If a migration partially applied, you may need to manually fix the table state in psql before re-running

---

## Port & Network Issues

### Port already in use

**Symptom:**

```
Error: listen EADDRINUSE: address already in use :::8000
```

**Solution — find and kill the conflicting process:**

```bash
# macOS/Linux
lsof -i :8000
kill -9 <PID>

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

Or change the port in `backend/.env`:

```bash
PORT=8001
```

---

### Frontend cannot reach backend API

**Symptom:**

```
GET /api/clients — Network Error or 404
```

**Steps:**

1. Verify the backend is running and responding:
   ```bash
   curl http://localhost:8000/health
   ```
2. Check that `frontend/vite.config.js` has the proxy configured:
   ```javascript
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:8000',
         changeOrigin: true
       }
     }
   }
   ```
3. Check `frontend/.env` has `VITE_API_BASE_URL=/api`
4. Restart both servers

---

## Authentication Issues

### Login fails with "Invalid credentials"

**Symptom:**

```json
{ "error": "Invalid credentials" }
```

**Steps:**

1. Check what credentials were set during seeding — review the output of `node src/database/seed.js`
2. The default admin email is `admin@admin.com`; the password is whatever was set during seeding
3. Verify the user exists in the database:
   ```sql
   SELECT id, email_id, role, status FROM users WHERE email_id = 'admin@admin.com';
   ```
4. If the user status is not `active`, update it:
   ```sql
   UPDATE users SET status = 'active' WHERE email_id = 'admin@admin.com';
   ```

---

### Account locked — too many failed login attempts

**Symptom:**

```json
{ "error": "Account temporarily locked" }
```

**Solution — unlock in the database:**

```sql
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE email_id = 'your@email.com';
```

---

### Token expired — 401 Unauthorized

**Symptom:**

```json
{ "error": "Invalid token" }
```

The frontend automatically refreshes tokens. If you still get 401:

1. Log out and log back in
2. Check that `localStorage` has valid `accessToken` and `refreshToken` values
3. Verify the JWT_SECRET in `backend/.env` has not changed since the token was issued

Manual token refresh:

```javascript
const response = await api.post("/auth/refresh-token", {
  refreshToken: localStorage.getItem("refreshToken"),
});
localStorage.setItem("accessToken", response.data.data.accessToken);
```

---

### Cannot change password

Use the profile page in the UI, or reset directly in the database:

```sql
-- The password_hash value must be a bcrypt hash
-- Generate one at: https://bcrypt-generator.com/ (12 rounds)
UPDATE users
SET password_hash = '$2b$10$<generated_hash>'
WHERE email_id = 'your@email.com';
```

---

## Data & Database Issues

### Data not persisting after refresh

**Steps:**

1. Open the browser Network tab — verify the POST/PUT request returned HTTP 201/200
2. Check the database directly:
   ```sql
   SELECT COUNT(*) FROM clients;
   ```
3. Check the backend console for any insert errors
4. Confirm the database in `backend/.env` matches the one you are inspecting

---

### Duplicate key error

**Symptom:**

```
Error: duplicate key value violates unique constraint
```

**Solution:**

```sql
-- Find the duplicate
SELECT * FROM clients WHERE client_email = 'duplicate@example.com';
-- Delete or update the duplicate record, then retry
```

---

### API returns empty data `[]`

**Possible causes:**

1. Data was created under a different `company_id` — check the JWT token's `company_id` matches the data
2. Records were soft-deleted (`deleted_at IS NOT NULL`)
3. Search/filter parameters are too restrictive

Check in psql:

```sql
SELECT id, client_name, deleted_at FROM clients LIMIT 20;
```

---

## API & Backend Issues

### 500 Internal Server Error

**Steps:**

1. Check the backend terminal output for the full stack trace
2. Common causes:
   - Database not connected or query error
   - Missing required environment variable
   - Invalid SQL (column name mismatch after migration)
3. Check `.env` is complete and correct
4. Restart the backend: `npm start`

---

### API returns 403 Forbidden

**Symptom:**

```json
{ "success": false, "error": "Access denied" }
```

Your user's role does not have permission for this action. Either:

- Use an account with the required role (e.g., `super_admin` or `company_admin`)
- Ask your system administrator to update your role

---

### PDF generation fails

**Steps:**

1. Check backend logs for the specific error
2. Ensure the `uploads/` directory exists and is writable
3. Verify there is a PDF template configured in System Settings → PDF Templates
4. Check that all required fields on the document are populated

---

## Frontend Issues

### Page shows blank or loading forever

**Steps:**

1. Open browser DevTools → Console — look for JavaScript errors
2. Open browser DevTools → Network — look for failing API requests
3. Hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (macOS)
4. Clear cache:
   ```javascript
   // Browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

---

### Styles not loading / broken layout

```bash
cd frontend
rm -rf node_modules dist
npm install
npm run dev
```

---

### Global search returns no results

1. Minimum query length is 2 characters
2. Data must exist for your company
3. Verify the backend `/api/global-search` endpoint is responding:
   ```bash
   curl "http://localhost:8000/api/global-search?q=test" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Production Deployment Issues

### Frontend shows blank page in production

1. Verify environment variable in your hosting provider:
   ```
   VITE_API_BASE_URL=https://api.yourdomain.com/api
   ```
2. Rebuild and redeploy the frontend
3. Clear browser cache and hard refresh

---

### Backend crashes in production (502/503)

1. Check your hosting provider logs
2. Verify all environment variables are set (especially `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`)
3. Verify the database is accessible from the production server
4. Restart the deployment / PM2 process:
   ```bash
   pm2 restart tile-backend
   pm2 logs tile-backend
   ```

---

## FAQ

### Q: How do I reset the entire database?

```bash
psql -U postgres -c "DROP DATABASE tile_exporter_crm;"
psql -U postgres -c "CREATE DATABASE tile_exporter_crm;"
cd backend
node src/database/migrate.js
node src/database/seed.js
```

### Q: How do I add a new user?

Use the Users module in the UI (requires `super_admin` or `company_admin` role), or via the API:

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email_id":"jane@example.com","password":"Password@123","role":"sales_executive"}'
```

### Q: How do I backup the database?

The system includes a built-in **Enterprise Backup & Restore** module accessible from **Profile Settings → Backup & Restore**.

**Via the UI:**

1. Navigate to Profile Settings → Backup & Restore tab
2. Click "Create Backup Now" for an instant full backup
3. Enable auto-backups with Daily/Weekly/Monthly schedules
4. Download, restore, or delete backups from the Backup History table

**Via the API:**

```bash
# Create a manual backup
curl -X POST http://localhost:8000/api/backups/create \
  -H "Authorization: Bearer YOUR_TOKEN"

# List all backups
curl http://localhost:8000/api/backups/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Via CLI (legacy method):**

```bash
# Dump the database
pg_dump -U postgres tile_exporter_crm > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U postgres tile_exporter_crm < backup_20260226.sql
```

### Q: What are the system requirements?

- Node.js v20+
- PostgreSQL v13+
- npm v9+
- 4 GB RAM minimum
- 2 GB storage

### Q: How do I run migrations?

```bash
cd backend
node src/database/migrate.js
```

### Q: How do I add a new module?

1. Create a migration SQL file in `backend/src/database/migrations/`
2. Run `node src/database/migrate.js`
3. Create a controller in `backend/src/controllers/`
4. Create a validator in `backend/src/validators/`
5. Create a route file in `backend/src/routes/`
6. Register the route in `backend/src/server.js`
7. Create React components in `frontend/src/pages/` and/or `frontend/src/components/`
8. Add navigation entry in `frontend/src/components/shared/Sidebar.jsx`
9. Add RBAC permissions in `frontend/src/config/rolePermissions.js`

### Q: Is there API documentation?

Yes — Swagger UI is available at: **http://localhost:8000/api/docs**  
Full route reference: `docs/09_ROUTES_DOCUMENTATION.md`

### Q: How many users/companies can the system support?

- Single PostgreSQL instance: typically 50–200 concurrent users
- With connection pooling and proper indexes: 500+ users
- Multi-tenant: unlimited companies — each company's data is isolated by `company_id`

### Q: Where are uploaded files stored?

In the `backend/uploads/` directory during development.  
In production, configure object storage (S3 or compatible) via environment variables.

### Q: Can the system send emails?

Yes — configure SMTP credentials in `backend/.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@yourdomain.com
```

---

## Recent System Fixes & Special Behaviors

### Q: Why did the date picker (e.g. LUT Date) shift back by one day on save?

**Symptom:** Saving date parameters in forms resulted in an off-by-one day reduction on reload.  
**Cause:** The frontend date serialization converted the local calendar date to UTC, causing negative timezone offsets (e.g., in IST or EST) to shift the day back.  
**Resolution:** Date inputs are standardized to transmit in pure string format (`YYYY-MM-DD`) directly without applying local timezone offsets.

### Q: Why is text automatically converted to UPPERCASE upon typing or saving?

**Behavior:** To maintain consistency across export shipping bills, packing lists, and regulatory invoices, a centralized middleware transforms all text input fields to uppercase.  
**Exceptions:** Sensitivity filters protect specific fields. The following remain cased:

- Email fields
- Passwords
- API endpoints / URLs
- UUIDs and tokens

### Q: Why does creating a Proforma Invoice return `400 Bad Request`?

**Symptom:** `proforma_invoices_created_by_fkey` foreign key violation.  
**Cause:** In isolated tenant databases, the `created_by` column references `users(id)`, but the authenticated user's record exists only in the master database, not in the tenant-specific database.  
**Resolution:** The `created_by` and `updated_by` FK constraints have been dropped across all isolated tenant databases using `drop_fk_all_tenants.js`. User references are tracked at the application level instead.

### Q: The Backup Settings page crashes with "Failed to load module"

**Symptom:** `ReferenceError: Alert is not defined` in `BackupSettings.jsx`.  
**Cause:** The `Alert` component from `react-bootstrap` was not included in the import statement.  
**Resolution:** Added `Alert` to the `react-bootstrap` import in `BackupSettings.jsx`.

### Q: Why are mandatory field labels now black instead of red?

**Behavior:** As of v4.1.0, all mandatory form field labels (`text-danger` on `<Form.Label>`) are rendered in professional dark text (`#1e293b`) instead of red, matching enterprise ERP standards (SAP, Oracle Cloud). Validation error messages and invalid field borders remain red for clear error visibility.

---

## Still Stuck?

Work through this checklist:

1. Check all `backend/.env` variables are set and correct
2. Verify both the backend (port 8000) and frontend (port 5000) are running
3. Check the backend terminal for error messages or stack traces
4. Open browser DevTools → Console and Network for frontend errors
5. Connect to the database via `psql` and confirm the data is there
6. Try restarting both servers
7. Delete `node_modules` and run `npm install` again
8. Review the relevant documentation file in `docs/`

The most common root causes are:

- A missing or incorrect environment variable in `backend/.env`
- PostgreSQL is not running or the database name is wrong
- Migrations have not been run after a schema change
- A port conflict with another process
