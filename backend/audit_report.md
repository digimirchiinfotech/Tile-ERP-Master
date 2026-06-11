# Tile ERP End-to-End Data Flow Audit Report

Following an exhaustive end-to-end automated and manual analysis of the Tile ERP codebase, including the 140KB `schema.sql`, backend controllers, frontend components, and PDF/Excel generation utilities, this report highlights critical discrepancies, data leakage risks, and mapping mismatches across the platform.

## Executive Summary
The most critical findings involve **Frontend-to-Backend CamelCase vs Snake_case Mismatches** resulting in silent data loss, **Missing Tables/Columns** in the backend controllers that crash on execution, and widespread **Multi-Tenant Leakage Risks** where `company_id` is omitted from `WHERE` clauses on tenant-specific tables.

---

## 🔴 Critical Issues

### 1. Silent Data Loss: Frontend/Backend Field Name Mismatch
**Impact:** High risk of data loss. User profile updates and settings fail to persist.
**Details:** The frontend `ProfileSettings.jsx` and `CompanyProfile.jsx` send payload properties in `camelCase`, but `companyController.js` expects `snake_case`. Because Node.js destructuring yields `undefined` for missing keys, these fields are silently ignored during `UPDATE` queries.
**Affected Fields:**
- `iecNo` → `iec_no`
- `contactNumber` → `contact_number`
- `bankName` → `bank_name`
- `accountHolderName` → `account_holder_name`
- `accountNumber` → `account_number`
- `swiftCode` → `swift_code`
- `bankAddress` → `bank_address`
- `lutArnNo` → `lut_arn_no`
- `lutDate` → `lut_date`
**Recommendation:** Add a payload normalization middleware to transform `camelCase` to `snake_case` before controller destructuring, or update frontend components to explicitly send `snake_case` payloads.

### 2. Missing Database Tables Referenced by Controllers
**Impact:** API endpoints crash with HTTP 500 when attempting to query non-existent tables.
**Details:** Several backend controllers execute `INSERT/SELECT/UPDATE` statements against tables that *do not exist* in `schema.sql`.
**Affected Tables:**
- `active_user_sessions` (Referenced in `authController.js`)
- `password_reset_tokens` (Referenced in `authController.js`)
- `export_invoice_proforma_links` (Referenced in `exportInvoiceController.js`)
- `igst_invoices` (Referenced in `igstInvoiceController.js`)
- `stock_register` & `stock_reservations` (Referenced in `inventoryController.js`)
- `production_entries` & `qc_inspections` (Referenced in `productionSheetController.js`)
- `master_order_sheets` & `master_order_sheet_lines` (Referenced in `orderSheetController.js` and `qcRecordController.js`)
- `company_signatures` (Referenced in `signatureController.js`)
- `tenant_backups` (Referenced in `tenantBackupController.js`)
**Recommendation:** Either create migrations to add these tables to `schema.sql` or deprecate the endpoints if these features were scrapped.

---

## 🟠 High Issues (Data Leakage & Security Risks)

### 1. Multi-Tenant `company_id` Data Leakage
**Impact:** Cross-tenant data exposure. Users from Company A can view or modify records from Company B if they guess the UUID.
**Details:** Over 280 queries in backend controllers execute against tenant-specific tables (e.g., `proforma_invoices`, `clients`, `leads`, `users`) without explicitly validating `WHERE company_id = $1` or applying `req.companyFilter`.
**High-Risk Examples:**
- `aiController.js` (Lines 46 & 50): Queries `proforma_invoices` and `qc_records` solely by `id`.
- `authController.js` (Line 260): Checks `users` by `email_id` globally without tenant context, potentially allowing users to reset passwords or log into the wrong tenant context if emails are not globally unique.
- `paymentController.js` (Lines 27, 56, 90): Fetches `export_invoices` by `invoiceId` without ensuring the invoice belongs to the requesting user's company.
- `bulkDeleteController.js` (Multiple Lines): Executes bulk deletes against `export_invoices` and `proforma_orders` filtering only by `client_id` or `supplier_id`.
**Recommendation:** Implement Row-Level Security (RLS) policies at the PostgreSQL level, or strictly enforce a `withTenant` wrapper around all `req.db.query` calls to automatically append `AND company_id = $1`.

### 2. Missing Schema Columns (Controller Mismatches)
**Impact:** Database schema validation errors on `INSERT`/`UPDATE`.
**Details:** Controllers reference columns that are missing from `schema.json`.
- `catalogue_products`: Missing `product_type` column (`catalogueController.js`).
- `audit_logs`: Controllers try to insert `entity_type`, `entity_id`, and `details`, but the schema expects `resource_type`, `resource_id`, and `changes`.
- `system_settings`: Missing `is_sensitive` column.
**Recommendation:** Standardize the `audit_logs` column nomenclature in controllers to match the schema, and run migrations for missing product catalogue fields.

---

## 🟡 Medium Issues

### 1. Unmapped Frontend Form Fields (Ghost Fields)
**Impact:** User inputs data into frontend forms that is never saved to the database.
**Details:** Several forms collect data that does not have a corresponding database column.
- `OrderSheetModals.jsx` collects `shipment_date`, `internal_notes`, and `container_no`, but these fields do not exist in the `order_sheets` table.
- `SupportTicketForm.jsx` collects `userName`, but the ticket schema does not support explicit user name tracking (relies on relation).
**Recommendation:** Add these fields to the database schema or store them in a flexible `JSONB` column like `metadata` or `settings`.

### 2. Document Locking Bypass Risks
**Impact:** Locked documents can be modified.
**Details:** While Document Locking (`is_locked`) exists in the schema (e.g., `export_invoices.is_locked`), many `UPDATE` queries in `exportInvoiceController.js` (e.g., Line 1279) and `proformaInvoiceController.js` update records using `WHERE id = $1` without adding `AND is_locked = false`.
**Recommendation:** Enforce locking at the database level using Triggers, or apply a centralized middleware that blocks `PUT/PATCH/DELETE` requests to locked resource IDs.

---

## 🟢 Low Issues / Performance Bottlenecks

### 1. N+1 Query Patterns
**Details:** `companyController.js:127` executes separate iterative queries to fetch tenant metrics (leads count, orders count, qc count) per request instead of aggregating them in a joined materialized view or subquery.
**Recommendation:** Utilize PostgreSQL `LATERAL` joins or cached summary tables.

### 2. Unused Columns
**Details:** `users.permissions` is often queried but RBAC logic in `authController` appears to rely heavily on the `role` enum. This column is underutilized.
**Recommendation:** Clean up legacy columns if RBAC is strictly role-based.

---

## Recommended Action Plan

1. **Immediate (Next 24h):** Add `company_id` filters to all `SELECT` and `UPDATE` queries in `paymentController`, `aiController`, and `bulkDeleteController` to patch immediate cross-tenant data leakage risks.
2. **High Priority (This Week):** Update `ProfileSettings.jsx` to map CamelCase state keys to Snake_Case payload keys before sending `PUT` requests to the API.
3. **Medium Priority:** Write PostgreSQL migrations to add missing tables (`stock_register`, `production_entries`, `igst_invoices`) and missing columns (`audit_logs` normalization).
4. **Long Term:** Implement Row-Level Security (RLS) on PostgreSQL `company_id` columns to prevent application-layer query omissions from leaking data.
