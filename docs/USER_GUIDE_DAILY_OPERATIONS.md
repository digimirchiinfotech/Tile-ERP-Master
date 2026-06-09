# User Guide — Daily Operations

**Tile Exporter Solution**  
**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Table of Contents

1. [Managing Leads](#1-managing-leads)
2. [Managing Clients](#2-managing-clients)
3. [Managing Suppliers](#3-managing-suppliers)
4. [Managing Products](#4-managing-products)
5. [Working with Proforma Invoices](#5-working-with-proforma-invoices)
6. [Working with Proforma Orders](#6-working-with-proforma-orders)
7. [QC Records & Inspections](#7-qc-records--inspections)
8. [Export Invoices](#8-export-invoices)
9. [Packing Lists](#9-packing-lists)
10. [VGM Documents](#10-vgm-documents)
11. [Shipping Instructions](#11-shipping-instructions)
12. [Bill of Lading](#12-bill-of-lading)
13. [Customs Clearance](#13-customs-clearance)
14. [Post-Shipment Documents](#14-post-shipment-documents)
15. [Finance & Accounts](#15-finance--accounts)
16. [Reports & Analytics](#16-reports--analytics)
17. [User Management](#17-user-management)
18. [System Settings](#18-system-settings)
19. [Bulk Operations](#19-bulk-operations)
20. [Global Search](#20-global-search)
21. [Troubleshooting Common Issues](#21-troubleshooting-common-issues)

---

## 1. Managing Leads

Leads are prospective clients that have not yet been converted to full client accounts.

### View Leads

Navigate to **Sales → Leads**. Use the search bar and filters to find specific leads.

### Create a Lead

1. Click **Add Lead**
2. Fill in:
   - Contact Name (required)
   - Company Name
   - Email and Phone
   - Lead Source (e.g., Trade Fair, Referral, Website)
   - Status (New, Contacted, Qualified, Proposal Sent, Closed Won, Closed Lost)
   - Assigned Salesperson
   - Notes
3. Click **Save**

### Update Lead Status

1. Open the lead
2. Click **Edit**
3. Change the **Status** field
4. Click **Save**

### Convert Lead to Client

1. Open the lead record
2. Click **Convert to Client**
3. The lead data is carried over — review and complete the client profile
4. Click **Save Client**

### Import Leads via CSV

1. Click **Import CSV**
2. Download the template file
3. Fill in your data (one lead per row)
4. Upload the completed file
5. Review the import summary

### Export Leads

Click **Export CSV** to download all leads (or filtered results) as a CSV file.

---

## 2. Managing Clients

Clients are confirmed trading partners with complete business profiles.

### Create a Client

1. Navigate to **Sales → Clients**
2. Click **Add Client**
3. Fill in all sections:
   - **Basic Info:** Name, country, currency, payment terms, credit limit, credit days
   - **Contact Details:** Email, phone, address
   - **GST & Tax:** GST number, PAN, IEC code
   - **Bank Details:** Bank name, account number, SWIFT/IBAN
   - **Consignee Details:** Shipping address if different from billing
4. Click **Save**

### Edit a Client

1. Open the client record
2. Click **Edit**
3. Make changes
4. Click **Save**

### Delete a Client

Clients with active invoices, PIs, or other linked documents cannot be deleted. You must either delete or archive those documents first, or archive the client instead of deleting.

### CSV Import/Export

Available via the **Import CSV** and **Export CSV** buttons on the Clients dashboard.

---

## 3. Managing Suppliers

Suppliers provide products and raw materials.

### Create a Supplier

1. Navigate to **Catalog → Suppliers**
2. Click **Add Supplier**
3. Fill in:
   - Supplier Name, contact person
   - Email, phone, address
   - GST and tax details
   - Payment terms
4. Click **Save**

### CSV Import/Export

Use **Import CSV** and **Export CSV** on the Suppliers dashboard.

---

## 4. Managing Products

### Create a Product

1. Navigate to **Catalog → Products**
2. Click **Add Product**
3. Fill in:
   - Product Name, SKU
   - Category (Tiles / Sanitaryware / Faucet)
   - Size, Surface, Thickness, Application (from master dropdowns)
   - HSN Code, Tariff Code
   - Unit of Measure (Box, Sqm, Piece)
   - Base Price, Sale Price
   - Stock Quantity
4. Click **Save**

### Update Pricing

Open a product → click **Edit** → update price fields → click **Save**.

### Bulk Price Update

1. Select multiple products using the checkboxes
2. Click **Bulk Actions → Update Price**
3. Enter the new price or percentage change
4. Confirm

### Product Catalogue

Catalogues are versioned product lists shared with clients:

1. Go to **Catalog → Catalogues**
2. Click **Create Catalogue**
3. Add products with client-specific pricing
4. Share or archive the catalogue as needed

---

## 5. Working with Proforma Invoices

A Proforma Invoice (PI) is a pre-shipment quotation document.

### Create a Proforma Invoice

1. Navigate to **Sales → Proforma Invoices**
2. Click **Create New**
3. Fill in:
   - PI Number (auto-generated or manual)
   - Date
   - Client (select from dropdown)
   - Shipping Terms (FOB / CIF / CNF / Ex-Works)
   - Payment Terms
   - Port of Loading and Discharge
   - Line Items: Product, Quantity, Unit Price, HSN Code
   - Tax settings (GST / IGST)
   - Terms & Conditions
4. Click **Save**

### Send a PI

Open the PI → click **Download PDF** to export it, then share with the client.

### Convert PI to Proforma Order

1. Open the PI
2. Click **Convert to Order**
3. Confirm the conversion
4. The PI is **locked** — no further edits are possible
5. A Proforma Order (PO) is created with the PI data pre-filled

### PI Status Reference

| Status    | Meaning                            |
| --------- | ---------------------------------- |
| Draft     | Work in progress, not yet sent     |
| Submitted | Sent to client for review          |
| Approved  | Client has accepted                |
| Locked    | Converted to PO — no edits allowed |

---

## 6. Working with Proforma Orders

A Proforma Order (PO) confirms the client's acceptance of the Proforma Invoice.

### Create a PO

A PO is typically created by converting a PI (see above). To create manually:

1. Go to **Sales → Proforma Orders**
2. Click **Create New**
3. Link to a Proforma Invoice
4. Confirm quantities and pricing
5. Click **Save**

### PO Locking

A PO locks automatically when a QC Record is created against it. Locked POs cannot be edited.

---

## 7. QC Records & Inspections

Quality Control records document pre-shipment inspections.

### Create a QC Record

1. Navigate to **Quality → QC Records**
2. Click **New Inspection**
3. Fill in:
   - QC ID (auto-generated)
   - Inspection Date
   - Linked Proforma Order
   - Client and Products
   - Inspector Name
   - Result: Pass / Fail / Conditional Pass
   - Defect details (if any)
   - Notes and photos
4. Click **Save**

### Link Certificates

1. Open a QC Record
2. Click **Add Certificate**
3. Upload or link the certificate document

---

## 8. Export Invoices

The Export Invoice is the primary export document and serves as the anchor for all downstream export documentation.

> [!NOTE]
> **Export Workflow Interface Standardization**: All export management modules (Export Invoices, Annexures, Backsides, Packing Lists, VGM, and Shipping Instructions) have been standardized. They share a uniform card layout and utilize fixed "Cancel / Save / Update" buttons located at the bottom-left of every form to guarantee a predictable, crash-free user experience.

### Create an Export Invoice

1. Navigate to **Export → Export Invoices**
2. Click **Create New**
3. Fill in:
   - Invoice Number (auto-generated)
   - Invoice Date
   - Client
   - Link to Proforma Invoice (optional but recommended)
   - Shipment details (vessel, container, port of loading/discharge)
   - Line Items with quantities and prices
   - Currency and exchange rate
   - GST / IGST details
4. Click **Save**

### Export Invoice Locking

The Export Invoice locks automatically when any of these downstream documents is created:

- Packing List
- VGM
- Shipping Instructions
- Invoice Backside
- Annexure

### Print / Download

Open the invoice → click **Print** or **Download PDF** to generate the printable document.

### Invoice Backside (GST/Customs Annexure)

1. Open the Export Invoice
2. Click **Create Backside**
3. The GST and customs fields are pre-filled from the invoice
4. Review, adjust if needed, and save

### Export Invoice Annexure

1. Open the Export Invoice
2. Click **Create Annexure**
3. Supplementary fields are pre-filled
4. Save

---

## 9. Packing Lists

Packing Lists detail exactly how goods are packed for shipment.

### Create a Packing List

1. Navigate to **Export → Packing Lists**
2. Click **Create New**
3. Link to an Export Invoice
4. Fill in:
   - Number of boxes / cartons
   - Products per box with quantities
   - Net weight and gross weight per box
   - Dimensions (L × W × H)
   - Barcode or mark numbers
5. Click **Save**

### Pallet Management

1. From a Packing List, click **Create Pallet**
2. Assign boxes to pallets
3. Record pallet weight and dimensions
4. Save

---

## 10. VGM Documents

VGM (Verified Gross Mass) is required by shipping lines for all packed containers.

### Create a VGM

1. Navigate to **Export → VGM**
2. Click **Create New**
3. Fill in:
   - Linked Export Invoice
   - Container number and type
   - Verified Gross Mass (kg)
   - Weighing method (Method 1 or Method 2)
   - Vessel and voyage details
   - Authorized signatory
4. Click **Save**

---

## 11. Shipping Instructions

Shipping Instructions are sent to the freight forwarder or carrier.

### Create Shipping Instructions

1. Navigate to **Export → Shipping Instructions**
2. Click **Create New**
3. Fill in:
   - Linked Export Invoice
   - Shipper and consignee details
   - Container and cargo details
   - Vessel, voyage, and ETD
   - Port of Loading and Discharge
   - Freight and payment terms
   - Special instructions
4. Click **Save**

---

## 12. Bill of Lading

The Bill of Lading is issued by the carrier after goods are loaded.

### Record a Bill of Lading

1. Navigate to **Shipment → Bill of Lading**
2. Click **Create New**
3. Fill in B/L number, carrier, dates, and cargo details
4. Click **Save**

---

## 13. Customs Clearance

### Record Customs Clearance

1. Navigate to **Shipment → Customs Clearance**
2. Click **Create New**
3. Fill in clearance number, submission date, duty amount, and status
4. Click **Save**

---

## 14. Post-Shipment Documents

Post-shipment tracking covers financial claims after the shipment is dispatched.

### Create a Post-Shipment Document

1. Navigate to **Post-Shipment → Post-Shipment Docs**
2. Click **Create New**
3. Fill in:
   - Document Number
   - Linked Export Invoice
   - Courier tracking details (AWB/B/L number)
   - Duty Drawback claim (amount, submission date, received date)
   - GST Refund claim details
   - RODTEP claim details
4. Click **Save**

---

## 15. Finance & Accounts

### Record a Payment

1. Navigate to **Finance → Payments**
2. Click **Add Payment**
3. Fill in:
   - Payment date
   - Client
   - Linked invoice
   - Amount and currency
   - Payment method (Bank Transfer, LC, etc.)
   - Reference number
4. Click **Save**

### Account Entries

1. Navigate to **Finance → Account Entries**
2. Click **Add Entry**
3. Fill in entry type, party, amount, and date
4. Click **Save**

### Analytics Dashboard

Navigate to **Finance → Analytics** to view:

- Revenue by month/quarter
- Top clients by revenue
- Shipments by destination country
- Outstanding payment summary
- Product performance metrics

---

## 16. Reports & Analytics

### Generate a Report

1. Navigate to **Analytics → Reports**
2. Select the report type:
   - Sales Summary
   - Client-wise Invoice Report
   - Product-wise Export Report
   - Shipment Status Report
   - Payment Collection Report
3. Set the date range
4. Click **Generate**
5. Download as PDF or Excel

---

## 17. User Management

_(Requires Company Admin or Super Admin role)_

### Create a User

1. Navigate to **Administration → Users**
2. Click **Add User**
3. Fill in:
   - Full Name
   - Email Address
   - Username
   - Role (from dropdown)
   - Initial Password
   - Status (Active / Inactive)
4. Click **Save**
5. Share credentials with the new user and ask them to change their password on first login

### Edit or Deactivate a User

Open the user record → click **Edit** → update fields or change Status to **Inactive** → click **Save**.

---

## 18. System Settings

_(Requires Super Admin role)_

### Audit Log Viewer

Navigate to **Administration → System Settings → Audit Log** to view a full history of all changes made in the system, including:

- Which user made the change
- What record was changed (old value vs. new value)
- IP address and timestamp

Logs can be filtered by user, module, date range, and action type (Create / Update / Delete).

### Data Consistency Checker

Navigate to **Administration → System Settings → Data Consistency** to run automated checks that identify:

- Total mismatches between invoices and packing lists
- Orphaned records (documents without required linked records)
- Missing required references

### Master Data Management

Navigate to **Administration → System Settings → Master Data** to manage:

- Product sizes, surfaces, thickness, applications
- Ports of loading and discharge
- Shipping lines
- Currencies
- Countries and cities

---

## 19. Bulk Operations

Most dashboards support bulk operations on selected records:

### Bulk Delete

1. Select records using the checkboxes (or **Select All**)
2. Click **Bulk Actions → Delete**
3. Confirm the action
4. Records with dependencies (active linked documents) are protected from deletion

### Bulk Export

1. Apply filters to narrow the data
2. Click **Export CSV**
3. The export reflects the current filtered view

---

## 20. Global Search

Press **Ctrl + K** to open the global search bar. It searches across all major modules simultaneously.

**Searchable modules:**

- Clients (by name, email, contact)
- Products (by name, SKU)
- Proforma Invoices (by number, client)
- Export Invoices (by number, client, container)
- Packing Lists (by number)
- QC Records (by QC ID, client)
- Leads (by name, company)
- Suppliers (by name)

Click any search result to navigate directly to that record.

---

## 21. Troubleshooting Common Issues

### Form Not Saving

| Symptom                                 | Likely Cause               | Resolution                                      |
| --------------------------------------- | -------------------------- | ----------------------------------------------- |
| Save button disabled                    | Required fields empty      | Check all fields marked with \*                 |
| Save button enabled but nothing happens | Validation error           | Read the red error messages below the fields    |
| "Document is locked" message            | Downstream document exists | Cannot edit — create a revised document instead |

### Data Not Loading

| Symptom                       | Likely Cause            | Resolution                                |
| ----------------------------- | ----------------------- | ----------------------------------------- |
| Blank dashboard               | Network or server issue | Refresh the page (F5)                     |
| Spinner spinning indefinitely | API timeout             | Check your internet connection; try again |
| "Unauthorized" error          | Session expired         | Log in again                              |

### PDF / Print Issues

| Symptom          | Likely Cause          | Resolution                                        |
| ---------------- | --------------------- | ------------------------------------------------- |
| Print view blank | JavaScript not loaded | Wait for the page to fully load, then try again   |
| PDF missing data | Fields not filled     | Ensure all required document fields are completed |

### Can't Find a Record

1. Check the search/filter settings — clear all filters
2. Verify you are searching in the correct module
3. Use Global Search (Ctrl + K) to search across all modules

---

_Version 2.0.0 | March 2026 | Tile Exporter Solution_  
_For setup instructions, see [USER_GUIDE_GETTING_STARTED.md](USER_GUIDE_GETTING_STARTED.md)_  
_For API reference, see [05_API_DOCUMENTATION.md](05_API_DOCUMENTATION.md)_
