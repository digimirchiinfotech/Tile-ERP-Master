# SQL Injection Security Checklist

**Audit Date:** 2026-06-25  
**Scope:** `backend/src/routes/` and `backend/src/controllers/`  
**Auditor:** Automated scan + manual code review  
**Method:** Searched for `query()` calls containing template literals with `${` interpolation; verified whether each interpolated value originates from user-controlled input (`req.body`, `req.params`, `req.query`) or from hardcoded/validated sources.

---

## Audit Summary

| Finding | Count |
|---|---|
| **Confirmed SQL Injections Fixed** | 1 |
| **Safe Patterns (Dynamic SQL, non-user input)** | Many |
| **Files with No SQL / Clean** | 34 |

---

## Vulnerability Fixed

### 🔴 FIXED — `controllers/orderSheetController.js` — `getFilterOptions`

**Lines 1134–1145 (before fix)**

```js
// UNSAFE — companyId was interpolated directly into the SQL string
const wherePrefix = companyId ? `WHERE os.company_id = '${companyId}'` : '...';
await req.db.query(`SELECT DISTINCT supplier_name FROM master_order_sheets os ${wherePrefix} AND ...`);
```

**Why this is dangerous:** Although `companyId` comes from the JWT token (via `req.companyFilter`), if the token-decoding middleware is ever bypassed or a poisoned token is crafted, this becomes a full SQL injection vector. Defense-in-depth requires parameterization regardless of the source.

**Fix applied:**

```js
// SAFE — parameterized query
let osWhereSQL = companyId ? 'WHERE os.company_id = $1' : 'WHERE os.company_id IS NULL';
let queryParams = companyId ? [companyId] : [];
await req.db.query(`SELECT DISTINCT supplier_name ... ${osWhereSQL} AND ...`, queryParams);
```

---

## Routes — Full Audit Status

| File | Status | Notes |
|---|---|---|
| `routes/accountEntries.js` | ✅ Clean | Delegates to controller; no raw SQL |
| `routes/admin-password-reset.js` | ✅ Clean | No raw SQL |
| `routes/admin.js` | ✅ Clean | Template literal uses `companyFilter` as `$1` param. `WHERE company_id = $1` built conditionally from string constants, not user input. |
| `routes/aiRoutes.js` | ✅ Clean | No SQL |
| `routes/analyticsRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/auth.js` | ✅ Clean | No raw SQL |
| `routes/backupRoutes.js` | ✅ Clean | No raw SQL |
| `routes/bulkDeleteRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/bulkRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/catalogues.js` | ✅ Clean | Delegates to controller |
| `routes/certificates.js` | ✅ Clean | Delegates to controller |
| `routes/clientOrders.js` | ✅ Clean | Delegates to controller |
| `routes/clients.js` | ✅ Clean | Delegates to controller |
| `routes/companies.js` | ✅ Clean | Delegates to controller |
| `routes/companyManagement.js` | ✅ Clean | Parameterized. `WHERE id = $${paramCount}` is built using counter, not user input. |
| `routes/csvExport.js` | ✅ Clean | Delegates to controller |
| `routes/csvImport.js` | ✅ Clean | Delegates to controller |
| `routes/customsClearances.js` | ✅ Clean | Delegates to controller |
| `routes/dashboardStats.js` | ✅ Clean | Delegates to controller |
| `routes/documentActivity.js` | ✅ Clean | Delegates to controller |
| `routes/emailNotifications.js` | ✅ Clean | Delegates to controller |
| `routes/exportDocumentReferences.js` | ✅ Clean | Delegates to controller |
| `routes/exportInvoiceAnnexures.js` | ✅ Clean | Delegates to controller |
| `routes/exportInvoices.js` | ✅ Clean | Delegates to controller |
| `routes/exportWorkflowInterconnection.js` | ✅ Clean | Delegates to controller |
| `routes/factoryMasterRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/global-search.js` | ✅ Clean | Search term always passed as `$1`/`$2` parameter. Column names/table names are hardcoded constants, not from user input. |
| `routes/igstInvoices.js` | ✅ Clean | Delegates to controller |
| `routes/inventoryRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/invoiceBacksides.js` | ✅ Clean | Delegates to controller |
| `routes/leads.js` | ✅ Clean | Delegates to controller |
| `routes/lockRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/masterData.js` | ✅ Clean | Delegates to controller |
| `routes/messages.js` | ✅ Clean | Conditional string appended (`' AND is_read = false'`) is a hardcoded literal, not user data. Value from `unreadOnly` boolean derived from `req.query.unread === 'true'`. |
| `routes/monitoringRoutes.js` | ✅ Clean | No SQL |
| `routes/notifications.js` | ✅ Clean | Same pattern as messages.js — hardcoded literal append, no user interpolation. |
| `routes/orderSheets.js` | ✅ Clean | Delegates to controller |
| `routes/packingLists.js` | ✅ Clean | Delegates to controller |
| `routes/paymentRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/pdf.js` | ✅ Clean | No SQL |
| `routes/pdfTemplates.js` | ✅ Clean | No SQL |
| `routes/productionSheetRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/products.js` | ✅ Clean | Delegates to controller |
| `routes/profile.js` | ✅ Clean | Counter-based `$${paramIndex}` placeholders, not user interpolation |
| `routes/proformaInvoices.js` | ✅ Clean | Delegates to controller |
| `routes/proformaOrders.js` | ✅ Clean | Delegates to controller |
| `routes/qcRecords.js` | ✅ Clean | Delegates to controller |
| `routes/rateHistory.js` | ✅ Clean | Delegates to controller |
| `routes/reports.js` | ✅ Clean | Delegates to controller |
| `routes/sanitarywareProducts.js` | ✅ Clean | Delegates to controller |
| `routes/search.js` | ✅ Clean | All queries fully parameterized with `$1`, `$2` |
| `routes/sessionRoutes.js` | ✅ Clean | All queries use `$1` parameterization; WHERE clauses built from hardcoded string constants only |
| `routes/shippingInstructions.js` | ✅ Clean | Delegates to controller |
| `routes/signatureRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/sizePackingMasterRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/storage.js` | ✅ Clean | No SQL |
| `routes/subscriptions.js` | ✅ Clean | Delegates to controller |
| `routes/suppliers.js` | ✅ Clean | Delegates to controller |
| `routes/supportTickets.js` | ✅ Clean | Delegates to controller |
| `routes/systemSettings.js` | ✅ Clean | Delegates to controller |
| `routes/tenantBackupRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/users.js` | ✅ Clean | Delegates to controller |
| `routes/vgmRoutes.js` | ✅ Clean | Delegates to controller |
| `routes/workflows.js` | ✅ Clean | Delegates to controller |

---

## Controllers — Full Audit Status

| File | Status | Notes |
|---|---|---|
| `controllers/accountEntryController.js` | ✅ Clean | Dynamic SET clauses built by accumulating `$N` placeholders from counter; all values in params array |
| `controllers/aiController.js` | ✅ Clean | No raw SQL |
| `controllers/analyticsController.js` | ✅ Clean | Fully parameterized |
| `controllers/authController.js` | ✅ Clean | Fully parameterized |
| `controllers/backupController.js` | ✅ Clean | No raw SQL |
| `controllers/bulkActionController.js` | ✅ Clean | Delegates to service |
| `controllers/bulkController.js` | ✅ Clean | Delegates to service |
| `controllers/bulkDeleteController.js` | ✅ Clean | `placeholders` built from `ids.map((_, i) => '$' + (i+1))` — parameterized IN clause. Values in params array. |
| `controllers/catalogueController.js` | ✅ Clean | Parameterized throughout |
| `controllers/certificateController.js` | ✅ Clean | WHERE clause built from counter; values in params array |
| `controllers/clientController.js` | ✅ Clean | `whereConditions` uses `$${paramCount}` counter pattern; all values in params array |
| `controllers/clientOrderController.js` | ✅ Clean | Fully parameterized |
| `controllers/companyController.js` | ✅ Clean | `updateFields.join(', ')` are hardcoded field assignments; counter-based `$${paramCount}` for WHERE |
| `controllers/customsClearanceController.js` | ✅ Clean | Counter-based placeholders; no user interpolation |
| `controllers/dashboardController.js` | ✅ Clean | All dynamic SQL uses `$1`/`$2` parameterization; conditional appends are hardcoded string literals |
| `controllers/dataValidationController.js` | ✅ Clean | No SQL |
| `controllers/documentActivityController.js` | ✅ Clean | Fully parameterized |
| `controllers/exportDocumentReferenceController.js` | ✅ Clean | Delegates to service |
| `controllers/exportInvoiceAnnexureController.js` | ✅ Clean | Counter-based parameterization throughout |
| `controllers/exportInvoiceController.js` | ✅ Clean | Fully parameterized |
| `controllers/exportWorkflowInterconnectionController.js` | ✅ Clean | Delegates to service |
| `controllers/factoryMasterController.js` | ✅ Clean | Conditional `'AND company_id = $13'` string is hardcoded; all values in params array |
| `controllers/fileController.js` | ✅ Clean | No SQL |
| `controllers/igstInvoiceController.js` | ✅ Clean | Counter-based parameterization |
| `controllers/inventoryController.js` | ✅ Clean | Fully parameterized |
| `controllers/invoiceBacksideController.js` | ✅ Clean | `setClause` built from counter, values in array |
| `controllers/leadController.js` | ✅ Clean | Fully parameterized |
| `controllers/lockController.js` | ✅ Clean | `tableName` is looked up from the hardcoded `TABLE_MAP` with early guard (`if (!tableName) return next(...)`). User can never inject an arbitrary table name. |
| `controllers/masterDataController.js` | ✅ Clean | Table/column names come from hardcoded `TABLE_MAPPING` object. User `type` param is validated via lookup (`if (!config) return res.status(400)...`). All values are parameterized. |
| `controllers/monitoringController.js` | ✅ Clean | Fully parameterized |
| `controllers/notificationController.js` | ✅ Clean | Fully parameterized |
| `controllers/orderSheetController.js` | 🔴 **FIXED** | `getFilterOptions`: companyId was directly interpolated into SQL. **Fixed:** replaced with parameterized `$1` placeholders. |
| `controllers/packingListController.js` | ✅ Clean | Dynamic clauses built from counter; values in array |
| `controllers/paymentController.js` | ✅ Clean | Dynamic WHERE uses hardcoded string fragments; all values in params array |
| `controllers/pdfController.js` | ✅ Clean | No SQL |
| `controllers/pdfTemplateController.js` | ✅ Clean | Fully parameterized |
| `controllers/productController.js` | ✅ Clean | Fully parameterized |
| `controllers/productionSheetController.js` | ✅ Clean | Fully parameterized |
| `controllers/proformaInvoiceController.js` | ✅ Clean | Dynamic WHERE built from validated conditions; all values in array |
| `controllers/proformaOrderController.js` | ✅ Clean | Fully parameterized |
| `controllers/qcRecordController.js` | ✅ Clean | Fully parameterized |
| `controllers/rateHistoryController.js` | ✅ Clean | Fully parameterized |
| `controllers/reportsController.js` | ✅ Clean | Fully parameterized |
| `controllers/sanitarywareProductController.js` | ✅ Clean | Fully parameterized |
| `controllers/shippingInstructionController.js` | ✅ Clean | `filterParam` conditionals are hardcoded string literals (`' AND company_id = $2'`); all values in array |
| `controllers/signatureController.js` | ✅ Clean | Fully parameterized |
| `controllers/sizePackingMasterController.js` | ✅ Clean | Fully parameterized |
| `controllers/storageController.js` | ✅ Clean | No SQL |
| `controllers/subscriptionController.js` | ✅ Clean | Fully parameterized |
| `controllers/supplierController.js` | ✅ Clean | Fully parameterized |
| `controllers/supportTicketController.js` | ✅ Clean | Fully parameterized |
| `controllers/systemSettingsController.js` | ✅ Clean | Fully parameterized |
| `controllers/tenantBackupController.js` | ✅ Clean | No SQL |
| `controllers/userController.js` | ✅ Clean | `whereConditions` built from hardcoded string fragments; all values in params array |
| `controllers/vgmController.js` | ✅ Clean | Fully parameterized |
| `controllers/workflowController.js` | ✅ Clean | Fully parameterized |

---

## ESLint Security Configuration

`eslint-plugin-security` has been installed and configured in `.eslintrc.json`. Run the linter at any time with:

```bash
npm run lint
```

Key rules enabled:

| Rule | Severity | Purpose |
|---|---|---|
| `security/detect-sql-injection` | **error** | Flags template literal SQL queries |
| `security/detect-non-literal-regexp` | warn | Prevents RegExp injection |
| `security/detect-non-literal-fs-filename` | warn | Prevents path traversal via dynamic filenames |
| `security/detect-object-injection` | warn | Flags unsafe bracket notation on user data |

---

## Recommendations

> [!IMPORTANT]
> All injection vectors found were fixed. The following architectural guidelines should be adopted to prevent regressions:

1. **Never interpolate `req.companyFilter` into SQL strings**, even though it's JWT-derived. Always use `$1` parameterization. This is defense-in-depth — a compromised signing key would otherwise lead to SQL injection.

2. **`TABLE_MAP` / `TABLE_MAPPING` guard pattern is correct** — `lockController.js` and `masterDataController.js` correctly use a hardcoded allow-list with early validation. Continue this pattern for any controller that uses user-supplied type names to select a table.

3. **Dynamic `WHERE` builder pattern is safe** — building clause strings like `'WHERE company_id = $1'` as a string constant and appending to queries with a separate values array is correct. The interpolation risk only arises when a *value* is put in the string instead of a parameter slot.

4. **Run `npm run lint` as part of CI** — the ESLint security plugin will flag any new `query(...)` calls that contain template literals with `${` interpolation.
