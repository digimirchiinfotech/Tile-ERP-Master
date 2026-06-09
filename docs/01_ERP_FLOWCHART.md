# Tile Exporter Solution — System Architecture & Process Flow

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Project Overview

**Tile Exporter Solution** is an enterprise-grade, multi-tenant B2B SaaS platform for managing the complete export lifecycle of tiles, sanitaryware, and faucet products — from lead capture to post-shipment documentation.

| Property | Detail |
|----------|--------|
| Type | Multi-Tenant B2B SaaS |
| Database | PostgreSQL (per-tenant isolation) |
| Frontend | React 18 + Vite + Bootstrap 5 |
| Backend | Node.js 20 + Express |
| Roles | 11 RBAC roles |
| Modules | 22 core modules |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│          TILE EXPORTER SOLUTION — MULTI-TENANT ARCHITECTURE     │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐        ┌──────────────────────┐
    │    FRONTEND LAYER   │        │    BACKEND LAYER     │
    │─────────────────────│        │──────────────────────│
    │  React 18 + Vite    │        │  Node.js + Express   │
    │  Bootstrap 5        │◄──────►│  JWT Authentication  │
    │  Role-based UI      │        │  RBAC (10 roles)     │
    │  Global Search      │        │  Rate Limiting       │
    │  PDF Print Views    │        │  Audit Logging       │
    └─────────────────────┘        └──────────────────────┘
             │ Port 5000                      │ Port 8000
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
           ┌──────────────────────────────────┐
           │     PostgreSQL Database Layer    │
           │──────────────────────────────────│
           │  Master DB  — company registry   │
           │  Tenant DB  — per-company data   │
           │  50+ tables per tenant           │
           │  Migration-managed schema        │
           └──────────────────────────────────┘
```

---

## Multi-Tenancy Architecture

Each company (tenant) registered on the platform receives a fully isolated database. The backend routes requests through `companyDatabaseRouter.js` which connects to the appropriate tenant database based on the authenticated user's company context.

```
Master Database
  └── companies table (tenant registry)

Per-Tenant Database (one per company)
  ├── users
  ├── clients / leads / suppliers
  ├── products / catalogues
  ├── proforma_invoices / proforma_orders
  ├── export_invoices / packing_lists
  ├── qc_records / certificates
  ├── vgm / shipping_instructions
  ├── account_entries / payments
  └── audit_logs / notifications
```

---

## Export Management Process Flow

The system follows a structured, sequential export documentation workflow. Each stage feeds the next, with data auto-populated from upstream records.

```
SALES PIPELINE
  │
  ├── Lead Management
  │     ↓ (convert to client)
  └── Client Management
        │
        ▼
QUOTATION & ORDER
  │
  ├── Product Catalog
  │
  ├── Proforma Invoice (PI)
  │     ↓ (convert to order)
  └── Proforma Order (PO)
        │
        ▼
PRODUCTION & PLANNING
  │
  ├── Order Sheet (Factory Assignment)
  │     ├── Capacity Planning
  │     └── Log Production
        │
        ▼
QUALITY CONTROL
  │
  └── QC Records & Certificates (Linked to Order Sheet)
        │
        ▼
EXPORT DOCUMENTATION & TAX
  │
  ├── IGST Invoice (Local Tax & E-way Bill Document)
  │
  ├── Export Invoice ──────────────────────────────────┐
  │     │                                              │
  │     ├── Invoice Backside (GST/Customs Annexure)    │
  │     └── Export Annexure                            │
  │                                                    │
  ├── Packing List                                     │
  │     └── Pallet Management                         │
  │                                                    │
  ├── VGM (Verified Gross Mass)                       │
  │                                                    │
  └── Shipping Instructions ──────────────────────────┘
        │
        ▼
  └── Finance & Accounts
        ├── Payment tracking
        ├── Account entries
        └── Analytics & Reports
```

---

## Core Modules

### 1. Dashboard
Role-specific landing page showing relevant KPIs. Includes:
- Open orders count
- Pending QC records
- Shipments in progress
- Outstanding payments
- Click-to-navigate cards

### 2. Lead Management
- Lead capture with source tracking
- Status progression (New → Qualified → Converted)
- Conversion to client record
- CSV import/export
- Pipeline analytics

### 3. Client Management
- Full client profile (contact, GST, bank details)
- Consignee and buyer details
- Credit limit and credit days
- Document upload
- Dependency-checked deletion (blocked if active invoices exist)

### 4. Supplier Management
- Supplier profiles with contact information
- Payment terms and purchase history
- CSV import/export

### 5. Tile & Sanitaryware Products
- **Tile Catalog:** Manage specs (size, thickness, surface, coverage, box weight, and box-to-sqm packing rules).
- **Sanitaryware Catalog:** Manage specs (category, model/item reference, color, size, base piece weight, and base CBM-per-piece).
- **Auto-Calculations:** Dynamic calculations for tiles (based on SQM area and boxes) and sanitaryware (based on individual pieces mapped to cartons).
- **Unified Master Lookup:** Dynamic HSN/tariff code resolution via company master data registries (removing legacy hardcoded overrides).
- **Pricing & Stock:** Client-specific pricing structures, stock level tracking, and image galleries.

### 6. Product Catalogue
- Versioned, client-facing product catalogs
- Client-specific pricing per catalog
- Archive and restore capability

### 7. Proforma Invoice (PI)
- Multi-line item invoicing
- Shipping terms: FOB, CIF, CNF, Ex-Works
- GST and customs calculations
- Auto-locked when converted to Proforma Order

### 8. Proforma Order (PO)
- Derived from Proforma Invoice
- Terms and conditions inherited from PI
- Auto-locked when Order Sheet is created

### 8b. Order Sheet (Production & Planning)
- Links directly to Proforma Order and specific Factories/Suppliers
- Tracks production capacity, sizing, and daily production logging
- Acts as the central hub for factory assignments

### 9. QC Records
- Inspection logs with pass/fail tracking
- Defect documentation with photos and notes
- Linked directly to specific Order Sheets
- Certificate linkage

### 10. IGST Invoice
- Domestic/Tax invoice for transportation to port (E-way bill processing)
- Derived from Proforma Invoice or Export Invoice
- Manages local GST calculations before export

### 10b. Export Invoice
- Primary export document
- Linked to downstream: Packing List, Annexure, Backside, VGM, Shipping Instructions
- Auto-locks when any downstream document is created

### 11. Invoice Backside
- GST/customs annexure page attached to Export Invoice
- Regulatory compliance data

### 12. Export Annexure
- Supplementary export annexure data
- Auto-populated from Export Invoice fields

### 13. Packing List
- Box-to-item mapping with quantity verification
- Barcode tracking
- Net and gross weight calculations


### 15. VGM (Verified Gross Mass)
- Container and vessel data
- Verified weight submission
- Linked to Export Invoice

### 16. Shipping Instructions
- Carrier and forwarder details
- Container and routing information
- Linked to Export Invoice


### 21. Finance & Accounts
- Payment recording and history
- Account entry management
- Analytics dashboard with revenue and shipment insights

### 22. User Management
- User creation and role assignment
- Password management
- Activity audit trail

---

## Role-Based Access Control

| Role | Access Scope |
|------|-------------|
| `super_admin` | Full system access across all modules and companies |
| `company_admin` | Full access within their company |
| `sales_manager` | Leads, clients, PI, PO, export documents, packing |
| `sales_executive` | Sales Dashboard, Orders, CRM, Personal/Assigned Records |
| `qc` / `qc_inspector` | QC records, products, certificates |
| `account` | Finance, invoices, export documents |
| `purchase_manager` | PO, pallets, products, suppliers |
| `administration` | Admin Dashboard, Product Catalogue, System, Exports, Operational Context |
| `export_documents` | Export invoices, packing lists, products, PI |
| `client` | Client orders, catalogues, products, PI (read) |
| ... | (11 roles total) |

---

## Document Locking Rules

The platform enforces a strict, linear 1-to-1 pipeline lock progression across all transactional documents to prevent duplicates and ensure relational lineage:

| Document | Locks When | Downstream Child Record |
| :--- | :--- | :--- |
| **Proforma Invoice (PI)** | Converted to Proforma Order / Export Invoice. | Export Invoice |
| **Proforma Order (PO)** | Order Sheet is created against it. | Order Sheet |
| **Order Sheet** | QC Record is created against it. | QC Record |
| **Export Invoice (EI)** | Converted to Packing List (`is_used = TRUE`). | Packing List |
| **Packing List (PL)** | Converted to Annexure (`is_used = TRUE`). | Annexure |
| **Annexure (ANX)** | Converted to Invoice Backside (`is_used = TRUE`). | Invoice Backside |
| **Invoice Backside (IB)** | Converted to VGM Document (`is_used = TRUE`). | VGM Document |
| **VGM Document (VGM)** | Converted to Shipping Instructions (`is_used = TRUE`).| Shipping Instructions |

Locked documents cannot be edited or converted duplicate times, displaying a clear lock message with direct navigation links to their child records.


---

## Audit Logging

All CRUD operations are logged via `backend/src/middleware/auditLog.js`:
- Records old and new values for every change
- Captures user ID, IP address, and timestamp
- Login and logout events tracked
- Viewable in the admin Audit Log Viewer (System Settings)

---

## Data Consistency

The consistency check service (`backend/src/services/consistencyCheckService.js`) validates:
- Total mismatches between invoice and packing list quantities
- Orphaned records (packing lists without export invoices)
- Missing required references across related documents

Accessible via System Settings → Data Consistency Checker.

---

## Technology Stack Detail

### Frontend
- **React 18** — Component-based UI
- **Vite** — Fast build tooling with HMR
- **Bootstrap 5** — Responsive grid and UI components
- **Lucide Icons** — Icon library
- **Axios** — HTTP client with interceptors for auth
- **Custom CSS** — Print layouts for export documents

### Backend
- **Node.js 20** — JavaScript runtime
- **Express** — Web framework
- **bcryptjs** — Password hashing
- **jsonwebtoken** — JWT generation and validation
- **multer** — File upload handling
- **helmet** — Security headers
- **express-rate-limit** — API rate limiting
- **morgan** — HTTP request logging
- **pg** — PostgreSQL client

### Database
- **PostgreSQL** — Primary datastore
- **Sequential migrations** — Schema managed via `backend/src/database/migrate.js`
- **Per-tenant isolation** — Each company has its own database connection

---

*For detailed API reference, see [05_API_DOCUMENTATION.md](05_API_DOCUMENTATION.md).*  
*For deployment instructions, see [07_PRODUCTION_DEPLOYMENT_GUIDE.md](07_PRODUCTION_DEPLOYMENT_GUIDE.md).*
