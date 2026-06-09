# API Routes Documentation

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Base Path

All routes are prefixed with `/api`. The only exceptions are:

```
GET  /health                      # Health check (no auth required)
GET  /api/docs                    # Swagger UI (no auth required)
```

All other routes require a valid JWT access token in the `Authorization: Bearer <token>` header unless stated otherwise.

---

## Route Index

```
/api/ai
/api/auth
/api/users
/api/clients
/api/client-orders
/api/products
/api/catalogues
/api/leads
/api/invoices                     (alias for /api/proforma-invoices)
/api/proforma-invoices
/api/orders                       (alias for /api/proforma-orders)
/api/proforma-orders
/api/qc-records
/api/suppliers
/api/master-data
/api/export-invoices
/api/export-invoice-annexures
/api/invoice-backsides
/api/packing-lists
/api/pallets
/api/vgm
/api/export-shipping-instructions
/api/shipping-instructions        (alias for /api/export-shipping-instructions)
/api/export-customs-clearances
/api/export-bills-of-lading
/api/export-certificates
/api/export-post-shipment-docs
/api/export-documents
/api/export-workflow
/api/account-entries
/api/analytics
/api/reports
/api/payments
/api/subscriptions
/api/notifications
/api/system-settings
/api/companies
/api/users
/api/support-tickets
/api/pdf-templates
/api/workflows
/api/rate-history
/api/session
/api/search
/api/global-search
/api/bulk-delete
/api/dashboard-stats
/api/messages
/api/profile
/api/admin
/api/admin-password-reset
/api/backups
/api/csv-export
/api/csv-import
/api/email-notifications
/api/dev                          (development only)
```

---

## Authentication

### POST /api/auth/login

Login with email and password.

**Public — no token required.**

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

### POST /api/auth/register

Register a new user account.

**Public — no token required.**

Request:

```json
{
  "name": "Jane Doe",
  "email_id": "jane@example.com",
  "password": "Password@123",
  "contact_number": "+91-9999999999",
  "company_id": "uuid"
}
```

### POST /api/auth/refresh-token

Exchange a refresh token for a new access token.

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

### POST /api/auth/logout

Invalidate the current session.

---

## Users

```
GET    /api/users                  # List all users (super_admin, company_admin)
POST   /api/users                  # Create user (super_admin, company_admin)
GET    /api/users/:id              # Get user by ID
PUT    /api/users/:id              # Update user
DELETE /api/users/:id              # Soft-delete user (super_admin, company_admin)
```

---

## Clients

```
GET    /api/clients                # List clients (paginated, searchable)
GET    /api/clients/:id            # Get client details
POST   /api/clients                # Create client
PUT    /api/clients/:id            # Update client
DELETE /api/clients/:id            # Soft-delete client
```

Query parameters for listing:

- `page` (default: 1)
- `limit` (default: 10)
- `search` — searches client name, email
- `status` — filter by status

---

## Client Orders

```
GET    /api/client-orders          # List client purchase orders
GET    /api/client-orders/:id      # Get order details
POST   /api/client-orders          # Create order
PUT    /api/client-orders/:id      # Update order
DELETE /api/client-orders/:id      # Soft-delete order
```

---

## Products

```
GET    /api/products               # List products
GET    /api/products/:id           # Get product details
POST   /api/products               # Create product
PUT    /api/products/:id           # Update product
DELETE /api/products/:id           # Soft-delete product
```

---

## Catalogues

```
GET    /api/catalogues             # List catalogues
GET    /api/catalogues/:id         # Get catalogue details
POST   /api/catalogues             # Create catalogue
PUT    /api/catalogues/:id         # Update catalogue
DELETE /api/catalogues/:id         # Delete catalogue
```

---

## Leads

```
GET    /api/leads                  # List leads
GET    /api/leads/:id              # Get lead details
POST   /api/leads                  # Create lead
PUT    /api/leads/:id              # Update lead
DELETE /api/leads/:id              # Delete lead
PATCH  /api/leads/:id/status       # Update lead status
```

---

## Proforma Invoices

Available at both `/api/proforma-invoices` and `/api/invoices` (alias).

```
GET    /api/proforma-invoices              # List proforma invoices
GET    /api/proforma-invoices/:id          # Get invoice details with line items
POST   /api/proforma-invoices              # Create proforma invoice
PUT    /api/proforma-invoices/:id          # Update proforma invoice
DELETE /api/proforma-invoices/:id          # Soft-delete invoice
PATCH  /api/proforma-invoices/:id/status   # Update invoice status
GET    /api/proforma-invoices/:id/pdf      # Generate PDF
```

Notes:

- `status` query parameter accepts a single value or comma-separated list: `?status=Approved,Finalized`
- Status matching is case-insensitive
- Using `status=Approved` also returns documents with status `Finalized`, `Ready`, or `Active`

---

## Proforma Orders

Available at both `/api/proforma-orders` and `/api/orders` (alias).

```
GET    /api/proforma-orders                # List proforma orders
GET    /api/proforma-orders/:id            # Get order details
POST   /api/proforma-orders                # Create proforma order
PUT    /api/proforma-orders/:id            # Update order
DELETE /api/proforma-orders/:id            # Soft-delete order
PATCH  /api/proforma-orders/:id/status     # Update order status
GET    /api/proforma-orders/:id/pdf        # Generate PDF
```

---

## QC Records

```
GET    /api/qc-records             # List QC inspection records
GET    /api/qc-records/:id         # Get QC record details
POST   /api/qc-records             # Create QC record
PUT    /api/qc-records/:id         # Update QC record
DELETE /api/qc-records/:id         # Delete QC record
```

---

## Suppliers

```
GET    /api/suppliers              # List suppliers
GET    /api/suppliers/:id          # Get supplier details
POST   /api/suppliers              # Create supplier
PUT    /api/suppliers/:id          # Update supplier
DELETE /api/suppliers/:id          # Delete supplier
```

---

## Master Data

```
GET    /api/master-data            # Get all reference/master data
GET    /api/master-data/:type      # Get master data by type (e.g., countries, ports, hs_codes)
POST   /api/master-data            # Create master data entry
PUT    /api/master-data/:id        # Update master data entry
DELETE /api/master-data/:id        # Delete master data entry
```

---

## Export Invoices

```
GET    /api/export-invoices               # List export invoices
GET    /api/export-invoices/:id           # Get export invoice details
POST   /api/export-invoices               # Create export invoice
PUT    /api/export-invoices/:id           # Update export invoice
DELETE /api/export-invoices/:id           # Soft-delete export invoice
PATCH  /api/export-invoices/:id/status    # Update export invoice status
GET    /api/export-invoices/:id/pdf       # Generate PDF
```

---

## Export Invoice Annexures

```
GET    /api/export-invoice-annexures             # List annexures
GET    /api/export-invoice-annexures/:id         # Get annexure details
POST   /api/export-invoice-annexures             # Create annexure
PUT    /api/export-invoice-annexures/:id         # Update annexure
DELETE /api/export-invoice-annexures/:id         # Delete annexure
GET    /api/export-invoice-annexures/:id/pdf     # Generate PDF
```

---

## Invoice Backsides

```
GET    /api/invoice-backsides              # List invoice backside documents
GET    /api/invoice-backsides/:id          # Get backside details
POST   /api/invoice-backsides              # Create backside document
PUT    /api/invoice-backsides/:id          # Update backside document
DELETE /api/invoice-backsides/:id          # Delete backside document
GET    /api/invoice-backsides/:id/pdf      # Generate PDF
```

---

## Packing Lists

```
GET    /api/packing-lists          # List packing lists
GET    /api/packing-lists/:id      # Get packing list details with line items
POST   /api/packing-lists          # Create packing list
PUT    /api/packing-lists/:id      # Update packing list
DELETE /api/packing-lists/:id      # Delete packing list
GET    /api/packing-lists/:id/pdf  # Generate PDF
```

---

## Pallets

```
GET    /api/pallets                # List pallet records
GET    /api/pallets/:id            # Get pallet details
POST   /api/pallets                # Create pallet record
PUT    /api/pallets/:id            # Update pallet record
DELETE /api/pallets/:id            # Delete pallet record
```

---

## VGM (Verified Gross Mass)

```
GET    /api/vgm                    # List VGM records
GET    /api/vgm/:id                # Get VGM record details
POST   /api/vgm                    # Create VGM record
PUT    /api/vgm/:id                # Update VGM record
DELETE /api/vgm/:id                # Delete VGM record
GET    /api/vgm/:id/pdf            # Generate VGM certificate PDF
```

---

## Shipping Instructions

Available at both `/api/export-shipping-instructions` and `/api/shipping-instructions` (alias).

```
GET    /api/export-shipping-instructions           # List shipping instructions
GET    /api/export-shipping-instructions/:id       # Get details
POST   /api/export-shipping-instructions           # Create shipping instruction
PUT    /api/export-shipping-instructions/:id       # Update
DELETE /api/export-shipping-instructions/:id       # Delete
GET    /api/export-shipping-instructions/:id/pdf   # Generate PDF
```

---

## Customs Clearances

```
GET    /api/export-customs-clearances          # List customs clearance records
GET    /api/export-customs-clearances/:id      # Get details
POST   /api/export-customs-clearances          # Create record
PUT    /api/export-customs-clearances/:id      # Update record
DELETE /api/export-customs-clearances/:id      # Delete record
```

---

## Bills of Lading

```
GET    /api/export-bills-of-lading             # List bills of lading
GET    /api/export-bills-of-lading/:id         # Get details
POST   /api/export-bills-of-lading             # Create bill of lading
PUT    /api/export-bills-of-lading/:id         # Update
DELETE /api/export-bills-of-lading/:id         # Delete
GET    /api/export-bills-of-lading/:id/pdf     # Generate PDF
```

---

## Export Certificates

```
GET    /api/export-certificates                # List export certificates
GET    /api/export-certificates/:id            # Get certificate details
POST   /api/export-certificates                # Create certificate
PUT    /api/export-certificates/:id            # Update certificate
DELETE /api/export-certificates/:id            # Delete certificate
GET    /api/export-certificates/:id/pdf        # Generate PDF
```

---

## Post-Shipment Documents

```
GET    /api/export-post-shipment-docs          # List post-shipment documents
GET    /api/export-post-shipment-docs/:id      # Get document details
POST   /api/export-post-shipment-docs          # Create document
PUT    /api/export-post-shipment-docs/:id      # Update document
DELETE /api/export-post-shipment-docs/:id      # Delete document
```

---

## Export Document References

```
GET    /api/export-documents                   # List document references
GET    /api/export-documents/:id               # Get reference details
POST   /api/export-documents                   # Create reference
PUT    /api/export-documents/:id               # Update reference
DELETE /api/export-documents/:id               # Delete reference
```

---

## Export Workflow Interconnection

```
GET    /api/export-workflow/complete/:proformaInvoiceId
       # Full workflow from Proforma Invoice through all stages

GET    /api/export-workflow/export-invoice/:exportInvoiceId
       # Export Invoice and all downstream stages

GET    /api/export-workflow/next-stage/:stage/:documentId
       # Pre-populated fields for the next workflow stage
       # Stages: proforma_invoice | export_invoice | packing_list | vgm

GET    /api/export-workflow/completion/:exportInvoiceId
       # Completion percentage and status per stage

GET    /api/export-workflow/status
       # All export invoices with workflow status
       # Query: ?search=&status=

POST   /api/export-workflow/sync
       # Sync changed fields to downstream documents
       # Body: { documentId, stage, changedFields: [] }
```

---

## Account Entries (Finance Ledger)

```
GET    /api/account-entries        # List finance ledger entries
GET    /api/account-entries/:id    # Get entry details
POST   /api/account-entries        # Create entry
PUT    /api/account-entries/:id    # Update entry
DELETE /api/account-entries/:id    # Delete entry
```

---

## Analytics

```
GET    /api/analytics/overview     # Business overview metrics
GET    /api/analytics/sales        # Sales analytics
GET    /api/analytics/exports      # Export volume analytics
GET    /api/analytics/clients      # Client analytics
GET    /api/analytics/products     # Product performance analytics
```

---

## Reports

```
GET    /api/reports                # List available reports
GET    /api/reports/:type          # Generate specific report
POST   /api/reports/export         # Export report to PDF/CSV
```

---

## Dashboard Statistics

```
GET    /api/dashboard-stats        # Aggregated dashboard metrics (counts, totals, recent activity)
```

---

## Payments

```
GET    /api/payments               # List payment records
POST   /api/payments/create-order  # Create PayPal order
POST   /api/payments/capture       # Capture PayPal payment
POST   /api/payments/webhook       # PayPal webhook handler
```

---

## Subscriptions

```
GET    /api/subscriptions          # Get current subscription details
POST   /api/subscriptions          # Create/upgrade subscription
PUT    /api/subscriptions/:id      # Update subscription
DELETE /api/subscriptions/:id      # Cancel subscription
```

---

## Notifications

```
GET    /api/notifications          # List in-app notifications for current user
POST   /api/notifications          # Create notification
PATCH  /api/notifications/:id/read # Mark notification as read
POST   /api/notifications/read-all # Mark all notifications as read
DELETE /api/notifications/:id      # Delete notification
```

---

## System Settings

```
GET    /api/system-settings        # Get company system settings
PUT    /api/system-settings        # Update system settings (super_admin, company_admin)
```

---

## Companies

```
GET    /api/companies              # List companies (super_admin only)
GET    /api/companies/:id          # Get company details
POST   /api/companies              # Create/provision new company
PUT    /api/companies/:id          # Update company
DELETE /api/companies/:id          # Deactivate company
```

---

## Support Tickets

```
GET    /api/support-tickets        # List support tickets
GET    /api/support-tickets/:id    # Get ticket details
POST   /api/support-tickets        # Create support ticket
PUT    /api/support-tickets/:id    # Update ticket
PATCH  /api/support-tickets/:id/status  # Update ticket status
```

---

## PDF Templates

```
GET    /api/pdf-templates          # List PDF branding templates
GET    /api/pdf-templates/:id      # Get template details
POST   /api/pdf-templates          # Create template
PUT    /api/pdf-templates/:id      # Update template
DELETE /api/pdf-templates/:id      # Delete template
```

---

## Workflows (Status Tracking)

```
GET    /api/workflows              # List workflow status records
GET    /api/workflows/:id          # Get workflow details
PUT    /api/workflows/:id          # Update workflow stage
```

---

## Rate History

```
GET    /api/rate-history           # List historical rates (currency, freight, etc.)
POST   /api/rate-history           # Add rate entry
```

---

## Session

```
GET    /api/session                # Get current session info
DELETE /api/session                # Invalidate current session
```

---

## Search

```
GET    /api/search?q=term          # Full-text search (deduplicated result set)
GET    /api/global-search?q=term   # Global search across all modules
                                   # Minimum 2 characters required
                                   # Returns: clients, products, invoices, orders, leads
```

---

## Bulk Operations

```
POST   /api/bulk-delete            # Bulk soft-delete records by IDs
                                   # Body: { module: "clients", ids: ["uuid1", "uuid2"] }
```

---

## AI Assistant

```
POST   /api/ai/query               # Natural language business query
                                   # Body: { prompt: "What are my top clients this month?" }
                                   # Returns: { answer: "..." }
```

---

## Profile

```
GET    /api/profile                # Get current user profile
PUT    /api/profile                # Update profile (name, contact, avatar)
PUT    /api/profile/password       # Change password
```

---

## Admin

```
GET    /api/admin/users            # Admin: list all users across companies
POST   /api/admin/users            # Admin: create user
GET    /api/admin/stats            # Admin: platform-wide statistics
```

```
POST   /api/admin-password-reset   # Admin-initiated password reset
```

---

## Messages

```
GET    /api/messages               # List internal messages
POST   /api/messages               # Send message
DELETE /api/messages/:id           # Delete message
```

---

## Email Notifications

```
POST   /api/email-notifications/send       # Send email notification
GET    /api/email-notifications/templates  # List email templates
```

---

## Backup & Restore

> **Role Restriction:** All backup routes require `super_admin`, `company_admin`, or `company_owner` role.

```
GET    /api/backups/settings                # Get backup configuration
PUT    /api/backups/settings                # Update backup configuration
POST   /api/backups/create                  # Create manual backup (pg_dump + uploads → .zip)
GET    /api/backups/list                     # List all available backup files
GET    /api/backups/download/:filename       # Download backup .zip file
DELETE /api/backups/:filename                # Delete a specific backup file
POST   /api/backups/restore                  # Restore system from backup
                                             # Body: { filename } OR multipart upload (.zip)
                                             # Auto-creates safety snapshot before restore
```

---

## CSV Import / Export

```
POST   /api/csv-import/:module     # Import data from CSV file
GET    /api/csv-export/:module     # Export module data as CSV
                                   # Modules: clients, products, leads, proforma-invoices, etc.
```

---

## Development Only

```
GET    /api/dev/reset-db           # Reset database (development only, NODE_ENV=development)
GET    /api/dev/seed               # Re-seed data (development only)
```

These routes are only registered when `NODE_ENV=development`.

---

## Standard Error Responses

| Status | Meaning                                                           |
| ------ | ----------------------------------------------------------------- |
| `400`  | Bad request — validation failure, missing required field          |
| `401`  | Unauthorized — missing or invalid JWT token                       |
| `403`  | Forbidden — valid token but insufficient role/permissions         |
| `404`  | Not found — resource does not exist or belongs to another company |
| `409`  | Conflict — duplicate unique value (email, document number)        |
| `429`  | Too many requests — rate limit exceeded                           |
| `500`  | Internal server error                                             |

Error response format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": { "field": "specific reason" }
}
```
