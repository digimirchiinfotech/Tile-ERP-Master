# Export Workflow Interconnection System

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Overview

The Export Workflow Interconnection System ensures seamless data flow and automatic inheritance across all export-related documents, eliminating manual re-entry and ensuring data consistency throughout the export process.

## Workflow Stages

```
Proforma Invoice
    ↓
Proforma Order (PO)
    ↓
Order Sheet (Production Tracking)
    ↓
QC Records
    ↓
IGST Invoice (Local Tax)
    ↓
Export Invoice
    ↓
Packing List (for verification)
    ↓
Export Invoice Annexure
    ↓
Invoice Backside
    ↓
VGM (Verified Gross Mass)
    ↓
Shipping Instructions
```

## Key Features

### Packing List Access

Packing List Management is now accessible to Superadmin, Company Admin, Sales Manager, Account, Purchase, and Administration roles. This ensures that all departments involved in the export fulfillment process can verify and manage shipping data. (Note: Sales Executives are restricted to CRM and Order management only).

### 1. **Automatic Data Inheritance**

- Data flows automatically from one stage to the next
- Previous stage data is pre-populated in the next stage
- No manual re-entry required
- Users can verify and modify inherited data

### 2. **Data Consistency & Integrity**

- Changes in one stage are automatically synced to dependent stages
- Validation ensures no data conflicts
- Complete audit trail of all modifications
- Prevents data duplication and mismatches

### 3. **Complete Traceability & UI Harmonization**

- Track which fields were inherited from which stage.
- View full workflow history and completion status at every stage.
- **Harmonization**: All six modules across the export lifecycle (From Packing List to Shipping Instructions) now feature a unified card-based layout, standardized blue header themes, and strict "Back / Save" action button placement at the base of every form to prevent disorientation.
- Inherited forms automatically parse complex inputs like dropdown dependencies (e.g. `Backside No.` parsing) seamlessly into nested objects.

### 4. **Mapping & Transformation Bridging**

- Core inheritance maps heavily rely on `exportMapper.js` (e.g. `exportMapper.mapPLToAnnexure()`) to resolve snake_case and camelCase discrepancies passing from Postgres to React Form state.
- Parsing handlers (e.g., `normalizeBackside`) implement strict internal try/catch boundaries when decoding payload structures (like JSON stringified `container_details`) to block structural collapse when the data reads as empty whitespace.

### 5. **Contextual Primary Key Routing ("Edit Profile Binding")**

- Navigational contexts securely relay explicit target components rather than depending solely on fuzzy relationship hooks. (e.g., `sessionStorage` passes explicit `backsideId` bindings to components, skipping abstract `exportInvoiceId` lookups which can inadvertently force creation-states on "Edit" routes when ID properties are dropped by external modules).

### 6. **Regulatory Field Inheritance & Master Fallbacks**

To ensure regulatory compliance across the document chain, the system implements a **Triple-Layer Fallback** for fields like `PERMISSION NO.`, `LUT ARN`, and `IEC`:

1. **Transaction Layer**: The system first checks for an override in the immediate parent document (e.g., Backside checks the Annexure).
2. **Lifecycle Layer**: If missing, it checks the root document (Export Invoice / Proforma Invoice).
3. **Master Layer (Fallback)**: If still missing, the backend dynamically fetches the global default from the **Company Master** record. This ensures that even if a user skips entering a permission number in the Annexure, it still appears correctly in the Backside and VGM documents.

## Backend Implementation

### Service: `exportWorkflowInterconnectionService.js`

Located at: `backend/src/services/exportWorkflowInterconnectionService.js`

#### Key Functions

```javascript
// Fetch complete workflow from Proforma Invoice through all stages
getCompleteWorkflowData(proformaInvoiceId, companyId);

// Fetch Export Invoice workflow with all downstream stages
getExportInvoiceWorkflow(exportInvoiceId, companyId);

// Get data for creating next stage (with auto-inherited fields)
getDataForNextStage(currentStage, documentId, companyId);

// Sync updates across related documents
syncUpdatesAcrossStages(documentId, stage, changedFields, companyId);

// Get workflow completion summary
getWorkflowCompletionSummary(exportInvoiceId, companyId);
```

### API Endpoints

All endpoints are protected with authentication and company filtering.

#### 1. Get Complete Workflow

```
GET /api/export-workflow/complete/:proformaInvoiceId
```

Returns all data from Proforma Invoice through all downstream stages.

**Response:**

```json
{
  "proformaInvoice": {
    /* Proforma Invoice data */
  },
  "exportInvoice": {
    /* Export Invoice data */
  },
  "packingList": {
    "header": {
      /* Packing List header */
    },
    "lines": [
      /* Packing List line items */
    ]
  },
  "annexure": {
    /* Annexure */
  },
  "backside": {
    /* Invoice Backside */
  },
  "vgm": {
    "header": {
      /* VGM header */
    },
    "containers": [
      /* Container details */
    ]
  },
  "shippingInstructions": {
    /* Shipping Instructions */
  },
  "workflowStatus": {
    "proformaCreated": true,
    "exportInvoiceCreated": true,
    "packingListCreated": true
    // ... etc
  }
}
```

#### 2. Get Export Invoice Workflow

```
GET /api/export-workflow/export-invoice/:exportInvoiceId
```

Returns Export Invoice and all downstream stages.

#### 3. Get Data for Next Stage

```
GET /api/export-workflow/next-stage/:stage/:documentId
```

Returns automatically inherited fields for the next stage.

**Stages:** `proforma_invoice`, `export_invoice`, `packing_list`, `vgm`

**Example Response:**

```json
{
  "export_invoice_id": "550e8400-e29b-41d4-a716-446655440000",
  "export_invoice_no": "EI/2026/001",
  "client_name": "Acme Corp",
  "country": "United States",
  "port_of_loading": "MUNDRA PORT",
  "gross_weight": 5000,
  "net_weight": 4800
  // ... more inherited fields
}
```

#### 4. Get Workflow Completion

```
GET /api/export-workflow/completion/:exportInvoiceId
```

Returns status of all stages for the export invoice.

**Response:**

```json
{
  "export_invoice_id": "550e8400-e29b-41d4-a716-446655440000",
  "invoice_no": "EI/2026/001",
  "export_invoice_status": "Finalized",
  "has_packing_list": true,
  "has_annexure": false,
  "has_backside": true,
  "has_vgm": true,
  "has_shipping_instructions": false,
  "completionPercentage": 60,
  "nextStages": {
    "packingList": "COMPLETE",
    "annexure": "PENDING",
    "backside": "COMPLETE",
    "vgm": "COMPLETE",
    "shippingInstructions": "PENDING"
  }
}
```

#### 5. Sync Updates

```
POST /api/export-workflow/sync
```

**Request Body:**

```json
{
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "stage": "export_invoice",
  "changedFields": ["gross_weight", "net_weight", "shipping_marks"]
}
```

**Response:**

```json
{
  "sourceDocument": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "stage": "export_invoice"
  },
  "syncedDocuments": [
    {
      "targetStage": "packing_list",
      "recordsUpdated": 1
    },
    {
      "targetStage": "vgm",
      "recordsUpdated": 1
    }
  ],
  "errors": []
}
```

#### 6. Get All Workflow Status

```
GET /api/export-workflow/status?search=&status=
```

Returns all export invoices with their workflow status.

**Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "invoice_no": "EI/2026/001",
    "invoice_date": "2026-02-07",
    "client_name": "Acme Corp",
    "export_invoice_status": "Finalized",
    "has_packing_list": true,
    "has_annexure": false,
    "has_backside": true,
    "has_vgm": true,
    "has_shipping_instructions": false,
    "completion_percentage": 60,
    "stages_completed": 3,
    "total_stages": 5,
    "workflow_status": "IN_PROGRESS",
    "last_stage_updated": "2026-02-07T10:30:00Z"
  }
]
```

## Frontend Implementation

### Hook: `useExportWorkflow.js`

Located at: `frontend/src/hooks/useExportWorkflow.js`

#### Usage

```javascript
import useExportWorkflow from "../hooks/useExportWorkflow";

function MyComponent() {
  const {
    workflowData,
    loading,
    error,
    fetchCompleteWorkflow,
    fetchExportInvoiceWorkflow,
    getDataForNextStage,
    getWorkflowCompletionStatus,
    syncUpdatesAcrossStages,
    fetchAllWorkflowStatus,
  } = useExportWorkflow();

  // Fetch complete workflow
  const handleFetchWorkflow = async () => {
    try {
      const data = await fetchCompleteWorkflow(proformaInvoiceId);
      console.log("Workflow data:", data);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  // Get data for next stage
  const handleGetNextStageData = async () => {
    try {
      const inheritedData = await getDataForNextStage(
        "export_invoice",
        documentId,
      );
      console.log("Inherited data:", inheritedData);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  // Sync updates
  const handleSyncUpdates = async () => {
    try {
      const result = await syncUpdatesAcrossStages(
        documentId,
        "export_invoice",
        ["gross_weight", "net_weight"],
      );
      console.log("Synced:", result);
    } catch (err) {
      console.error("Error:", err);
    }
  };
}
```

### Components

#### 1. ExportWorkflowProgressIndicator.jsx

Displays workflow completion status with visual progress indicators.

```jsx
import ExportWorkflowProgressIndicator from "../components/export-invoice/ExportWorkflowProgressIndicator";

<ExportWorkflowProgressIndicator
  completionData={completionStatus}
  exportInvoiceId={exportInvoiceId}
/>;
```

**Features:**

- Visual progress bar (0-100%)
- Stage-by-stage completion status
- Next pending stage indicator
- Completion status alerts

#### 2. InheritedDataDisplay.jsx

Shows inherited data with visibility and interaction options.

```jsx
import InheritedDataDisplay from "../components/export-invoice/InheritedDataDisplay";

<InheritedDataDisplay
  inheritedData={inheritedData}
  stage="packing_list"
  onFieldUse={(fieldName, value) => {
    // Handle field use
  }}
/>;
```

**Features:**

- Display all inherited fields
- Copy-to-clipboard for each field
- Visual distinction for inherited vs. new data
- Field name formatting and value display

## Data Flow Examples

### Example 1: Creating Packing List from Export Invoice

```javascript
// Frontend
const inheritedData = await getDataForNextStage(
  "export_invoice",
  exportInvoiceId,
);

// Now create packing list with inherited data
const packingListData = {
  // Inherited fields (pre-populated)
  export_invoice_id: inheritedData.export_invoice_id,
  export_invoice_no: inheritedData.export_invoice_no,
  gross_weight: inheritedData.gross_weight,
  net_weight: inheritedData.net_weight,
  shipping_marks: inheritedData.shipping_marks,

  // New fields entered by user
  packing_list_no: "PL/02/26/001",
  total_boxes: 20,
  total_pallets: 5,
  // ... etc
};

await createPackingList(packingListData);
```

### Example 2: Syncing Weight Changes

```javascript
// When user updates weight in Export Invoice
const changedData = {
  gross_weight: 5000,
  net_weight: 4800,
};

// Automatically sync to downstream documents
await syncUpdatesAcrossStages(
  exportInvoiceId,
  "export_invoice",
  Object.keys(changedData),
);

// Packing List and VGM weights are automatically updated
```

### Example 3: Getting Complete Workflow Status

```javascript
// Get status of all stages for an export invoice
const status = await getWorkflowCompletionStatus(exportInvoiceId);

console.log(`Completion: ${status.completionPercentage}%`);
console.log(`Packing List: ${status.has_packing_list ? "DONE" : "PENDING"}`);
console.log(`VGM: ${status.has_vgm ? "DONE" : "PENDING"}`);
console.log(`Next step: ${status.nextStages.packingList}`);
```

## Database Schema Notes

### Foreign Keys

All export-related tables have appropriate foreign keys:

- `packing_lists.export_invoice_id` → `export_invoices.id`
- `export_invoice_annexures.export_invoice_id` → `export_invoices.id`
- `invoice_backside.export_invoice_id` → `export_invoices.id`
- `vgm_documents.export_invoice_id` → `export_invoices.id`
- `shipping_instructions.export_invoice_id` → `export_invoices.id`

### Indexes

Performance indexes are created for efficient queries:

- `idx_packing_lists_export_invoice`
- `idx_export_invoice_annexures_export_invoice`
- `idx_vgm_documents_export_invoice`
- `idx_shipping_instructions_export_invoice`

---

## Product Line Type Normalization (Tiles vs. Sanitaryware)

Mixed-cargo shipments (containers with both tiles and sanitaryware) are supported through a type-aware normalization pipeline inside `frontend/src/utils/exportMapper.js`. The `normalizeProductLines()` function detects and routes each line item through the correct calculation branch.

### 1. Type Detection Logic

A product line is classified using two heuristics:

| Signal                                           | Classification                          |
| :----------------------------------------------- | :-------------------------------------- |
| `product_type === 'sanitaryware'` explicitly set | **Sanitaryware**                        |
| `sqm_per_box === 0` AND `totalBoxes > 0`         | **Sanitaryware** (structural inference) |
| `sqm_per_box > 0`                                | **Tile**                                |

### 2. Calculation Divergence by Product Type

| Metric               | Tile Path                | Sanitaryware Path                   |
| :------------------- | :----------------------- | :---------------------------------- |
| **Unit of Measure**  | SQM (square metres)      | Pieces (PCS)                        |
| **Box/Carton Count** | Direct box entry         | `cartons = pieces` (1-to-1 mapping) |
| **Area (SQM)**       | `boxes × sqm_per_box`    | **Bypassed** (set to 0)             |
| **CBM Volume**       | Optional via box presets | `pieces × cbm_per_piece`            |
| **Net Weight**       | `boxes × box_weight`     | `pieces × box_weight`               |
| **Line Amount**      | `total_sqm × rate`       | `pieces × rate`                     |

### 3. Container Grouping & Auto-Heal Rules

- **Container Fallback:** If product lines have no associated container records, the mapper auto-generates one container placeholder per product line using a default `20'` container type.
- **Single-Container VGM Auto-Heal:** When exactly one container is present during VGM→Shipping Instructions mapping, the mapper automatically overwrites that container's gross weight with the document-level total gross weight, fixing older records where VGM weights were inconsistently mapped.
- **Multi-Container Aggregation (Backside):** When mapping from Annexure to Invoice Backside, containers are grouped by the compound key `(container_no, line_seal_no, e_seal_no)`, merging weights, SQM, and box counts while preserving the first material description found.

---

## Best Practices

### 1. Always Fetch Complete Data Before Creating Next Stage

```javascript
const inheritedData = await getDataForNextStage("export_invoice", documentId);
// Transform via exportMapper:
const mappedData = exportMapper.mapAnnexureToBackside(inheritedData);
// Pre-populate forms with mappedData
```

### 2. Sync Updates When Critical Fields Change

```javascript
if (fieldsChanged(["gross_weight", "net_weight", "container_type"])) {
  await syncUpdatesAcrossStages(documentId, stage, changedFields);
}
```

### 3. Check Workflow Status Regularly

```javascript
const status = await getWorkflowCompletionStatus(exportInvoiceId);
if (status.completionPercentage === 100) {
  // Show "Workflow Complete" indicator
}
```

### 4. Handle Errors Gracefully

```javascript
try {
  const data = await fetchExportInvoiceWorkflow(invoiceId);
} catch (err) {
  if (err.response?.status === 404) {
    // Export invoice not found
  } else {
    // Other error
  }
}
```

## Troubleshooting

### Data Not Appearing in Next Stage

1. Verify Export Invoice is created and finalized
2. Check company filtering (ensure same company context)
3. Verify foreign key relationships in database
4. Check browser console for API errors

### Updates Not Syncing

1. Verify `syncUpdatesAcrossStages` is called with correct stage name
2. Check that changed fields are valid column names
3. Verify user has permission to update target documents
4. Check database for cascading update triggers

### Missing Workflow Status Data

1. Ensure all documents are created with proper foreign keys
2. Check that `export_invoice_id` is set correctly in child tables
3. Verify indexes are created for query performance
4. Check database logs for constraint violations

## Future Enhancements

1. **Real-time Sync**: Implement WebSocket for real-time updates across stages
2. **Workflow Rules Engine**: Add custom rules for data transformation
3. **Version Control**: Track all changes with version history
4. **Approval Workflow**: Add approval steps between stages
5. **Batch Operations**: Support bulk creation/update of multiple workflow stages
6. **Notification System**: Alert users when data is inherited or synced
7. **Data Validation**: Enhanced validation rules at each stage

## Migration Notes

The interconnection system uses existing tables with foreign key relationships. No new tables are required, but ensure:

- All export-related tables have `export_invoice_id` column
- Foreign key constraints are properly defined
- Indexes are created for performance
- Soft delete (`deleted_at`) columns are included where applicable

---

## 🛡️ Platform Standardization & Security Enforcements (2026 Core Upgrades)

### 1. Strict 1-to-1 Linear Workflow Locks

To prevent duplicated documents and preserve absolute relational integrity, the transaction pipeline is strictly locked downstream:

- **Validation Checkpoint:** Prior to document creation, the controller performs a transactional query to verify if the parent record’s `is_used` or `is_converted` column is already `TRUE`. If so, the request is aborted with a `400 Bad Request` validation error.
- **State Updates:** Upon a successful creation transaction, the parent document is locked by setting `is_used = TRUE`, `is_converted = TRUE`, `document_status = 'Converted'`, `status = 'Converted'`, and setting `linked_document_id = <child_id>`.

### 2. Programmatic Database Self-Healing (`check_db.js`)

- The system utilizes a programmatic schema-migration engine that connects to the master database and **each individual isolated tenant database pool** (e.g., `tile_erp_company_sun_corporation_9723`, `tile_erp_company_inska_9180`, etc.).
- It automatically scans all transactional tables (`proforma_invoices`, `export_invoices`, `packing_lists`, `export_invoice_annexures`, `invoice_backside`, `vgm_documents`, `shipping_instructions`) and appends any missing flow-tracking columns (`is_used`, `is_converted`, `linked_document_id`, `document_status`) dynamically.
- It sets index lookups (`CREATE INDEX`) to keep dropdown rendering times at $<5\text{ms}$.

### 3. Contextual Dropdown Reference Filters (`useExportDocumentReferences.js`)

- Dropdown selection lists retrieve only **valid and unused** records.
- During **creation modes**, already-converted parent documents are completely hidden from selection lists to avoid duplicate errors.
- During **edit modes**, the backend dynamically accepts a `currentId` query parameter, ensuring that the _active, currently linked_ parent record remains visible and selected in the dropdown form state, while all other used parents remain locked out.

### 4. Row-Level Tenant Security & Isolation (`dbRouter.js` / `auth.js`)

- The JWT verification middleware decodes the tenant identifier (`company_id`) and binds it strictly to `req.companyFilter`.
- Any attempt by a standard tenant user to bypass boundaries via header manipulation (`x-company-id`) is instantly blocked and rejected with a stealthy `404 Not Found` response.
- The query-level `dbRouter` intercepts all SQL queries and connects strictly to that company's isolated PostgreSQL pool, rendering cross-tenant data leaks physically impossible.

### 5. Self-Flushing Notification Toast System (`NotificationManager.jsx`)

- **Buffering Queue:** Incorporates an automated pending buffer queue (`pendingQueue`) that holds any user notifications triggered during boot, route changes, or before the view finishes mounting.
- **Self-Flushing:** As soon as the component completes mounting, it automatically flushes all pending toasts, preventing early alerts from being lost or dropped.
- **Premium UX/UI:** Featuring gorgeous glassmorphism overlays (`backdrop-filter`), spring slide-in entry animations (`cubic-bezier`), and tail-dyed color-coded left borders matching the notification severity level.

### 6. Enterprise Revision Control System

- The system enforces an immutable revision history for core documents like Proforma Invoices (PI) and Proforma Orders (PO).
- Upon editing a finalized PI, the version suffix increments (e.g., `-R1`, `-R2`), and a mandatory "Reason for Revision" audit log is captured.
- Event-driven synchronization automatically propagates PI revision flags (`REVISION_REQUIRED`) to any linked downstream Proforma Orders, notifying the purchase team and ensuring alignment before procurement continues.

### 7. Cross-Document Quantity Sync Safeguards

- **Invoice vs Annexure Validation:** To prevent documentation mismatches during shipping, the `exportInvoiceAnnexureController` enforces a strict structural comparison during Annexure generation.
- The system fetches golden source quantities (`total_boxes`, `total_sqm`, `net_weight`, `gross_weight`) directly from the parent `packing_lists` and `export_invoices`.
- Any deviation from these totals blocks the transaction with a hard-stop validation error, ensuring absolute data integrity before customs declarations are drafted.
