# API Documentation — Complete Reference

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Base URL

```
Development:  http://localhost:8000/api
Production:   https://api.yourdomain.com/api
```

The frontend proxies all `/api` requests to the backend, so you can also use relative paths (`/api/...`) from the frontend application.

---

## Authentication

All endpoints require a JWT access token in the request header, except public endpoints listed below.

```
Authorization: Bearer {accessToken}
```

### Public Endpoints (no token required)

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh-token`
- `GET /health`
- `GET /api/docs`

---

## Authentication Endpoints

### Login

```
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email_id": "admin@admin.com",
  "password": "your_password"
}
```

Response (200):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Admin",
      "email_id": "admin@admin.com",
      "role": "super_admin",
      "company_id": "uuid"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": "7d"
  }
}
```

---

### Register

```
POST /api/auth/register
Content-Type: application/json
```

Request:

```json
{
  "name": "John Doe",
  "email_id": "john@example.com",
  "password": "Password@123",
  "contact_number": "+91-9999999999",
  "company_id": "uuid"
}
```

Response (201):

```json
{
  "success": true,
  "data": {
    "user": { "..." },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

### Refresh Token

```
POST /api/auth/refresh-token
Content-Type: application/json
```

Request:

```json
{
  "refreshToken": "eyJhbGc..."
}
```

Response (200):

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": "7d"
  }
}
```

Token expiry:

- **Access token**: 7 days
- **Refresh token**: 30 days

---

## User Management

### Get All Users

```
GET /api/users
Authorization: Required
Role: super_admin, company_admin
```

Response (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Admin",
      "email_id": "admin@admin.com",
      "role": "super_admin",
      "status": "active",
      "company_id": "uuid",
      "created_at": "2026-02-26T10:00:00Z"
    }
  ]
}
```

### Create User

```
POST /api/users
Authorization: Required
Role: super_admin, company_admin
Content-Type: application/json
```

Request:

```json
{
  "name": "Sales Manager",
  "email_id": "manager@example.com",
  "password": "Password@123",
  "role": "sales_manager",
  "department": "Sales",
  "contact_number": "+91-9999999999"
}
```

### Update User

```
PUT /api/users/:id
Authorization: Required
Role: super_admin, company_admin
```

### Delete User

```
DELETE /api/users/:id
Authorization: Required
Role: super_admin, company_admin
```

---

## Client Management

### Get All Clients

```
GET /api/clients
Authorization: Required
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 10)
  - search: string — searches name and email
  - status: string — filter by client status
```

Response (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "client_name": "ABC Exports Ltd",
      "client_email": "contact@abc.com",
      "client_phone": "+1-555-0100",
      "client_address": "123 Trade Street",
      "city": "New York",
      "country": "United States",
      "credit_limit": 500000,
      "credit_days": 30,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50
  }
}
```

### Get Client by ID

```
GET /api/clients/:id
Authorization: Required
```

### Create Client

```
POST /api/clients
Authorization: Required
Role: super_admin, company_admin, administration, account, sales_manager, sales_executive
Content-Type: application/json
```

Request:

```json
{
  "client_name": "New Buyer Inc",
  "client_email": "buyer@example.com",
  "client_phone": "+44-20-0000-0000",
  "client_address": "10 Commerce Lane",
  "city": "London",
  "country": "United Kingdom",
  "credit_limit": 1000000,
  "credit_days": 30
}
```

Response (201):

```json
{
  "success": true,
  "data": { "id": "uuid", "..." }
}
```

### Update Client

```
PUT /api/clients/:id
Authorization: Required
Role: super_admin, company_admin, administration, account, sales_manager, sales_executive
```

### Delete Client

```
DELETE /api/clients/:id
Authorization: Required
Role: super_admin, company_admin
```

---

## Tile Product

### Get All Products

```
GET /api/products
Authorization: Required
Query Parameters: page, limit, search, category
```

Response (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product_name": "White Ceramic Floor Tile 600x600",
      "sku": "TILE-W60-001",
      "category": "Floor Tiles",
      "hs_code": "6908.90.00",
      "unit_price": 650,
      "uom": "SQM",
      "description": "Glossy white ceramic tile"
    }
  ]
}
```

### Create Product

```
POST /api/products
Authorization: Required
Role: super_admin, company_admin, administration
Content-Type: application/json
```

Request:

```json
{
  "product_name": "Ceramic Wall Tile 300x600",
  "sku": "TILE-W30-002",
  "category": "Wall Tiles",
  "hs_code": "6908.90.00",
  "unit_price": 480,
  "uom": "SQM",
  "description": "Satin finish ceramic wall tile"
}
```

### Update / Delete Product

```
PUT    /api/products/:id
DELETE /api/products/:id
```

### Validate Import Products

```
POST /api/products/validate-import
Authorization: Required
Role: super_admin, company_admin, administration
Content-Type: application/json
```

Request:

```json
{
  "products": [
    {
      "Product Name": "White Ceramic Floor Tile 600x600",
      "Category": "Floor Tiles",
      "Product Code": "TILE-W60-001",
      "Factory Name": "Morbi Factory",
      "Factory Product Name": "Ceramica 60x60"
    }
  ]
}
```

Response (200):

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 1,
      "validCount": 1,
      "duplicateCount": 0,
      "errorCount": 0
    },
    "results": [
      {
        "rowIndex": 1,
        "status": "VALID",
        "reason": "-",
        "productName": "White Ceramic Floor Tile 600x600",
        "category": "Floor Tiles",
        "productCode": "TILE-W60-001",
        "factoryName": "Morbi Factory",
        "factoryProductName": "Ceramica 60x60"
      }
    ]
  }
}
```

### Bulk Import Products (Upsert)

```
POST /api/products/bulk
Authorization: Required
Role: super_admin, company_admin
Content-Type: application/json
```

Request:

```json
{
  "products": [
    {
      "productCode": "TILE-W60-001",
      "name": "White Ceramic Floor Tile 600x600",
      "category": "Floor Tiles",
      "factoryName": "Morbi Factory",
      "factoryProductName": "Ceramica 60x60"
    }
  ]
}
```

Response (200):

```json
{
  "success": true,
  "data": {
    "insertedCount": 1,
    "updatedCount": 0
  }
}
```

---

## Sanitaryware Products

### Get All Sanitaryware Products

```
GET /api/sanitaryware-products
Authorization: Required
Query Parameters: page, limit, search, category
```

Response (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Wall Hung WC Pan",
      "factory_product_name": "FACTORY-WC-001",
      "category": "WC",
      "item_ref": "MODEL-WH-100",
      "color": "WHITE",
      "size": "700x350",
      "hsn_code": "6910.10.00",
      "weight_per_piece": 18.5,
      "box_weight": 22.0,
      "cbm_per_piece": 0.085,
      "pcs_per_box": 1,
      "selling_price": 4500
    }
  ]
}
```

### Create Sanitaryware Product

```
POST /api/sanitaryware-products
Authorization: Required
Role: super_admin, company_admin, administration
Content-Type: application/json
```

Request:

```json
{
  "name": "Pedestal Wash Basin",
  "factory_product_name": "FACTORY-WB-002",
  "category": "Wash Basin",
  "item_ref": "MODEL-PED-200",
  "color": "WHITE",
  "size": "500x400",
  "hsn_code": "6910.10.00",
  "weight_per_piece": 12.5,
  "box_weight": 15.0,
  "cbm_per_piece": 0.055,
  "pcs_per_box": 1,
  "selling_price": 2800
}
```

### Update / Delete Sanitaryware Product

```
PUT    /api/sanitaryware-products/:id
DELETE /api/sanitaryware-products/:id
Authorization: Required
Role: super_admin, company_admin, administration
```

### Validate Import Sanitaryware Products

```
POST /api/sanitaryware-products/validate-import
Authorization: Required
Role: super_admin, company_admin, administration
Content-Type: application/json
```

Request:

```json
{
  "products": [
    {
      "Product Name": "Wall Hung WC Pan",
      "Category": "Wall Hung WC",
      "Product Code": "SW-101",
      "HSN Code": "69109000"
    }
  ]
}
```

Response (200):

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 1,
      "validCount": 1,
      "duplicateCount": 0,
      "errorCount": 0
    },
    "results": [
      {
        "rowIndex": 1,
        "status": "VALID",
        "reason": "-",
        "productName": "Wall Hung WC Pan",
        "category": "Wall Hung WC",
        "productCode": "SW-101"
      }
    ]
  }
}
```

### Bulk Import Sanitaryware Products (Upsert)

```
POST /api/sanitaryware-products/bulk
Authorization: Required
Role: super_admin, company_admin
Content-Type: application/json
```

Request:

```json
{
  "products": [
    {
      "productCode": "SW-101",
      "name": "Wall Hung WC Pan",
      "category": "Wall Hung WC",
      "hsnCode": "69109000"
    }
  ]
}
```

Response (200):

```json
{
  "success": true,
  "data": {
    "insertedCount": 1,
    "updatedCount": 0
  }
}
```

---

## Export Invoice Annexures

### Get All Annexures

```
GET /api/export-invoice-annexures
Authorization: Required
```

### Create Annexure

```
POST /api/export-invoice-annexures
Authorization: Required
Role: super_admin, company_admin, administration, account, sales_manager
Content-Type: application/json
```

Request:

```json
{
  "export_invoice_id": "uuid",
  "packing_list_id": "uuid",
  "annexure_no": "ANX/0001",
  "lut_arn_no": "AD260422000321D",
  "permission_no": "PERM-2026-001",
  "container_details": [
    {
      "container_no": "MSCU1234567",
      "line_seal_no": "SEAL001",
      "type": "40HC",
      "boxes": 400,
      "net_weight": 4800,
      "gross_weight": 5200
    }
  ]
}
```

### Update / Delete Annexure

```
PUT    /api/export-invoice-annexures/:id
DELETE /api/export-invoice-annexures/:id
```

---

## Invoice Backside

```
GET    /api/invoice-backsides
POST   /api/invoice-backsides
PUT    /api/invoice-backsides/:id
DELETE /api/invoice-backsides/:id
```

The Invoice Backside is the GST/Customs Regulatory annexure page linked to the Export Invoice. Fields include `permission_no`, `lut_arn_no`, `container_details`, `weighbridge_name`, `declaration_text`.

---

## Global Text Transformation

All API request text fields (except emails, passwords, UUIDs, and URLs) are **automatically converted to UPPERCASE** by the frontend `textTransformMiddleware.js` before payload dispatch and by the backend `normalizeBody.js` middleware on receipt. This enforces regulatory document consistency across all export records.

**Excluded fields (casing preserved):**

- `email`, `email_id`, `password`, `password_hash`
- Any URL / endpoint string
- UUID fields (`id`, `company_id`, `*_id`)

---

## Leads

### Get All Leads

```
GET /api/leads
Authorization: Required
Query Parameters: page, limit, search, status
```

### Create Lead

```
POST /api/leads
Authorization: Required
Content-Type: application/json
```

Request:

```json
{
  "client_name": "Potential Buyer",
  "contact_email": "inquiry@example.com",
  "contact_phone": "+49-30-0000-0000",
  "country": "Germany",
  "product_interest": "Floor Tiles",
  "estimated_value": 200000,
  "source": "Trade Show",
  "notes": "Met at Cersaie 2025"
}
```

---

## Proforma Invoices

Available at `/api/proforma-invoices` and `/api/invoices` (alias).

### Get All Proforma Invoices

```
GET /api/proforma-invoices
Authorization: Required
Query Parameters:
  - page, limit, search
  - status: Approved | Finalized | Draft | Cancelled (comma-separated accepted)
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "invoice_number": "PI/02/26/001",
      "client_id": "uuid",
      "client_name": "ABC Exports Ltd",
      "invoice_date": "2026-02-26",
      "subtotal": 100000,
      "sgst_rate": 9,
      "sgst_amount": 9000,
      "cgst_rate": 9,
      "cgst_amount": 9000,
      "fob_total": 118000,
      "status": "Approved"
    }
  ]
}
```

### Create Proforma Invoice

```
POST /api/proforma-invoices
Authorization: Required
Role: super_admin, company_admin, sales_executive
Content-Type: application/json
```

Request:

```json
{
  "client_id": "uuid",
  "invoice_date": "2026-02-26",
  "shipping_terms": "FOB",
  "payment_terms": "30% advance, 70% against B/L",
  "port_of_loading": "Mundra",
  "port_of_discharge": "Felixstowe",
  "sgst_rate": 9,
  "cgst_rate": 9,
  "other_charges": 2000,
  "items": [
    {
      "product_id": "uuid",
      "quantity": 200,
      "unit_price": 500,
      "uom": "SQM"
    }
  ]
}
```

### Update / Delete Proforma Invoice

```
PUT    /api/proforma-invoices/:id
DELETE /api/proforma-invoices/:id
```

### Update Status

```
PATCH  /api/proforma-invoices/:id/status
Body: { "status": "Approved" }
```

---

## Export Invoices

### Get All Export Invoices

```
GET /api/export-invoices
Authorization: Required
```

### Create Export Invoice

```
POST /api/export-invoices
Authorization: Required
Role: super_admin, company_admin, sales_executive, account
Content-Type: application/json
```

Request:

```json
{
  "proforma_invoice_id": "uuid",
  "invoice_date": "2026-03-01",
  "invoice_no": "EI/03/26/001",
  "client_id": "uuid",
  "shipping_terms": "CIF",
  "port_of_loading": "Mundra",
  "port_of_discharge": "Felixstowe",
  "gross_weight": 5000,
  "net_weight": 4800,
  "items": [ { "..." } ]
}
```

---

## QC Records

### Get QC Records

```
GET /api/qc-records
Authorization: Required
```

### Create QC Record

```
POST /api/qc-records
Authorization: Required
Role: super_admin, company_admin, qc_inspector, administration
Content-Type: application/json
```

Request:

```json
{
  "proforma_invoice_id": "uuid",
  "inspection_date": "2026-02-28",
  "inspector_name": "Quality Team",
  "batch_number": "BATCH-2026-001",
  "result": "Pass",
  "remarks": "All tiles meet specification",
  "items": [
    { "product_id": "uuid", "quantity_checked": 200, "quantity_passed": 198 }
  ]
}
```

---

## Packing Lists

### Get Packing Lists

```
GET /api/packing-lists
Authorization: Required
```

### Create Packing List

```
POST /api/packing-lists
Authorization: Required
Role: super_admin, company_admin, administration, account, sales_manager, sales_executive, purchase
Content-Type: application/json
```

Request:

```json
{
  "export_invoice_id": "uuid",
  "packing_list_no": "PL/03/26/001",
  "packing_date": "2026-03-05",
  "total_boxes": 400,
  "total_pallets": 20,
  "gross_weight": 5000,
  "net_weight": 4800,
  "lines": [
    {
      "product_id": "uuid",
      "boxes": 40,
      "quantity": 20,
      "gross_weight": 500,
      "net_weight": 480
    }
  ]
}
```

---

## VGM (Verified Gross Mass)

### Create VGM Record

```
POST /api/vgm
Authorization: Required
Content-Type: application/json
```

Request:

```json
{
  "export_invoice_id": "uuid",
  "shipper_name": "Tile Export Co",
  "container_no": "MSCU1234567",
  "gross_mass": 5000,
  "weighing_method": "Method 1",
  "verified_by": "Logistics Manager",
  "verification_date": "2026-03-08"
}
```

---

## Shipping Instructions

### Create Shipping Instruction

```
POST /api/export-shipping-instructions
Authorization: Required
Content-Type: application/json
```

Request:

```json
{
  "export_invoice_id": "uuid",
  "shipper": "Tile Export Co Ltd",
  "consignee": "ABC Exports Ltd",
  "notify_party": "Bank of Example",
  "vessel_name": "MSC DIANA",
  "voyage_no": "VYG-001",
  "port_of_loading": "Mundra",
  "port_of_discharge": "Felixstowe",
  "etd": "2026-03-15",
  "eta": "2026-04-10",
  "container_type": "40HC",
  "container_count": 1
}
```

---

## Export Workflow Interconnection

### Get Complete Workflow

```
GET /api/export-workflow/complete/:proformaInvoiceId
Authorization: Required
```

Returns all stages from Proforma Invoice through Shipping Instructions.

### Get Next Stage Data

```
GET /api/export-workflow/next-stage/:stage/:documentId
Authorization: Required
```

Stages: `proforma_invoice` | `export_invoice` | `packing_list` | `vgm`

### Get Workflow Completion

```
GET /api/export-workflow/completion/:exportInvoiceId
Authorization: Required
```

Response:

```json
{
  "export_invoice_id": "uuid",
  "invoice_no": "EI/03/26/001",
  "completionPercentage": 60,
  "has_packing_list": true,
  "has_annexure": false,
  "has_backside": true,
  "has_vgm": true,
  "has_shipping_instructions": false,
  "nextStages": {
    "annexure": "PENDING",
    "shippingInstructions": "PENDING"
  }
}
```

### Sync Updates

```
POST /api/export-workflow/sync
Authorization: Required
Content-Type: application/json
```

Request:

```json
{
  "documentId": "uuid",
  "stage": "export_invoice",
  "changedFields": ["gross_weight", "net_weight"]
}
```

---

## AI Assistant

### Query

```
POST /api/ai/query
Authorization: Required
Content-Type: application/json
```

Request:

```json
{
  "prompt": "What are my top 5 clients by export value this year?"
}
```

Response (200):

```json
{
  "success": true,
  "data": {
    "answer": "Based on your export invoice data, your top 5 clients this year are..."
  }
}
```

---

## Analytics

### Overview Metrics

```
GET /api/analytics/overview
Authorization: Required
Query Parameters:
  - from: date (YYYY-MM-DD)
  - to: date (YYYY-MM-DD)
```

Response:

```json
{
  "success": true,
  "data": {
    "total_export_value": 5000000,
    "total_invoices": 42,
    "active_clients": 18,
    "pending_shipments": 6,
    "monthly_trend": [{ "month": "Jan", "value": 420000 }]
  }
}
```

---

## Master Data

### Get Reference Data

Generic endpoint to fetch reference data for dropdowns and lookups.

```
GET /api/master-data/:type
Authorization: Required
```

**Valid Types:**

- `countries`: Global country list
- `cities`: Global city list (filtered by `country_code` via query param)
- `paymentTerms`: Company-specific or global payment terms
- `tariffCodes`: Company-specific or global HS codes

**Example:**

```
GET /api/master-data/cities?country_code=IN
```

Response:

```json
{
  "success": true,
  "data": [
    { "id": 1, "city_name": "Mumbai", "country_code": "IN" },
    { "id": 2, "city_name": "Delhi", "country_code": "IN" }
  ]
}
```

---

## Global Search

```
GET /api/global-search?q=search_term
Authorization: Required
Query Parameters:
  - q: string (minimum 2 characters)
```

Response (200):

```json
{
  "success": true,
  "data": {
    "clients": [
      { "id": "uuid", "type": "client", "title": "ABC Exports", "description": "contact@abc.com", "route": "/clients/uuid" }
    ],
    "products": [ { "..." } ],
    "invoices": [ { "..." } ],
    "leads": [ { "..." } ]
  }
}
```

---

## System Settings

### Get Settings

```
GET /api/system-settings
Authorization: Required
Role: super_admin, company_admin
```

Response:

```json
{
  "success": true,
  "data": {
    "general": {
      "site_name": "Tile Exporter Solution",
      "timezone": "Asia/Kolkata",
      "date_format": "DD-MM-YYYY",
      "currency": "INR"
    },
    "email": {
      "smtp_host": "smtp.gmail.com",
      "smtp_port": 587
    },
    "security": {
      "session_timeout": 30,
      "max_login_attempts": 5
    }
  }
}
```

### Update Settings

```
PUT /api/system-settings
Authorization: Required
Role: super_admin
Content-Type: application/json
```

---

## Dashboard Statistics

```
GET /api/dashboard-stats
Authorization: Required
```

Returns aggregated counts and values across all modules for the authenticated user's company.

---

## Notifications

```
GET    /api/notifications          # List in-app notifications
PATCH  /api/notifications/:id/read # Mark as read
POST   /api/notifications/read-all # Mark all as read
DELETE /api/notifications/:id      # Delete notification
```

---

## Account Entries (Finance)

```
GET    /api/account-entries        # List finance ledger entries
GET    /api/account-entries/:id    # Get entry details
POST   /api/account-entries        # Create entry
PUT    /api/account-entries/:id    # Update entry
DELETE /api/account-entries/:id    # Delete entry
```

---

## Bulk Delete

```
POST /api/bulk-delete
Authorization: Required
Content-Type: application/json
```

Request:

```json
{
  "module": "clients",
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Error Responses

All error responses use this format:

```json
{
  "success": false,
  "error": "Human-readable message",
  "details": { "field": "specific reason" }
}
```

| HTTP Status | Meaning                                              |
| ----------- | ---------------------------------------------------- |
| `400`       | Bad request — validation error or missing field      |
| `401`       | Unauthorized — missing or expired JWT token          |
| `403`       | Forbidden — authenticated but insufficient role      |
| `404`       | Not found — resource does not exist for this company |
| `409`       | Conflict — duplicate unique value                    |
| `429`       | Too many requests — rate limit exceeded              |
| `500`       | Internal server error                                |

---

## Rate Limiting

| Limit               | Threshold                           |
| ------------------- | ----------------------------------- |
| Global (all routes) | 2000 requests per 15 minutes per IP |
| Login route         | 5 attempts per 15 minutes per IP    |

Rate limit response headers:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## CORS

- Development: allows `http://localhost:5000` (configured via `FRONTEND_URL`)
- Production: restricted to the value of `FRONTEND_URL` environment variable

---

## Pagination

All list endpoints return a `pagination` object:

```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150
  }
}
```

Clients calculate total pages as `Math.ceil(total / limit)`.

---

## Backup & Restore

> **Role Restriction:** All backup endpoints require `super_admin`, `company_admin`, or `company_owner` role.

### Get Backup Settings

```
GET /api/backups/settings
Authorization: Required
Role: super_admin, company_admin, company_owner
```

Response (200):

```json
{
  "success": true,
  "data": {
    "auto_backup_enabled": true,
    "backup_frequency": "Weekly",
    "retention_count": 3
  }
}
```

### Update Backup Settings

```
PUT /api/backups/settings
Authorization: Required
Role: super_admin, company_admin, company_owner
Content-Type: application/json
```

Request:

```json
{
  "auto_backup_enabled": true,
  "backup_frequency": "Weekly",
  "retention_count": 5
}
```

### Create Manual Backup

```
POST /api/backups/create
Authorization: Required
```

Response (200):

```json
{
  "success": true,
  "message": "Backup created successfully",
  "data": { "name": "BACKUP_24-05-2026_02-00_AM.zip" }
}
```

### List Backups

```
GET /api/backups/list
Authorization: Required
```

Response (200):

```json
{
  "success": true,
  "data": [
    {
      "name": "BACKUP_24-05-2026_02-00_AM.zip",
      "size": 15728640,
      "createdAt": "2026-05-24T02:00:00Z",
      "status": "Available",
      "type": "Full Backup"
    }
  ]
}
```

### Download Backup

```
GET /api/backups/download/:filename
Authorization: Required
```

Returns the `.zip` file as a download stream.

### Delete Backup

```
DELETE /api/backups/:filename
Authorization: Required
```

### Restore from Backup

```
POST /api/backups/restore
Authorization: Required
Content-Type: multipart/form-data OR application/json
```

Request (existing backup):

```json
{
  "filename": "BACKUP_24-05-2026_02-00_AM.zip"
}
```

OR upload a `.zip` file via multipart form with field name `file`.

> **Safety:** A pre-restore safety snapshot is automatically created before any restore operation.

---

## Best Practices

1. Always include the `Authorization` header on authenticated requests
2. Use pagination (`page` + `limit`) rather than fetching all records at once
3. Use the `search` query parameter to filter at the database level
4. Handle `401` responses by triggering a token refresh and retrying
5. Check `success: false` before accessing `data` in responses
6. Use the global search endpoint for cross-module lookups
