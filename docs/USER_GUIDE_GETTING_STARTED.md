# User Guide — Getting Started

**Tile Exporter Solution**  
**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Table of Contents

1. [System Access](#1-system-access)
2. [First Login](#2-first-login)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Navigation & Layout](#4-navigation--layout)
5. [User Profile Setup](#5-user-profile-setup)
6. [Key Concepts](#6-key-concepts)
7. [Your First Export Workflow](#7-your-first-export-workflow)
8. [Getting Help](#8-getting-help)

---

## 1. System Access

### Application URLs

| Environment | URL                                   |
| ----------- | ------------------------------------- |
| Development | `http://localhost:5000`               |
| Production  | Provided by your system administrator |

### Browser Requirements

- **Recommended:** Google Chrome (latest version)
- **Supported:** Firefox, Safari, Microsoft Edge (latest 2 versions)
- JavaScript must be enabled
- Cookies must be allowed for session management

### Screen Resolution

A minimum resolution of **1366 × 768** is recommended. The application is fully responsive and works on tablets and mobile devices, though a desktop provides the best experience for complex document workflows.

---

## 2. First Login

### Step 1: Open the Login Page

Navigate to the system URL in your browser. You will see the login screen.

### Step 2: Enter Your Credentials

- **Email Address:** Use the email address your administrator assigned to your account
- **Password:** Use the password provided by your administrator

### Step 3: You Are In

After successful authentication, you will be redirected to your role-specific Dashboard.

> **Security Note:** Change your password immediately after your first login via **Profile → Change Password**.

### Login Troubleshooting

| Error Message             | Cause                | Resolution                                    |
| ------------------------- | -------------------- | --------------------------------------------- |
| Invalid email or password | Credentials mismatch | Check email spelling; ensure Caps Lock is off |
| Account not activated     | Account pending      | Contact your company administrator            |
| Too many login attempts   | Rate limit triggered | Wait 15 minutes and try again                 |
| Session expired           | Token timed out      | Log in again                                  |

---

## 3. Dashboard Overview

Your Dashboard is customized based on your assigned role. It shows the metrics and shortcuts most relevant to your work.

### Dashboard Components

**KPI Cards** — Key performance indicators at a glance:

- Open Orders
- Pending QC Inspections
- Shipments in Progress
- Outstanding Payments

Each KPI card is clickable and navigates directly to the relevant module with the appropriate filter applied.

**Date Range Filter** — Filter KPIs by preset periods:

- Today
- This Week
- This Month
- This Quarter
- All Time

**Recent Activity** — A summary of the latest changes across modules relevant to your role.

---

## 4. Navigation & Layout

### Sidebar Menu

The left sidebar contains all modules grouped by category. The menu items visible to you depend on your role — you will only see modules you have permission to access.

**Menu Groups:**

- Sales (Leads, Clients, Proforma Invoices, Proforma Orders)
- Quality (QC Records, Certificates)
- Export (Export Invoices, Packing Lists, VGM, Shipping Instructions)
- Shipment (Bill of Lading, Customs Clearance)
- Post-Shipment (Post-Shipment Documents)
- Finance (Payments, Account Entries, Analytics)
- Catalog (Products, Catalogues, Suppliers)
- Administration (Users, System Settings, Audit Log)

### Global Search

Press **Ctrl + K** (or click the search icon) to open the global search bar. It searches simultaneously across:

- Clients
- Products
- Proforma Invoices
- Export Invoices
- Packing Lists
- QC Records
- Leads
- Suppliers

### Top Navigation Bar

| Element           | Function                                  |
| ----------------- | ----------------------------------------- |
| Notification Bell | View system notifications                 |
| User Menu         | Access profile, settings, and logout      |
| Breadcrumbs       | Shows your current location in the system |

---

## 5. User Profile Setup

### Update Your Profile

1. Click your name or avatar in the top-right corner
2. Select **Profile**
3. Update:
   - Full Name
   - Email Address
   - Phone Number
4. Click **Save**

### Change Your Password

1. Go to **Profile → Change Password**
2. Enter your current password
3. Enter and confirm your new password
   - Minimum 8 characters
   - Must include uppercase, lowercase, a number, and a special character
4. Click **Update Password**

---

## 6. Key Concepts

Understanding these concepts will help you use the system effectively.

### Document Flow

The system follows a sequential export workflow. Documents are created in order, and each upstream document feeds data to downstream ones:

```
Lead → Client → Proforma Invoice (PI) → Proforma Order (PO)
                                              ↓
                              QC Record (Quality Inspection)
                                              ↓
                                    Export Invoice
                                    ↙    ↓    ↓    ↘
                          Packing  Annex- VGM  Shipping
                           List    ure        Instructions
                                              ↓
                                    Bill of Lading
                                              ↓
                              Post-Shipment Documents
```

### Document Locking

Documents lock automatically when downstream work begins. This prevents accidental changes that would break consistency.

| Document         | Locks When                                         |
| ---------------- | -------------------------------------------------- |
| Proforma Invoice | Converted to Proforma Order                        |
| Proforma Order   | QC Record created                                  |
| Export Invoice   | Packing List, VGM, or other downstream doc created |

When a document is locked, you will see a clear message explaining which downstream document caused the lock.

### Roles and Permissions

Every user is assigned one of these roles:

| Role             | What They Can Do                          |
| ---------------- | ----------------------------------------- |
| Super Admin      | Everything — all companies, all modules   |
| Company Admin    | Everything within their own company       |
| Sales Manager    | Leads, clients, PI/PO, export documents   |
| Sales Executive  | Leads, clients, PI, products, catalogue   |
| QC Inspector     | QC records, products, export invoices     |
| Account          | Finance, payments, invoices, analytics    |
| Purchase Manager | PO, pallets, suppliers, packing           |
| Administration   | Products, catalogues, QC, pallets         |
| Export Documents | Export invoices, packing lists, products  |
| Client           | Read-only access to orders and catalogues |

### Multi-Tenancy

If you are a Super Admin managing multiple companies, you can switch between company contexts. All data is completely isolated — one company cannot see another company's data.

---

## 7. Your First Export Workflow

Follow these steps to complete your first end-to-end export:

### Step 1: Add a Client

1. Go to **Sales → Clients**
2. Click **Add Client**
3. Fill in client details (name, country, contact, bank details)
4. Click **Save**

### Step 2: Add Products

1. Go to **Catalog → Products**
2. Click **Add Product**
3. Enter product details (name, SKU, size, surface, HSN code, price)
4. Click **Save**

### Step 3: Create a Proforma Invoice

1. Go to **Sales → Proforma Invoices**
2. Click **Create New**
3. Select the client
4. Add products and quantities
5. Set shipping terms (FOB/CIF/CNF)
6. Click **Save**

### Step 4: Convert to Proforma Order

1. Open the Proforma Invoice
2. Click **Convert to Order**
3. Confirm the conversion
4. The PI is now locked and a PO is created

### Step 5: QC Inspection

1. Go to **Quality → QC Records**
2. Click **New Inspection**
3. Link to the Proforma Order
4. Record inspection results
5. Click **Save**

### Step 6: Create Export Invoice

1. Go to **Export → Export Invoices**
2. Click **Create New**
3. Select client and link to the PI
4. Add items and details
5. Click **Save**

### Step 7: Create Packing List

1. Open the Export Invoice
2. Click **Create Packing List** (or go to **Export → Packing Lists → Create**)
3. Link to the Export Invoice
4. Enter box details, quantities, and weights
5. Click **Save**

### Step 8: Complete Export Documentation

Create the remaining linked documents from the Export Invoice:

- **VGM** — Verified Gross Mass for the container
- **Shipping Instructions** — Carrier and routing details
- **Annexure** — Supplementary export data

### Step 9: Shipment & Post-Shipment

1. Record the **Bill of Lading** details
2. Track **Customs Clearance**
3. Create **Post-Shipment Documents** for duty drawback, GST refund, and RODTEP claims

### Step 10: Finance

1. Go to **Finance → Payments**
2. Record payment received from the client
3. Add account entries as needed
4. View analytics in **Finance → Analytics**

---

## 8. Getting Help

### Within the Application

- **Tooltips:** Hover over any field label for a description
- **Error Messages:** Form validation errors appear inline below each field
- **Notifications:** System alerts appear in the notification bell

### Documentation

| Guide                       | Location                                                           |
| --------------------------- | ------------------------------------------------------------------ |
| Daily Operations Guide      | [USER_GUIDE_DAILY_OPERATIONS.md](USER_GUIDE_DAILY_OPERATIONS.md)   |
| Quick Reference Cheat Sheet | [QUICK_REFERENCE_CHEATSHEET.md](QUICK_REFERENCE_CHEATSHEET.md)     |
| API Documentation           | [05_API_DOCUMENTATION.md](05_API_DOCUMENTATION.md)                 |
| Troubleshooting FAQ         | [14_TROUBLESHOOTING_AND_FAQQA.md](14_TROUBLESHOOTING_AND_FAQQA.md) |

### Contact Your Administrator

If you encounter issues not covered in this guide, contact your company administrator. For system-level issues, contact the platform support team.

---

_Version 2.0.0 | March 2026 | Tile Exporter Solution_
