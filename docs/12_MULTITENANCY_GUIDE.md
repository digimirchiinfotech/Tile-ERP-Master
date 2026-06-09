# Multi-Tenancy Architecture Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## What is Multi-Tenancy?

**Multi-tenancy** means one application serves many independent organizations (tenants/companies) with complete data isolation. Each company's data is stored and queried separately, ensuring no company can access another's records.

### Benefits

- Cost-effective — shared infrastructure, lower per-tenant cost
- Centralized updates — one deployment serves all tenants
- Scalable — supports unlimited companies
- Automatic provisioning — new companies get a database automatically

### Challenges

- Enforcing strict data isolation in every query
- Managing per-tenant database connections efficiently
- Handling cross-tenant security without performance cost

---

## Architecture Overview

```
┌──────────────────────────────────────────┐
│       Tile Exporter Solution              │
│       (Multi-Tenant Application)          │
└──────────────────────────────────────────┘
                    ↓
        ┌──────────────────────┐
        │   Master Database    │
        │  tile_exporter_crm   │
        │  (companies table +  │
        │   credentials)       │
        └──────────────────────┘
          ↓          ↓          ↓
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │Company A │ │Company B │ │Company C │
    │ Database │ │ Database │ │ Database │
    │(Isolated)│ │(Isolated)│ │(Isolated)│
    └──────────┘ └──────────┘ └──────────┘
```

---

## Data Isolation Strategy

### Company-Based Row Isolation

Every business table includes a `company_id` column. All queries must filter by `company_id` derived from the authenticated user's session.

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  client_name VARCHAR(255) NOT NULL,
  -- Ensure cross-tenant uniqueness for document numbers
  UNIQUE(company_id, client_id)
);

CREATE INDEX idx_clients_company_id ON clients(company_id);
```

### JWT Token & Session Context

Every JWT access token carries the user's `company_id`. The system uses the `filterByCompany` middleware to extract this and set a `req.companyFilter` property used across all controllers.

### Centralized Filtering (middleware/auth.js)

The `filterByCompany` middleware is the primary defense against data leakage. It ensures that standard users can NEVER access data outside their assigned `companyId`.

```javascript
export const filterByCompany = async (req, res, next) => {
  const selectedCompanyHeader =
    req.headers["x-company-id"] || req.query.company_id;

  if (req.user.role === "super_admin") {
    req.companyFilter = selectedCompanyHeader || null;
  } else {
    // Regular user: Force strict restriction to their own company
    req.companyFilter = req.user.companyId;

    if (selectedCompanyHeader && selectedCompanyHeader !== req.user.companyId) {
      return next(new AppError("Unauthorized access", 404)); // Stealth 404 for security
    }
  }
  next();
};
```

---

## Implementation

### 1. Authentication Middleware (middleware/auth.js)

Verifies the JWT token and attaches company context to `req.user`.

```javascript
import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      companyId: decoded.companyId,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
```

### 2. Dynamic Database Router (middleware/dbRouter.js)

The system uses a middleware-based routing engine that resolves the database connection pool on a per-request basis. This is the heart of the multi-tenant isolation.

```javascript
import { getCompanyDB } from "../config/companyDatabaseRouter.js";

export const dbRouter = async (req, res, next) => {
  try {
    // 1. Determine company context
    // Priority: Header (for Super Admins) > JWT (for standard users)
    const companyId = req.headers["x-company-id"] || req.user?.companyId;

    if (!companyId && req.user?.role !== "super_admin") {
      return res.status(400).json({ error: "Company context required" });
    }

    // 2. Attach filtered connection pool to the request
    if (companyId) {
      req.db = await getCompanyDB(companyId);
      req.companyFilter = companyId;
    } else {
      // Super Admin global context (Master DB)
      req.db = masterPool;
      req.companyFilter = null;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Database routing failed" });
  }
};
```

### 3. Master Database Schema

```sql
-- Companies table — one record per tenant
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per-company database credentials
CREATE TABLE company_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  db_host VARCHAR(255) NOT NULL,
  db_port INTEGER NOT NULL DEFAULT 5432,
  db_name VARCHAR(255) NOT NULL,
  db_user VARCHAR(255) NOT NULL,
  db_password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Database Provisioning (utils/databaseProvisioning.js)

When a new company registers, the system automatically provisions an isolated PostgreSQL database and stores the credentials in the master database.

```javascript
export const provisionCompanyDatabase = async (companyData) => {
  // Step 1: Create company record in master DB
  const companyResult = await masterDB.query(
    `INSERT INTO companies (name, email, phone, address)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [
      companyData.name,
      companyData.email,
      companyData.phone,
      companyData.address,
    ],
  );
  const companyId = companyResult.rows[0].id;

  // Step 2: Create isolated PostgreSQL database
  const dbName = `tile_exporter_company_${companyId.replace(/-/g, "_")}`;
  await adminPool.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);

  // Step 3: Create a dedicated database user
  const dbUser = `te_user_${companyId.replace(/-/g, "_").substring(0, 20)}`;
  const dbPassword = generateSecurePassword();
  await adminPool.query(`CREATE USER "${dbUser}" WITH PASSWORD $1`, [
    dbPassword,
  ]);

  // Step 4: Grant full privileges
  await adminPool.query(
    `GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`,
  );

  // Step 5: Store credentials securely in master DB
  await masterDB.query(
    `INSERT INTO company_credentials
     (company_id, db_host, db_port, db_name, db_user, db_password)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [companyId, process.env.DB_HOST, 5432, dbName, dbUser, dbPassword],
  );

  // Step 6: Apply schema migrations to new database
  const companyDB = await getCompanyDB(companyId);
  await runMigrations(companyDB);

  return { companyId, dbName };
};
```

### 5. Controller Pattern with Context-Aware DB

Controllers no longer need to manually fetch the database pool. They simply use `req.db`, which is pre-configured by the `dbRouter` middleware.

```javascript
// controllers/clientController.js
export const getClients = async (req, res, next) => {
  try {
    // req.db is already connected to the correct tenant database
    const result = await req.db.query(
      `SELECT * FROM clients WHERE company_id = $1`,
      [req.companyFilter],
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};
```

---

## Security Considerations

### 1. Token Validation

Always verify that the `company_id` in the JWT matches the resource being accessed:

```javascript
// If a user somehow has another company's ID in a URL param, reject it
if (req.user.companyId !== req.params.companyId) {
  return res.status(403).json({ error: "Access denied" });
}
```

### 2. Parameterized Queries

Never interpolate variables directly into SQL strings:

```javascript
// CORRECT
await query("SELECT * FROM clients WHERE company_id = $1", [companyId]);

// WRONG — SQL injection risk
await query(`SELECT * FROM clients WHERE company_id = '${companyId}'`);
```

### 3. Credential Security

- Company database passwords are generated programmatically and stored in the master database
- Never log database credentials
- Rotate database passwords periodically
- Use TLS for all database connections in production

### 4. Database Row-Level Security (RLS) - Fully Enforced

PostgreSQL RLS is explicitly configured to provide an impenetrable database-layer defense against cross-tenant data leakage, particularly in complex `LEFT JOIN` queries where application-level filtering might fail.

```sql
ALTER TABLE export_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON export_invoices
  USING (company_id = current_setting('app.current_tenant', true)::uuid);
```

_Note: RLS is automatically applied to all tenant tables via the `src/database/enable_rls.js` migration script during deployment._### 5. Role-Based Access & Module Visibility (Frontend)

To unify the data-isolation strategy with the user interface, the UI leverages `frontend/src/config/rolePermissions.js`.
The `company_admin` role receives universal base access `['all']`. However, visibility is further gated by the company's active subscription metrics. For instance, the **Supplier Management** module explicitly relies on the **Proforma Order** module being enabled for the company. If `proforma_order` is active, `supplier_management` automatically maps as active for the Company Admin, solving cross-dependency visibility bugs.

### 6. Foreign Key Constraint Relaxation for Isolated Tenants

In physically isolated tenant databases (e.g., `tile_erp_company_parin_pvt_9199`), strict foreign key constraints on `created_by` and `updated_by` columns (referencing the `users` table) cause `400 Bad Request` errors. This occurs because user records exist in the **master database** but not in the **tenant-specific database**.

**Resolution:** The `created_by` and `updated_by` FK constraints have been dropped across all tenant databases using a bulk migration script (`drop_fk_all_tenants.js`). User references are maintained logically at the application layer rather than enforced at the database constraint level.

```sql
-- Example: Constraints dropped from proforma_invoices
ALTER TABLE proforma_invoices DROP CONSTRAINT IF EXISTS proforma_invoices_created_by_fkey;
ALTER TABLE proforma_invoices DROP CONSTRAINT IF EXISTS proforma_invoices_updated_by_fkey;
```

**Impact:** This eliminates cross-database reference violations while maintaining full audit trail integrity through application-level tracking.

---

## Multi-Company Administration

### Company Registration

```javascript
export const registerCompany = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const result = await provisionCompanyDatabase({
      name,
      email,
      phone,
      address,
    });

    res.status(201).json({
      success: true,
      data: {
        companyId: result.companyId,
        message: "Company database provisioned successfully",
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

### Company Health Check

```javascript
export const healthCheck = async (req, res) => {
  try {
    const { companyId } = req.user;
    const companyDB = await getCompanyDB(companyId);
    await companyDB.query("SELECT 1");
    res.json({ status: "healthy", company: companyId });
  } catch (error) {
    res.status(503).json({ status: "error", message: error.message });
  }
};
```

---

## Audit Logging

All significant data access and modifications are recorded for compliance:

```javascript
// middleware/auditLog.js
export const auditLog = (action) => async (req, res, next) => {
  await query(
    `INSERT INTO audit_logs (user_id, company_id, action, resource, ip_address, timestamp)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [req.user.id, req.user.companyId, action, req.path, req.ip],
  );
  next();
};
```

---

## Scaling for Growth

### Horizontal Scaling

For hundreds of companies:

1. **Shard databases** — group companies across multiple PostgreSQL instances by ID range
2. **Read replicas** — use RDS read replicas for analytics and reporting queries
3. **Connection pooling** — use PgBouncer between the app and PostgreSQL to limit total connections
4. **Caching** — add Redis for frequently-read master/reference data

### Performance Optimization

1. Ensure `company_id` indexes exist on every business table
2. Use `EXPLAIN ANALYZE` to identify slow queries
3. Implement query result caching for dashboards and analytics
4. Archive old records (soft-deleted or >3 years) to separate tables

### Infrastructure

- **Load balancing** — run multiple backend instances behind an AWS ALB or Nginx upstream
- **Auto-scaling** — use EC2 Auto Scaling Groups or Railway's auto-scale feature
- **Database** — AWS RDS Multi-AZ for automatic failover

---

## Best Practices

- Always filter every query by `company_id`
- Use parameterized queries — never string-concatenate user input into SQL
- Implement and test audit logging for compliance
- Test data isolation rigorously — create two companies and verify each cannot read the other's data
- Monitor per-company database performance with CloudWatch or similar
- Use encrypted database connections (SSL) in production
- Document any code that crosses tenant boundaries
- Avoid strict FK constraints on `created_by`/`updated_by` in isolated tenant databases — use application-level references instead
- Use the Backup & Restore system (`/api/backups`) to create safety snapshots before schema migrations across tenant databases
