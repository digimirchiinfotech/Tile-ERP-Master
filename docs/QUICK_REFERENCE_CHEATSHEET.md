# Quick Reference Cheat Sheet — Tile Exporter Solution

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## For End Users

### Login

```
URL (Development):   http://localhost:5000
URL (Production):    https://your-domain.com

Default Admin:       admin@admin.com
Password:            Set via ADMIN_PASSWORD environment variable
```

### Keyboard Shortcuts

| Shortcut   | Action               |
| ---------- | -------------------- |
| `Ctrl + K` | Open global search   |
| `Ctrl + S` | Save current form    |
| `Escape`   | Close dialog / modal |

### Common Workflow — New Export

```
1. Leads → Create Lead → Convert to Client
2. Products → Add product to catalog
3. Proforma Invoices → Create PI → Select client + add items
4. Proforma Orders → Create PO from PI
5. QC Records → Log inspection against PO
6. Export Invoices → Create from PI → Link client and items
7. Packing List → Create from Export Invoice
8. VGM → Enter container gross mass
9. Shipping Instructions → Enter carrier and routing details
10. Bill of Lading → Record B/L details
11. Post-Shipment → Track courier, duty drawback, GST refund
12. Finance → Record payments and account entries
```

### Module Quick Reference

| Module                | Location in Sidebar    | Key Actions                        |
| --------------------- | ---------------------- | ---------------------------------- |
| Leads                 | Sales → Leads          | Create, qualify, convert to client |
| Clients               | Sales → Clients        | Create, edit, view credit info     |
| Products              | Catalog → Products     | Create, price, manage stock        |
| Proforma Invoice      | Proforma → Invoices    | Create, send, convert to PO        |
| Proforma Order        | Proforma → Orders      | Create from PI, confirm            |
| QC Records            | Quality → QC Records   | Log inspection, pass/fail          |
| Export Invoice        | Export → Invoices      | Create from PI, generate docs      |
| Packing List          | Export → Packing Lists | Create from Export Invoice         |
| VGM                   | Export → VGM           | Enter gross mass for container     |
| Shipping Instructions | Export → Shipping      | Enter carrier and routing          |
| Bill of Lading        | Shipment → B/L         | Record B/L details                 |
| Customs Clearance     | Shipment → Customs     | Track customs submissions          |
| Post-Shipment Docs    | Post-Shipment          | Track duty drawback, GST refund    |
| Finance               | Finance → Accounts     | Record payments, view analytics    |
| Reports               | Analytics → Reports    | Generate PDF/Excel reports         |

---

## For Developers

### API Base URLs

```
Development:    http://localhost:8000/api
Production:     https://api.your-domain.com/api
```

### Authentication Flow

**1. Login:**

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email_id": "admin@admin.com",
  "password": "your_password"
}
```

**Response:**

```json
{
  "success": true,
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "expiresIn": 604800,
  "user": { "id": 1, "name": "Admin", "role": "super_admin" }
}
```

**2. Authenticated Request:**

```bash
GET /api/clients
Authorization: Bearer <accessToken>
```

**3. Refresh Token:**

```bash
POST /api/auth/refresh-token
Authorization: Bearer <refreshToken>
```

### Core Endpoint Reference

#### Clients

```bash
GET    /api/clients                     # List all clients
POST   /api/clients                     # Create client
GET    /api/clients/:id                 # Get single client
PUT    /api/clients/:id                 # Update client
DELETE /api/clients/:id                 # Delete client
GET    /api/clients/:id/export-invoices # Client invoice history
```

#### Products

```bash
GET    /api/products                    # List products
POST   /api/products                    # Create product
GET    /api/products/:id                # Get product
PUT    /api/products/:id                # Update product
DELETE /api/products/:id                # Delete product
POST   /api/products/bulk-delete        # Bulk delete
```

#### Proforma Invoices

```bash
GET    /api/proforma-invoices           # List PIs
POST   /api/proforma-invoices           # Create PI
GET    /api/proforma-invoices/:id       # Get PI
PUT    /api/proforma-invoices/:id       # Update PI
DELETE /api/proforma-invoices/:id       # Delete PI
POST   /api/proforma-invoices/:id/convert-to-po  # Convert PI to PO
```

#### Export Invoices

```bash
GET    /api/export-invoices             # List invoices
POST   /api/export-invoices             # Create invoice
GET    /api/export-invoices/:id         # Get invoice
PUT    /api/export-invoices/:id         # Update invoice
DELETE /api/export-invoices/:id         # Delete invoice
```

#### Packing Lists

```bash
GET    /api/packing-lists               # List packing lists
POST   /api/packing-lists               # Create packing list
GET    /api/packing-lists/:id           # Get packing list
PUT    /api/packing-lists/:id           # Update packing list
```

#### VGM

```bash
GET    /api/vgm                         # List VGM records
POST   /api/vgm                         # Create VGM
GET    /api/vgm/:id                     # Get VGM
PUT    /api/vgm/:id                     # Update VGM
```

#### Shipping Instructions

```bash
GET    /api/shipping-instructions       # List instructions
POST   /api/shipping-instructions       # Create instruction
GET    /api/shipping-instructions/:id   # Get instruction
PUT    /api/shipping-instructions/:id   # Update instruction
```

#### Finance

```bash
GET    /api/payments/history            # Payment history
POST   /api/payments                    # Record payment
GET    /api/analytics/dashboard         # Dashboard analytics
GET    /api/account-entries             # Account entries
POST   /api/account-entries             # Create entry
```

#### Users

```bash
GET    /api/users                       # List users
POST   /api/users                       # Create user
GET    /api/users/:id                   # Get user
PUT    /api/users/:id                   # Update user
DELETE /api/users/:id                   # Delete user
```

### Standard API Response Format

**Success:**

```json
{
  "success": true,
  "message": "Operation completed",
  "data": {}
}
```

**Paginated List:**

```json
{
  "success": true,
  "data": {
    "data": [],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 25,
      "totalPages": 4
    }
  }
}
```

**Error:**

```json
{
  "success": false,
  "message": "Descriptive error message",
  "errors": []
}
```

### Common Query Parameters

| Parameter   | Type    | Description                    |
| ----------- | ------- | ------------------------------ |
| `page`      | integer | Page number (default: 1)       |
| `limit`     | integer | Records per page (default: 25) |
| `search`    | string  | Text search filter             |
| `status`    | string  | Filter by status               |
| `from_date` | date    | Filter records from date       |
| `to_date`   | date    | Filter records to date         |

### HTTP Status Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Created                              |
| 400  | Bad Request (validation error)       |
| 401  | Unauthorized (invalid/missing token) |
| 403  | Forbidden (insufficient role)        |
| 404  | Not Found                            |
| 409  | Conflict (dependency exists)         |
| 429  | Too Many Requests (rate limited)     |
| 500  | Internal Server Error                |

---

## Environment Variables Reference

### Required

| Variable       | Description                                        |
| -------------- | -------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                       |
| `JWT_SECRET`   | Secret key for JWT signing (minimum 32 characters) |
| `NODE_ENV`     | `development` or `production`                      |

### Optional

| Variable                  | Default                 | Description                                       |
| ------------------------- | ----------------------- | ------------------------------------------------- |
| `PORT`                    | `8000`                  | Backend server port                               |
| `ADMIN_PASSWORD`          | _(required)_            | Admin login password — set before running seed.js |
| `JWT_ACCESS_EXPIRY`       | `7d`                    | Access token expiry                               |
| `JWT_REFRESH_EXPIRY`      | `30d`                   | Refresh token expiry                              |
| `FRONTEND_URL`            | `http://localhost:5000` | CORS allowed origin                               |
| `SMTP_HOST`               | —                       | Email server host                                 |
| `SMTP_PORT`               | `587`                   | Email server port                                 |
| `SMTP_USER`               | —                       | Email account username                            |
| `SMTP_PASSWORD`           | —                       | Email account password                            |
| `EMAIL_FROM`              | —                       | From address for system emails                    |
| `LOG_LEVEL`               | `info`                  | Logging level                                     |
| `RATE_LIMIT_MAX_REQUESTS` | `100`                   | Max requests per window                           |
| `RATE_LIMIT_WINDOW`       | `15`                    | Rate limit window (minutes)                       |

---

## Database Migration Commands

```bash
# Run all pending migrations
cd backend && node src/database/migrate.js

# Seed initial data (admin user + master data)
cd backend && node src/database/seed.js
```

---

## Workflow Commands

```bash
# Start backend
cd backend && npm start

# Start frontend (development)
cd frontend && npm run dev -- --host 0.0.0.0 --port 5000

# Install dependencies
cd backend && npm install
cd frontend && npm install
```

---

## Roles Quick Reference

| Role               | Description                                |
| ------------------ | ------------------------------------------ |
| `super_admin`      | Full access to all companies and modules   |
| `company_admin`    | Full access within own company             |
| `sales_manager`    | Leads, clients, PI/PO, export, packing     |
| `sales_executive`  | Leads, clients, PI, catalogue, products    |
| `qc`               | QC records, products, export invoices      |
| `qc_inspector`     | QC records only                            |
| `account`          | Finance, payments, invoices                |
| `purchase_manager` | PO, pallets, suppliers, packing            |
| `administration`   | Products, catalogue, QC, pallets           |
| `export_documents` | Export invoices, packing, products         |
| `client`           | Read-only: orders, catalogue, products, PI |

---

_For full API reference, see [05_API_DOCUMENTATION.md](05_API_DOCUMENTATION.md)._  
_For user workflows, see [USER_GUIDE_DAILY_OPERATIONS.md](USER_GUIDE_DAILY_OPERATIONS.md)._
