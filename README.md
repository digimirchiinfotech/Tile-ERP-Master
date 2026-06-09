# Tile Exporter SaaS Platform

**Version:** 4.1.0  
**Last Updated:** June 2026

---

An enterprise-grade, multi-tenant B2B SaaS platform designed to manage the entire lifecycle of tile, sanitaryware, and faucet export operations—from lead generation and CRM to strict regulatory post-shipment documentation.

---

## 🚀 Branding & Final Polish (Production Checklist)

To customize this codebase for your unique enterprise brand, complete these steps:

### **1. Visual Identity**

- **Company Logos:** Replace the brand assets at `frontend/public/assets/logo.png`. This logo appears on the login screen, layout header, and sidebar navigation.
- **Document Header:** For A4 PDF prints and reports, upload your high-resolution company logo through the **Company Profile** settings inside the platform.
- **Favicon:** Replace `frontend/public/favicon.ico` with your brand's 32x32 icon.

### **2. Application Meta**

- **App Title:** Update the title tag in `frontend/index.html` to reflect your custom platform name.
- **Copyright:** Update the copyright text in the layouts inside `frontend/src/components/shared/Layout.jsx`.

### **3. Email & Notifications**

- **SMTP Configuration:** Configure production SMTP credentials in `backend/.env`:
  ```env
  SMTP_HOST=smtp.yourprovider.com
  SMTP_USER=notifications@yourbrand.com
  SMTP_PASS=your_secure_password
  ```
- **Sender Details:** Update the `from` field in `backend/src/services/emailService.js` to match your official domain.

### **4. Production Build**

- **Compilation:** Check and compile the web client using Vite:
  ```bash
  cd frontend
  npm run build
  ```

---

## ⚙️ Deployment & Setup

### 1. Backend Service

```bash
cd backend
npm install
npm run db:setup     # Seeds the Master Database, initializes Migrations, and registers Master Data
npm start            # Standard port: 8000
```

### 2. Frontend Interface

```bash
cd frontend
npm install
npm run dev          # Default local dev port: 5000
```

---

## 🔐 Environment Variables

Create `.env` inside `/backend`:

```env
# Database Connections
DATABASE_URL=postgresql://user:password@host:port/database

# Initial System Credentials (Required on First Boot)
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=your_secure_password

# Authentication (JWT Secrets)
JWT_SECRET=your_jwt_secret_min_62_chars_random_string
JWT_REFRESH_SECRET=your_refresh_secret_min_62_chars_random_string

# Email Delivery (SMTP)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASSWORD=your_email_password
EMAIL_FROM=noreply@yourcompany.com
```

---

## 📐 Platform Architecture

The platform leverages a highly secure, isolated database-per-tenant architecture for maximum data privacy and infrastructure scalability:

| Component          | Technical Stack     | Role                                                                        |
| :----------------- | :------------------ | :-------------------------------------------------------------------------- |
| **Frontend Web**   | React 18 + Vite     | Premium high-performance SPA using Bootstrap 5 and custom glassmorphism.    |
| **Backend API**    | Node.js + Express   | Context-aware API gateway managing tenant database connections dynamically. |
| **Databases**      | PostgreSQL          | Isolated tenant databases with master coordination for metadata.            |
| **Security Layer** | JWT + RBAC          | Multi-layered JWT sessions with Role-Based Access Control on all endpoints. |
| **Multi-Tenancy**  | Database-per-tenant | Physically separates database pools to guarantee total data privacy.        |

### 🔒 Tenant Security & Dynamic Routing

The system's `dbRouter.js` middleware dynamically intercepts every incoming request. It decodes the JWT to resolve the company context (`req.companyFilter`) and automatically switches the active transaction to that company's isolated database pool.

If any standard user attempts to pass headers (`x-company-id`) to access another company's records, the gateway immediately intercepts and rejects the request with a **Stealth 404 Not Found** error to shield company identity.

---

## 💎 Advanced 2026 Platform Features

### 🔄 1. Strict 1-to-1 Document Locking Progression

To prevent duplicates and maintain regulatory lineage, the platform enforces a strict, linear downstream document lock cycle. Once a downstream document is generated, the parent document is locked and cannot be recreated or re-edited:

$$\text{Proforma Invoice (PI)} \rightarrow \text{Export Invoice (EI)} \rightarrow \text{Packing List (PL)} \rightarrow \text{Annexure (ANX)} \rightarrow \text{Invoice Backside (IB)} \rightarrow \text{VGM} \rightarrow \text{Shipping Instructions (SI)}$$

### 🧪 2. Self-Healing Multi-Tenant DDL Schema Sync

When connection pools are initialized or when new tenant migrations are registered, the platform automatically triggers the `check_db.js` self-healing database script. This utility dynamically inspects company schemas, patching any missing status columns (`is_used`, `is_converted`, `linked_document_id`, `document_status`) in real-time, eliminating manual schema alignment overhead.

### 🔔 3. Self-Flushing Toast Notification Buffer

The frontend leverages a premium, glassmorphic toast notification manager equipped with a static queue. Notifications triggered during early page mounts or route transitions are buffered and automatically flushed immediately after components successfully mount, ensuring zero dropped alerts.

---

## 📚 Technical Reference Guides

Comprehensive operational and architectural guides are maintained within the [`/docs`](./docs/) directory:

- [01_ERP_FLOWCHART.md](docs/01_ERP_FLOWCHART.md) — Workflow models and linear document lock pipelines.
- [02_FRONTEND_GUIDE.md](docs/02_FRONTEND_GUIDE.md) — Frontend libraries, state managers, and print wrapper components.
- [03_BACKEND_GUIDE.md](docs/03_BACKEND_GUIDE.md) — Dynamic database routers, models, and transaction locks.
- [05_API_DOCUMENTATION.md](docs/05_API_DOCUMENTATION.md) — REST API specifications and headers.
- [12_MULTITENANCY_GUIDE.md](docs/12_MULTITENANCY_GUIDE.md) — Database provisioning and JWT tenancy routing guards.
- [16_EXPORT_WORKFLOW_INTERCONNECTION_GUIDE.md](docs/16_EXPORT_WORKFLOW_INTERCONNECTION_GUIDE.md) — Downstream reference mapping specifications.

---

## ⚖️ License

UNLICENSED — Proprietary. All rights reserved. Unauthorized copying, distribution, or execution is strictly prohibited.
