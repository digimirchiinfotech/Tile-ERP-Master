# Backend Development Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Overview

**Node.js + Express.js API server** for Tile Exporter Solution.

- Port: **8000**
- Database: PostgreSQL (via `pg` connection pool)
- Authentication: JWT (access token: 7d, refresh token: 30d)
- Authorization: RBAC with 11 roles + module-level access control
- Controllers: **43 controllers** covering all business domains
- Routes: **56 route files** registered in `server.js`

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js                  # PostgreSQL connection pool (pg)
│   │   ├── companyDatabaseRouter.js     # Per-tenant DB connection router
│   │   ├── env.js                       # Parsed environment config object
│   │   └── swagger.js                   # Swagger/OpenAPI definition
│   ├── controllers/                     # Business logic (43 controllers)
│   │   ├── accountEntryController.js
│   │   ├── backupController.js
│   │   ├── aiController.js
│   │   ├── analyticsController.js
│   │   ├── authController.js
│   │   ├── billOfLadingController.js
│   │   ├── bulkActionController.js
│   │   ├── bulkDeleteController.js
│   │   ├── catalogueController.js
│   │   ├── certificateController.js
│   │   ├── clientController.js
│   │   ├── clientOrderController.js
│   │   ├── companyController.js
│   │   ├── customsClearanceController.js
│   │   ├── dashboardController.js
│   │   ├── dataValidationController.js
│   │   ├── exportDocumentReferenceController.js
│   │   ├── exportInvoiceAnnexureController.js
│   │   ├── exportInvoiceController.js
│   │   ├── exportWorkflowInterconnectionController.js
│   │   ├── invoiceBacksideController.js
│   │   ├── leadController.js
│   │   ├── masterDataController.js
│   │   ├── notificationController.js
│   │   ├── packingListController.js
│   │   ├── palletController.js
│   │   ├── paymentController.js
│   │   ├── pdfTemplateController.js
│   │   ├── postShipmentDocController.js
│   │   ├── productController.js
│   │   ├── proformaInvoiceController.js
│   │   ├── proformaOrderController.js
│   │   ├── qcRecordController.js
│   │   ├── rateHistoryController.js
│   │   ├── reportController.js
│   │   ├── reportsController.js
│   │   ├── shippingInstructionController.js
│   │   ├── subscriptionController.js
│   │   ├── supplierController.js
│   │   ├── supportTicketController.js
│   │   ├── systemSettingsController.js
│   │   ├── userController.js
│   │   ├── vgmController.js
│   │   └── workflowController.js
│   ├── routes/                          # API route files (56 files)
│   │   ├── accountEntries.js
│   │   ├── admin.js
│   │   ├── admin-password-reset.js
│   │   ├── aiRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── backupRoutes.js
│   │   ├── auth.js
│   │   ├── billsOfLading.js
│   │   ├── bulkDeleteRoutes.js
│   │   ├── catalogues.js
│   │   ├── certificates.js
│   │   ├── clientOrders.js
│   │   ├── clients.js
│   │   ├── companies.js
│   │   ├── companyManagement.js
│   │   ├── csvExport.js
│   │   ├── csvImport.js
│   │   ├── customsClearances.js
│   │   ├── dashboardStats.js
│   │   ├── dev.js
│   │   ├── emailNotifications.js
│   │   ├── exportDocumentReferences.js
│   │   ├── exportInvoiceAnnexures.js
│   │   ├── exportInvoices.js
│   │   ├── exportWorkflowInterconnection.js
│   │   ├── global-search.js
│   │   ├── invoiceBacksides.js
│   │   ├── leads.js
│   │   ├── masterData.js
│   │   ├── messages.js
│   │   ├── notifications.js
│   │   ├── packingLists.js
│   │   ├── pallets.js
│   │   ├── paymentRoutes.js
│   │   ├── pdfTemplates.js
│   │   ├── postShipmentDocs.js
│   │   ├── products.js
│   │   ├── profile.js
│   │   ├── proformaInvoices.js
│   │   ├── proformaOrders.js
│   │   ├── qcRecords.js
│   │   ├── rateHistory.js
│   │   ├── reports.js
│   │   ├── search.js
│   │   ├── sessionRoutes.js
│   │   ├── shippingInstructions.js
│   │   ├── subscriptions.js
│   │   ├── suppliers.js
│   │   ├── supportTickets.js
│   │   ├── systemSettings.js
│   │   ├── users.js
│   │   ├── vgmRoutes.js
│   │   └── workflows.js
│   ├── middleware/                      # 16 middleware modules
│   │   ├── auditLog.js                  # Audit trail logging
│   │   ├── auth.js                      # JWT authentication
│   │   ├── csrf.js                      # CSRF token protection
│   │   ├── documentStatus.js            # Document status validation
│   │   ├── errorHandler.js              # Central error handling
│   │   ├── filterByCompany.js           # Multi-tenant data isolation
│   │   ├── fileUpload.js                # Multipart file upload
│   │   ├── inputValidation.js           # Input sanitization
│   │   ├── moduleAccess.js              # Module-level access control
│   │   ├── multerConfig.js              # Multer file upload config
│   │   ├── normalizeBody.js             # Body normalization
│   │   ├── performanceMonitor.js        # Request timing
│   │   ├── rbac.js                      # Role-based access control
│   │   ├── requestErrorHandler.js       # Request error formatting
│   │   ├── requestLogger.js             # Request/response logging
│   │   ├── roleDataFilter.js            # Role-aware data masking
│   │   └── securityHeaders.js           # HTTP security headers
│   ├── validators/                      # Joi/custom validators (22 files)
│   │   ├── accountEntryValidator.js
│   │   ├── authValidator.js
│   │   ├── billOfLadingValidator.js
│   │   ├── catalogueValidator.js
│   │   ├── certificateValidator.js
│   │   ├── clientValidator.js
│   │   ├── companyValidator.js
│   │   ├── customsClearanceValidator.js
│   │   ├── leadValidator.js
│   │   ├── masterDataValidator.js
│   │   ├── packingListValidator.js
│   │   ├── palletValidator.js
│   │   ├── postShipmentDocValidator.js
│   │   ├── productValidator.js
│   │   ├── proformaInvoiceValidator.js
│   │   ├── proformaOrderValidator.js
│   │   ├── qcRecordValidator.js
│   │   ├── shippingInstructionValidator.js
│   │   ├── subscriptionValidator.js
│   │   ├── supplierValidator.js
│   │   ├── supportTicketValidator.js
│   │   └── userValidator.js
│   ├── services/                        # Business services (12 files)
│   │   ├── aiService.js
│   │   ├── auditService.js
│   │   ├── consistencyCheckService.js
│   │   ├── emailService.js
│   │   ├── exportDocumentReferenceService.js
│   │   ├── exportWorkflowInterconnectionService.js
│   │   ├── notificationService.js
│   │   ├── paymentService.js
│   │   ├── pdfBrandingService.js
│   │   ├── sessionService.js
│   │   ├── subscriptionService.js
│   │   └── whatsappService.js
│   ├── utils/                           # Utility helpers (12 files)
│   │   ├── backupScheduler.js           # Cron-based automated backup scheduler
│   │   ├── backupService.js             # Full backup/restore engine (pg_dump + archiver)
│   │   ├── csvHandler.js
│   │   ├── databaseProvisioning.js
│   │   ├── debugLogger.js
│   │   ├── documentNumberGenerator.js
│   │   ├── emailService.js
│   │   ├── helpers.js
│   │   ├── jwt.js
│   │   ├── notifyUsers.js
│   │   ├── pdfGenerator.js
│   │   ├── tokenManager.js
│   │   └── validators.js
│   ├── database/
│   │   ├── migrate.js                   # Migration runner
│   │   ├── seed.js                      # Admin user + master data seeder
│   │   └── migrations/                  # Date-prefixed SQL migration files
│   │       └── 20260226_*.sql           # (multiple migration files)
│   └── server.js                        # Express entry point, all middleware + routes
├── uploads/                             # File upload directory
├── .env                                 # Environment variables (not committed)
├── .env.example                         # Environment variable template
└── package.json
```

---

## Environment Configuration

### backend/.env

```bash
NODE_ENV=development
PORT=8000
HOST=0.0.0.0

# Database (use DATABASE_URL or individual vars)
DATABASE_URL=postgres://user:password@host:5432/tile_exporter_crm
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tile_exporter_crm
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-strong-random-secret-min-32-chars
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Frontend
FRONTEND_URL=http://localhost:5000

# Email (optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@example.com

# Security
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15

# Logging
LOG_LEVEL=info
```

---

## Starting the Backend

```bash
cd backend
npm install
node src/database/migrate.js   # Run all pending migrations
node src/database/seed.js      # Seed admin user and master data (first time only)
npm start                      # Start the Express server
```

Server is available at: **http://localhost:8000**  
Health check endpoint: **GET http://localhost:8000/health**  
Swagger docs: **http://localhost:8000/api/docs**

---

## Server Architecture (server.js)

The Express server is configured in this order:

1. **Security middleware** — Helmet, CORS, rate limiting
2. **Body parsing** — JSON (10 MB limit), URL-encoded
3. **Normalization** — `normalizeBody`, `sanitizeInput`
4. **Compression** — gzip via `compression`
5. **Logging** — `requestLogger`, `performanceMonitor`, Morgan
6. **Swagger UI** — served at `/api/docs`
7. **Route registration** — All 55 route files mounted under `/api/...`
8. **Static files** — `/uploads` directory served as static
9. **Error handler** — Central `errorHandler` middleware

---

## Database Connection (config/database.js)

```javascript
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // or use individual env vars:
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME || "tile_exporter_crm",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
});

export const query = (text, params) => pool.query(text, params);
export default pool;
```

### Database Transactions & Dual-Persistence

The backend enforces relational integrity using PostgreSQL junction tables (e.g., `proforma_invoice_lines`, `export_invoice_lines`). To maintain backward compatibility with the frontend, controllers utilize a **dual-persistence transactional strategy**.
Using `const client = await pool.connect();`, controllers will `await client.query('BEGIN')`, insert both the stringified legacy `product_lines` array to the parent record, and simultaneously populate the strict junction table before running `COMMIT`. If any relational constraint fails, it triggers a `ROLLBACK`.

### Self-Healing Schema Architecture

To address schema drift in multi-tenant environments, the backend implements a **Self-Healing Schema** mechanism:

- **Automatic Migration Script (`check_db.js`):** A programmatic execution script connects to the master pool and sequentially executes DDL adjustments across all isolated tenant databases. It automatically appends status and tracking columns (`is_used`, `is_converted`, `linked_document_id`, `document_status`) and builds indexing constraints.
- **Reference Service Check hooks (`exportDocumentReferenceService.js`):** Non-blocking check layers verify if required columns (e.g., `is_used`, `is_converted`, `linked_document_id`, `document_status`) exist in the tenant's isolated database.
- **Repair Action:** If a column is missing, the system executes an `ALTER TABLE` command dynamically at runtime, preventing database crashes when new releases deploy before all tenant nodes are fully migrated.

### Strict 1-to-1 Document Locking Guards

To enforce relational integrity and sequential progression, the transactional layer locks documents as they advance through the pipeline:

1. **Pre-Check Transaction Block:** When a child creation action is received, controllers query the parent table to verify if the parent is already converted:
   ```javascript
   const parentCheck = await req.db.query(
     `SELECT is_used, is_converted FROM parent_table WHERE id = $1 AND company_id = $2`,
     [parentId, companyId],
   );
   if (parentCheck.rows[0]?.is_used) {
     return next(
       new AppError("Document has already been converted downstream.", 400),
     );
   }
   ```
2. **Atomic Upstream Lock:** Upon child creation, the parent is locked inside the same atomic client transaction:
   ```javascript
   await client.query(
     `UPDATE parent_table 
      SET is_used = TRUE, is_converted = TRUE, linked_document_id = $1, document_status = 'Converted', status = 'Converted'
      WHERE id = $2`,
     [childId, parentId],
   );
   ```

### Master-Tenant Hybrid Fetching

For shared administrative entities like `companies`, the backend uses a hybrid fetching strategy:

1. **Local Context**: Transactional records are fetched from the **Tenant Database**.
2. **Master Context**: Company-wide defaults (IEC, LUT ARN, Permission No) are fetched from the **Master Database**.
3. **Merge**: The service layer performs a deep merge of these datasets, ensuring that transactional overrides take priority while maintaining global defaults. This eliminates the need for complex and error-prone cross-database SQL joins.

---

## Controller Pattern

All controllers follow this structure:

```javascript
// controllers/clientController.js
import { query } from "../config/database.js";
import { validateClientData } from "../validators/clientValidator.js";

export const getClients = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE company_id = $1 AND deleted_at IS NULL";
    let params = [company_id];

    if (search) {
      whereClause += " AND (client_name ILIKE $2 OR client_email ILIKE $2)";
      params.push(`%${search}%`);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM clients ${whereClause}`,
      params,
    );

    const dataResult = await query(
      `SELECT * FROM clients ${whereClause}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const { error, value } = validateClientData(req.body);
    if (error)
      return res.status(400).json({ success: false, error: error.message });

    const result = await query(
      `INSERT INTO clients (company_id, client_name, client_email, client_phone)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [company_id, value.client_name, value.client_email, value.client_phone],
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
```

---

## Middleware

### Authentication (middleware/auth.js)

Verifies the JWT access token sent in the `Authorization: Bearer <token>` header.  
On success, attaches `req.user = { id, company_id, role, email }`.

### Multi-Tenancy (middleware/auth.js)

The `filterByCompany` middleware enforces strict tenant isolation by extracting the company context from the session and setting `req.companyFilter`. This filter is used by all controllers to restrict queries to the current tenant's data.

### RBAC (middleware/rbac.js)

```javascript
export const requireRole = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }
  next();
};
```

### Module Access (middleware/moduleAccess.js)

Controls access to entire functional modules (e.g., QC, Packing Lists) based on company configuration.  
**Bypass roles** — `super_admin`, `company_admin`, `admin`, `administration`, `account`, `sales_manager` always bypass this check.

### Error Handler (middleware/errorHandler.js)

Central handler for all errors passed via `next(error)`.

```javascript
export const handleErrors = (err, req, res, next) => {
  if (err.code === "23505") {
    return res.status(400).json({ success: false, error: "Duplicate entry" });
  }
  if (err.code === "23503") {
    return res.status(400).json({ success: false, error: "Invalid reference" });
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
};
```

---

## Database Migrations

Migration files are date-prefixed SQL files located at `src/database/migrations/`.

```
20260226_create_master_tables.sql
20260226_fix_schema_comprehensive.sql
20260226_fix_schema_final.sql
... (additional migrations)
```

To run all pending migrations:

```bash
cd backend
node src/database/migrate.js
```

To create a new migration, add a `.sql` file to `src/database/migrations/` following the `YYYYMMDD_description.sql` naming convention.

---

## Key Controllers Reference

| Controller                                   | Route Prefix                        | Purpose                        |
| -------------------------------------------- | ----------------------------------- | ------------------------------ |
| `authController.js`                          | `/api/auth`                         | Login, register, token refresh |
| `userController.js`                          | `/api/users`                        | User management (CRUD)         |
| `clientController.js`                        | `/api/clients`                      | Client/buyer management        |
| `productController.js`                       | `/api/products`                     | Product catalogue              |
| `leadController.js`                          | `/api/leads`                        | Lead/inquiry tracking          |
| `proformaInvoiceController.js`               | `/api/proforma-invoices`            | Proforma invoices              |
| `proformaOrderController.js`                 | `/api/proforma-orders`              | Proforma orders                |
| `clientOrderController.js`                   | `/api/client-orders`                | Client purchase orders         |
| `qcRecordController.js`                      | `/api/qc-records`                   | Quality control                |
| `exportInvoiceController.js`                 | `/api/export-invoices`              | Export invoices                |
| `exportInvoiceAnnexureController.js`         | `/api/export-invoice-annexures`     | Invoice annexures              |
| `invoiceBacksideController.js`               | `/api/invoice-backsides`            | Invoice backside docs          |
| `packingListController.js`                   | `/api/packing-lists`                | Packing lists                  |
| `palletController.js`                        | `/api/pallets`                      | Pallet records                 |
| `vgmController.js`                           | `/api/vgm`                          | VGM (Verified Gross Mass)      |
| `shippingInstructionController.js`           | `/api/export-shipping-instructions` | Shipping instructions          |
| `customsClearanceController.js`              | `/api/export-customs-clearances`    | Customs clearance              |
| `billOfLadingController.js`                  | `/api/export-bills-of-lading`       | Bills of lading                |
| `certificateController.js`                   | `/api/export-certificates`          | Export certificates            |
| `postShipmentDocController.js`               | `/api/export-post-shipment-docs`    | Post-shipment documents        |
| `accountEntryController.js`                  | `/api/account-entries`              | Finance ledger entries         |
| `analyticsController.js`                     | `/api/analytics`                    | Business analytics             |
| `dashboardController.js`                     | `/api/dashboard-stats`              | Dashboard statistics           |
| `reportController.js`                        | `/api/reports`                      | Report generation              |
| `supplierController.js`                      | `/api/suppliers`                    | Supplier management            |
| `masterDataController.js`                    | `/api/master-data`                  | Reference/master data          |
| `systemSettingsController.js`                | `/api/system-settings`              | System configuration           |
| `notificationController.js`                  | `/api/notifications`                | In-app notifications           |
| `aiController.js`                            | `/api/ai`                           | AI assistant queries           |
| `paymentController.js`                       | `/api/payments`                     | PayPal payment integration     |
| `subscriptionController.js`                  | `/api/subscriptions`                | Subscription plans             |
| `exportWorkflowInterconnectionController.js` | `/api/export-workflow`              | Workflow stage data flow       |
| `backupController.js`                        | `/api/backups`                      | Backup & restore management    |

---

## Authentication Token Details

| Token         | Expiry  | Usage                                                            |
| ------------- | ------- | ---------------------------------------------------------------- |
| Access Token  | 7 days  | Sent in `Authorization: Bearer <token>` header                   |
| Refresh Token | 30 days | Sent to `POST /api/auth/refresh-token` to get a new access token |

Token payload structure:

```javascript
{
  userId: user.id,
  companyId: user.company_id,
  role: user.role,
  email: user.email_id
}
```

---

## API Response Format

All API responses follow this standard envelope:

```javascript
// Success
{ "success": true, "data": { ... } }
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 10, "total": 50 } }

// Error
{ "success": false, "error": "Human-readable message" }
{ "success": false, "error": "Validation failed", "details": { "field": "reason" } }
```

---

## Rate Limiting

- **Global limit**: 2000 requests per 15 minutes per IP
- **Login limit**: 5 attempts per 15 minutes per IP (configurable via `MAX_LOGIN_ATTEMPTS`)
- Rate limit headers included in every response:
  - `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Security Features

- **Helmet** — HTTP security headers
- **CORS** — restricted to `FRONTEND_URL`
- **CSRF** — token-based CSRF protection on state-changing routes
- **Input sanitization** — `sanitizeInput` middleware strips dangerous characters
- **SQL injection prevention** — all queries use parameterized statements
- **Password hashing** — bcrypt with configurable rounds (`BCRYPT_ROUNDS`)
- **Account lockout** — after `MAX_LOGIN_ATTEMPTS` failed logins
- **Audit logging** — all significant actions recorded in `audit_logs` table
- **Automated backups** — scheduled `node-cron` database snapshots with retention policies
- **Backup security** — backup management restricted to `super_admin`, `company_admin`, `company_owner` roles

### Backup & Restore System

The backend includes an enterprise-grade backup and restore engine:

- **Service layer** (`utils/backupService.js`): Uses `pg_dump` for binary database exports and `archiver` for zipping database dumps with the entire `/uploads` directory into a single `.zip` package.
- **Scheduler** (`utils/backupScheduler.js`): Uses `node-cron` to schedule automated backups at configurable intervals (Daily at 2 AM, Weekly on Sundays at 2 AM, Monthly on the 1st at 2 AM).
- **Controller** (`controllers/backupController.js`): REST API for manual backup creation, listing, downloading, deletion, and system restore.
- **Safety snapshots**: Before any restore operation, the system automatically creates a `pre_restore_snapshot` backup to prevent data loss.
- **Retention policy**: Configurable maximum backup count; older backups are automatically purged.
- **Audit trail**: All backup/restore/delete operations are logged in the `audit_logs` table.

---

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET` (minimum 32 random characters)
3. Configure a managed PostgreSQL database
4. Set `FRONTEND_URL` to your production frontend domain
5. Configure SMTP credentials for email delivery
6. Run `node src/database/migrate.js` on first deploy
7. Use PM2 or a process manager for auto-restart

See `docs/07_PRODUCTION_DEPLOYMENT_GUIDE.md` for full deployment walkthrough.
