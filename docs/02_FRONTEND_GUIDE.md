# Frontend Development Guide — React + Vite

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Overview

React 18 + Vite single-page application for the Tile Exporter Solution.

- **Port:** 5000 (development)
- **Framework:** React 18 + Bootstrap 5
- **Build Tool:** Vite
- **Icons:** Lucide React
- **Routing:** Switch-case navigation in `App.jsx` (no react-router)
- **Auth:** JWT stored in localStorage via `tokenManager`
- **Design:** Enterprise Compact UI with Stacked Discovery filters

---

## Project Structure

```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── docs.html
│   └── import-templates/          # CSV import template files
└── src/
    ├── App.jsx                     # Root component: routing, auth, global search, session
    ├── main.jsx                    # Entry point
    ├── components/
    │   ├── account-finance-management/
    │   │   ├── AccountEntryForm.jsx
    │   │   └── AccountFinanceDashboard.jsx
    │   ├── ai/
    │   │   └── AIAssistant.jsx
    │   ├── analytics/
    │   │   ├── AnalyticsDashboard.jsx
    │   │   └── SalesAnalytics.jsx
    │   ├── auth/
    │   │   ├── SimpleLoginForm.jsx
    │   │   ├── SimpleLoginForm.css
    │   │   ├── SignupForm.jsx
    │   │   ├── ForgotPasswordForm.jsx
    │   │   └── ResetPasswordForm.jsx
    │   ├── catalogue-management/
    │   │   ├── CatalogueDashboard.jsx
    │   │   ├── CatalogueForm.jsx
    │   │   ├── CatalogueView.jsx
    │   │   └── CataloguePrintView.jsx
    │   ├── client-management/
    │   │   ├── ClientDashboard.jsx
    │   │   ├── ClientForm.jsx
    │   │   └── ClientView.jsx
    │   ├── client-order-management/
    │   │   ├── ClientOrderDashboard.jsx
    │   │   └── ClientOrderForm.jsx
    │   ├── common/                 # Reusable UI primitives
    │   │   ├── BackButton.jsx
    │   │   ├── DateRangeFilter.jsx
    │   │   ├── DependencyCheckModal.jsx
    │   │   ├── PaginationControls.jsx
    │   │   ├── SessionWarningModal.jsx
    │   │   ├── SessionWarningModal.css
    │   │   ├── StatsCard.jsx
    │   │   ├── StatusBadge.jsx
    │   │   └── ValidationErrorModal.jsx
    │   ├── export-invoice/         # Export invoice and all linked docs
    │   │   ├── ExportInvoiceDashboard.jsx
    │   │   ├── ExportInvoiceForm.jsx
    │   │   ├── ExportInvoicePrintView.jsx
    │   │   ├── ExportInvoiceAnnexureDashboard.jsx
    │   │   ├── ExportInvoiceAnnexureForm.jsx
    │   │   ├── ExportInvoiceAnnexurePrintView.jsx
    │   │   ├── InvoiceBacksideDashboard.jsx
    │   │   ├── InvoiceBacksideForm.jsx
    │   │   ├── InvoiceBacksidePrintView.jsx
    │   │   ├── PackingListForm.jsx
    │   │   ├── PackingListPrintView.jsx
    │   │   ├── VGMDashboard.jsx
    │   │   ├── VGMForm.jsx
    │   │   ├── VGMPrintView.jsx
    │   │   ├── ShippingInstructionForm.jsx
    │   │   ├── ExportDocumentReferenceSelector.jsx
    │   │   ├── ExportWorkflowProgressIndicator.jsx
    │   │   └── InheritedDataDisplay.jsx
    │   ├── export-management/      # Post-invoice shipment pages
    │   │   ├── ExportOverviewPage.jsx
    │   │   ├── BillOfLadingPage.jsx
    │   │   ├── PostShipmentDocsPage.jsx
    │   │   ├── ShippingInstructionsPage.jsx
    │   │   └── ShippingInstructionsForm.jsx
    │   ├── invoice-management/
    │   ├── layout/
    │   │   └── Breadcrumbs.jsx
    │   ├── lead-management/
    │   ├── messages/
    │   ├── notifications/
    │   │   └── NotificationsPage.jsx
    │   ├── packing-list/
    │   │   ├── PackingListDashboard.jsx
    │   │   ├── PackingListForm.jsx
    │   │   ├── PackingListView.jsx
    │   │   └── PackingListPrintView.jsx
    │   ├── pallet-management/
    │   │   ├── PalletDashboard.jsx
    │   │   └── PalletForm.jsx
    │   ├── payments/
    │   ├── product-management/
    │   ├── profile/
    │   ├── proforma-invoice/
    │   ├── proforma-order/
    │   ├── qc-management/
    │   ├── salesperson-management/
    │   ├── shared/                 # Shared layout & feature components
    │   │   ├── Sidebar.jsx
    │   │   ├── TopBar.jsx
    │   │   ├── ProperTopBar.jsx
    │   │   ├── ProperTopBar.css
    │   │   ├── Layout.jsx
    │   │   ├── Button.jsx
    │   │   ├── Button.css
    │   │   ├── GlobalSearch.jsx
    │   │   ├── EnhancedGlobalSearch.jsx
    │   │   ├── SearchResults.jsx
    │   │   ├── NotificationDropdown.jsx
    │   │   ├── NotificationDropdown.css
    │   │   ├── NotificationManager.jsx
    │   │   ├── EnhancedNotificationSystem.jsx
    │   │   ├── NotificationSystem.jsx
    │   │   ├── RoleBasedDashboard.jsx
    │   │   ├── ERPFlowchart.jsx
    │   │   ├── ErrorBoundary.jsx
    │   │   ├── AccessDenied.jsx
    │   │   ├── LoadingSpinner.jsx
    │   │   ├── FilterSection.jsx
    │   │   ├── BulkActionBar.jsx
    │   │   ├── BulkActionBar.css
    │   │   ├── ConfirmationModal.jsx
    │   │   ├── DynamicDropdown.jsx
    │   │   ├── AddableDropdown.jsx
    │   │   ├── EnhancedFormField.jsx
    │   │   ├── ImportModal.jsx
    │   │   ├── CSVImportExport.jsx
    │   │   ├── DataValidator.jsx
    │   │   ├── ClientModal.jsx
    │   │   ├── SupplierModal.jsx
    │   │   ├── PDFUpload.jsx
    │   │   ├── ImageUpload.jsx
    │   │   ├── ImageUploadServer.jsx
    │   │   ├── SingleImageUpload.jsx
    │   │   ├── QCMediaUpload.jsx
    │   │   ├── ProductLineCard.jsx
    │   │   ├── ProductLineTable.jsx         # Tile product line entry table (SQM/box-based)
    │   │   ├── SanitarywareProductLineTable.jsx  # Sanitaryware entry table (piece/carton-based)
    │   │   ├── ProductManagement.jsx
    │   │   ├── RateHistoryManager.jsx
    │   │   ├── WorkflowTracker.jsx
    │   │   ├── SystemHealth.jsx
    │   │   ├── KeyboardShortcuts.jsx
    │   │   ├── GuidedTour.jsx
    │   │   ├── QuickActions.jsx
    │   │   ├── QuickStartGuide.jsx
    │   │   ├── ThemeProvider.jsx
    │   │   ├── VirtualizedTable.jsx
    │   │   └── InteractiveButton.jsx
    │   ├── super-admin/
    │   ├── supplier-management/
    │   ├── support/
    │   ├── system-settings/
    │   │   ├── AuditLogViewer.jsx
    │   │   └── ConsistencyChecker.jsx
    │   └── user-management/
    ├── config/
    │   ├── rolePermissions.js      # RBAC permission map per role
    │   ├── fieldPlaceholders.js    # Shared form placeholder text
    │   ├── companyConfig.js        # Company-level settings
    │   └── securityHeaders.js      # CSP and security config
    ├── contexts/
    │   └── UserContext.jsx         # Global auth state (user, role, company)
    ├── hooks/                      # Custom React hooks
    │   ├── useAuthState.js
    │   ├── useClients.js
    │   ├── useLeads.js
    │   ├── useProducts.js
    │   ├── useCatalogues.js
    │   ├── useInvoices.js
    │   ├── useOrders.js
    │   ├── useQCRecords.js
    │   ├── usePackingLists.js
    │   ├── usePallets.js
    │   ├── useSuppliers.js
    │   ├── useUsers.js
    │   ├── useCompanies.js
    │   ├── useMasterData.js
    │   ├── useShippingInstructions.js
    │   ├── useAccountEntries.js
    │   ├── useRateHistory.js
    │   ├── useProfile.js
    │   ├── useWorkflows.js
    │   ├── useSubscriptions.js
    │   ├── useSupportTickets.js
    │   ├── useSystemSettings.js
    │   ├── useExportWorkflow.js
    │   ├── useExportDocumentReferences.js
    │   ├── useDocumentNumber.js
    │   ├── useSessionManager.js
    │   ├── useActivityTracker.js
    │   ├── useFormValidation.js
    │   ├── useErrorModal.js
    │   ├── useBulkOperations.js
    │   └── useMultiSelect.js
    ├── services/                   # Axios API client functions
    │   ├── api.js                  # Axios instance with auth interceptors
    │   ├── authAPI.js
    │   ├── clientService.js
    │   ├── leadService.js
    │   ├── productService.js
    │   ├── productImageService.js
    │   ├── invoiceService.js
    │   ├── orderService.js
    │   ├── packingListService.js
    │   ├── palletService.js
    │   ├── supplierService.js
    │   ├── companyService.js
    │   ├── qcService.js
    │   ├── searchService.js
    │   ├── masterDataService.js
    │   ├── notificationAPI.js
    │   ├── shippingInstructionService.js
    │   ├── postShipmentDocService.js
    │   ├── rateHistoryService.js
    │   ├── roleBasedDataService.js
    │   ├── subscriptionService.js
    │   ├── supportTicketService.js
    │   ├── systemSettingsService.js
    │   ├── userService.js
    │   ├── workflowService.js
    │   └── dataSyncManager.js
    ├── styles/
    │   ├── global.css
    │   ├── theme.css
    │   ├── responsive.css          # Breakpoints: 768px, 576px, 420px
    │   ├── invoice-print.css       # Print layout for export invoices
    │   └── print-packing-list.css  # Print layout for packing lists
    └── utils/
        ├── tokenManager.js         # JWT access/refresh token management
        ├── RequestManager.js       # Deduplication and cancellation
        ├── dataTransformer.js
        ├── dataTransformers.js
        ├── dataTransform.js
        ├── formatters.js           # Date, currency, number formatting
        ├── validators.js
        ├── validation.js
        ├── validationHelper.js
        ├── formValidation.js
        ├── permissionChecks.js     # RBAC helper functions
        ├── exportUtils.js          # CSV/PDF export helpers
        ├── exportDataService.js
        ├── exportMapper.js         # Data inheritance mapper: PI→EI→PL→ANX→IB→VGM→SI
        ├── textTransformMiddleware.js  # Global uppercase transformation (excl. emails, passwords, URLs, UUIDs)
        ├── importUtils.js
        ├── inputHelpers.js
        ├── pdfGenerator.js
        ├── clientConfig.js
        ├── passwordResetUtils.js
        ├── helpers.jsx
        ├── renderStars.jsx
        └── supportTicketService.js
```

---

## Environment Configuration

### vite.config.js

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
```

### Environment Variables (.env)

```
VITE_API_BASE_URL=/api
VITE_APP_NAME=Tile Exporter Solution
VITE_APP_VERSION=2.0.0
```

---

## Routing Architecture

There is no react-router in this project. All routing is handled in `App.jsx` via a switch-case on the `currentView` state variable.

```jsx
// App.jsx (simplified)
const [currentView, setCurrentView] = useState("dashboard");

const navigate = (view, params = {}) => {
  setCurrentView(view);
  setNavParams(params);
};

// Switch-case renders the appropriate component
switch (currentView) {
  case "dashboard":
    return <RoleBasedDashboard />;
  case "clients":
    return <ClientDashboard />;
  case "client-form":
    return <ClientForm />;
  case "export-invoices":
    return <ExportInvoiceDashboard />;
  // ... all other views
}
```

`Sidebar.jsx` and all components call `navigate()` to change the view. The `navigate` function is passed down as a prop.

---

## Component Architecture

### Module Pattern

Each module follows this consistent structure:

```
module-name/
├── ModuleDashboard.jsx    # List view with search, filters, pagination
├── ModuleForm.jsx         # Create / Edit form
├── ModuleView.jsx         # Read-only detail view
└── ModulePrintView.jsx    # Print-optimised PDF layout (where applicable)
```

### Dashboard Component Pattern

```jsx
const ClientDashboard = ({ navigate }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ preset: "all" });
  const [currentPage, setCurrentPage] = useState(1);

  const { clients, loading, error, fetchClients, deleteClient } = useClients();

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h2>Clients</h2>
        <Button onClick={() => navigate("client-form")}>Add Client</Button>
      </div>

      {/* Filters */}
      <div className="filter-card">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* KPI cards */}
      <div className="stats-card">...</div>

      {/* Data table */}
      <div className="table-card">
        <table>...</table>
        <PaginationControls page={currentPage} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
};
```

### Form Component Pattern (Strict Guidelines)

When creating or modifying forms (e.g. `ClientForm`, `ProductForm`), adherence to strict HTML/React standards is mandatory to prevent silent failures and `500 Internal Server Errors`.

**CRITICAL RULE - Button Typographies**:
Any button inside a `<form>` that is NOT intended to submit the payload (e.g. Back, Cancel, Add Row, Close Modal) **MUST** explicitly declare `type="button"`. Failure to do so defaults to `type="submit"`, causing unintended form submissions that bypass JavaScript validation arrays and subsequently crash the backend.

**CRITICAL RULE - Validation Errors**:
All forms should employ the standard `ValidationErrorModal` when catching HTTP 400 Bad Request responses to provide the user with clear feedback instead of silent failure.

```jsx
import ValidationErrorModal from "../common/ValidationErrorModal.jsx";

const ClientForm = ({ clientId, navigate }) => {
  const [formData, setFormData] = useState({ client_name: "", country: "" });
  const [errors, setErrors] = useState({});
  const [validationModal, setValidationModal] = useState({
    show: false,
    errors: [],
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault(); // Always prevent default in onSubmit wrapper
    setSaving(true);
    try {
      await clientService.createClient(formData);
      navigate("clients");
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors) {
        setValidationModal({ show: true, errors: err.response.data.errors });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSave}>
        <input
          name="client_name"
          value={formData.client_name}
          onChange={handleChange}
        />

        {/* CRITICAL: Explicit type="button" to prevent implicit submission */}
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("clients")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          Save
        </Button>
      </form>

      <ValidationErrorModal
        show={validationModal.show}
        errors={validationModal.errors}
        onHide={() => setValidationModal({ show: false, errors: [] })}
      />
    </>
  );
};
```

---

## Custom Hooks

All data fetching is encapsulated in custom hooks under `src/hooks/`.

```javascript
// hooks/useClients.js
export const useClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchClients = async (filters = {}) => {
    setLoading(true);
    try {
      const res = await clientService.getClients(filters);
      setClients(res.data?.data?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { clients, loading, error, fetchClients };
};
```

---

## API Service Layer

### Axios Instance (`services/api.js`)

```javascript
import axios from "axios";
import { tokenManager } from "../utils/tokenManager";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 30000,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const newToken = await tokenManager.refreshToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api(error.config);
    }
    return Promise.reject(error);
  },
);

export default api;
```

### Service Files (`services/`)

Each service file maps to one backend resource:

```javascript
// services/clientService.js
import api from "./api";

export const clientService = {
  getClients: (params) => api.get("/clients", { params }),
  getClient: (id) => api.get(`/clients/${id}`),
  createClient: (data) => api.post("/clients", data),
  updateClient: (id, data) => api.put(`/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/clients/${id}`),
};
```

---

## Global State — UserContext

`src/contexts/UserContext.jsx` holds the authenticated user state:

```jsx
export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, name, role, company_id }
  const [loading, setLoading] = useState(true);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

// Usage
const { user } = useContext(UserContext);
```

---

## Role-Based Access Control

The system enforces a strict 11-role access control model. Permissions are defined in `src/config/rolePermissions.js` and checked via `src/utils/permissionChecks.js`.

```javascript
// config/rolePermissions.js
export const rolePermissions = {
  super_admin: { all: true },
  company_admin: { all: true },
  sales_manager: {
    leads: true,
    clients: true,
    proforma: true,
    export: true,
    orders: true,
  },
  sales_executive: { leads: true, clients: true, orders: true }, // Restricted to CRM & Orders
  administration: { products: true, catalogue: true, export: true, qc: true }, // Full oversight
  qc: { qc: true, products: true },
  account: { finance: true, invoices: true, export: true },
  purchase: { po: true, pallets: true, suppliers: true },
  // ... (11 roles total)
};

// utils/permissionChecks.js
export const hasPermission = (role, module) => {
  const perms = rolePermissions[role];
  return perms?.all === true || perms?.[module] === true;
};
```

`Sidebar.jsx` uses this to render only the menu items the current user can access.

---

## Token Management

`src/utils/tokenManager.js` manages JWT tokens stored in localStorage:

```javascript
export const tokenManager = {
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  },
  getAccessToken: () => localStorage.getItem("accessToken"),
  getRefreshToken: () => localStorage.getItem("refreshToken"),
  clearTokens: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
  refreshToken: async () => {
    const token = localStorage.getItem("refreshToken");
    const res = await api.post("/auth/refresh-token", { refreshToken: token });
    const { accessToken, refreshToken } = res.data;
    tokenManager.setTokens(accessToken, refreshToken);
    return accessToken;
  },
};
```

---

## UI Design System

### CSS Classes

| Class          | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `.page-header` | Consistent top section with title and action buttons |
| `.stats-card`  | Animated KPI card with hover transform               |
| `.filter-card` | Search and filter section container                  |
| `.table-card`  | Data table wrapper (no hover animation)              |

### Responsive Breakpoints

| Breakpoint   | Width   |
| ------------ | ------- |
| Desktop      | > 768px |
| Tablet       | ≤ 768px |
| Mobile       | ≤ 576px |
| Small mobile | ≤ 420px |

### Shared Components

| Component                             | Purpose                                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button.jsx`                          | Standard button with loading/disabled states                                                                                                                                                      |
| `DateRangeFilter.jsx`                 | Preset date range picker (Today/Week/Month/Quarter/All)                                                                                                                                           |
| `PaginationControls.jsx`              | Page navigation for data tables                                                                                                                                                                   |
| `StatsCard.jsx`                       | Animated KPI metric card                                                                                                                                                                          |
| `StatusBadge.jsx`                     | Coloured status label                                                                                                                                                                             |
| `BackButton.jsx`                      | Consistent back navigation                                                                                                                                                                        |
| `DependencyCheckModal.jsx`            | Warning when deleting records with dependencies                                                                                                                                                   |
| `ValidationErrorModal.jsx`            | Form validation error summary                                                                                                                                                                     |
| `SessionWarningModal.jsx`             | Session timeout warning                                                                                                                                                                           |
| `BulkActionBar.jsx`                   | Actions bar for multi-selected records                                                                                                                                                            |
| `ProductLineTable.jsx`                | **Tile Product Lines Table:** SQM/box-based entry table for ceramic tile order lines. Calculates total boxes, SQM coverage, net/gross weights.                                                    |
| `SanitarywareProductLineTable.jsx`    | **Sanitaryware Products Table:** Piece/carton-based entry for sanitaryware items. Supports model no., color, category, auto-fills weight/CBM from product master. Inline image preview via modal. |
| `AddableDropdown.jsx`                 | **Master-Data-Driven Dropdown:** Dynamic dropdown with inline add-new capability, backed by `masterDataService`. Used for HSN codes, tariff codes, payment terms.                                 |
| `NotificationManager.jsx`             | **Self-Flushing Notification Manager:** Translucent, glassmorphic toast notification component with an active `pendingQueue` buffering early alerts during bootstrap/transition phases.           |
| `ExportDocumentReferenceSelector.jsx` | **Linear Workflow Selector:** Dropdown selector component with automated selected record preservation (`activeCurrentId`) during creation and edit states.                                        |

### Print Styles

- `styles/invoice-print.css` — Print layout for Export Invoice and linked docs
- `styles/print-packing-list.css` — Print layout for Packing List

Each module with print support has a dedicated `*PrintView.jsx` component optimised for A4 output.

---

## Common Patterns

### Loading & Error States

```jsx
{
  loading && <LoadingSpinner />;
}
{
  error && <div className="alert alert-danger">{error}</div>;
}
{
  !loading && !error && <DataTable data={data} />;
}
```

### Auto-Refresh

```javascript
useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

### Search Debounce

```javascript
useEffect(() => {
  const timer = setTimeout(() => fetchClients({ search: searchTerm }), 400);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

### Dependency-Safe Delete

```jsx
const handleDelete = async (id) => {
  const check = await clientService.checkDependencies(id);
  if (check.hasDependencies) {
    setDependencyModal({ show: true, details: check });
    return;
  }
  await clientService.deleteClient(id);
  fetchClients();
};
```

---

## Development

### Start (Development)

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5000
```

### Build (Production)

```bash
npm run build
# Output in: frontend/dist/
```

### Lint

```bash
npm run lint
```

---

## Key Files Quick Reference

| File                                                    | Purpose                                     |
| ------------------------------------------------------- | ------------------------------------------- |
| `src/App.jsx`                                           | Root: routing, auth, session, global search |
| `src/components/shared/Sidebar.jsx`                     | Role-filtered navigation menu               |
| `src/components/shared/RoleBasedDashboard.jsx`          | Dashboard KPI cards per role                |
| `src/components/layout/Breadcrumbs.jsx`                 | 40+ view breadcrumb mapping                 |
| `src/components/common/DateRangeFilter.jsx`             | Reusable date filter (all dashboards)       |
| `src/components/common/PaginationControls.jsx`          | Pagination (all dashboards)                 |
| `src/components/shared/Button.jsx`                      | Standardized button component               |
| `src/components/system-settings/AuditLogViewer.jsx`     | Admin audit log UI                          |
| `src/components/system-settings/ConsistencyChecker.jsx` | Data consistency UI                         |
| `src/config/rolePermissions.js`                         | RBAC permission definitions                 |
| `src/contexts/UserContext.jsx`                          | Global authenticated user state             |
| `src/utils/tokenManager.js`                             | JWT token storage and refresh               |
| `src/services/api.js`                                   | Axios instance with auth interceptors       |
