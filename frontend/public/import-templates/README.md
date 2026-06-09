# Import Templates Guide

Welcome to the ERP Import Templates! This guide will help you successfully import your data into the system using our CSV templates.

## 📋 Overview

The import feature allows you to bulk import data for various modules in the ERP system. Each template is pre-formatted with the correct field names, data types, and example data to ensure successful imports on the first try.

## 🚀 Quick Start

1. **Download the template** for the module you want to import
2. **Fill in your data** following the examples provided
3. **Save as CSV** (Comma-Separated Values) format
4. **Upload** through the Import button in the respective module
5. **Review** the validation results and confirm import

## 📁 Available Templates

### 1. Proforma Invoices Template

**File:** `proforma-invoices-template.csv`

Complete proforma invoice data with shipping and product details.

**Required Fields:**

- `invoiceNo` - Unique invoice number (e.g., PI/01/25/001)
- `date` - Invoice date in YYYY-MM-DD format
- `clientName` - Client company name
- `country` - Client country
- `amount` - Total invoice amount (numbers only)

**Optional Fields:**

- `consignee`, `buyer` - Multi-line address fields
- `portOfLoading`, `portOfDischarge`, `finalDestination` - Shipping details
- `tariffCode` - HS Code or Tariff Code
- `currency` - Currency code (USD, EUR, INR, etc.)
- `palletType`, `tilesBack`, `boxesMarking`, `boxType` - Packing specifications
- `fumigation`, `legalisation` - YES/NO values
- `otherInstructions` - Additional shipping instructions
- `status` - Invoice status

---

### 2. Proforma Orders Template

**File:** `proforma-orders-template.csv`

Supplier orders linked to proforma invoices.

**Required Fields:**

- `orderNo` - Unique order number (e.g., PO/01/25/001)
- `date` - Order date in YYYY-MM-DD format
- `piReference` - Reference to proforma invoice number
- `supplierName` - Supplier company name
- `amount` - Total order amount (numbers only)

**Optional Fields:**

- `country` - Supplier country
- `currency` - Currency code
- `status` - Order status (Pending, Confirmed, Processing, etc.)
- `qcStatus` - Quality control status (Not Ready, Ready for QC, In Progress, Approved)

---

### 3. Leads Template

**File:** `leads-template.csv`

Sales leads with contact and business details.

**Required Fields:**

- `companyName` - Lead company name
- `clientName` - Contact person name
- `contactNumber` - Phone number with country code
- `email` - Valid email address
- `country` - Lead country

**Optional Fields:**

- `city` - Lead city
- `source` - Lead source (Website, Trade Show, Referral, Cold Call, Partner, etc.)
- `priority` - Priority level (High, Medium, Low)
- `status` - Lead status (New, Contacted, Qualified, Proposal Sent, etc.)
- `leadValue` - Expected value in numbers
- `expectedCloseDate` - Expected closure date in YYYY-MM-DD format
- `notes` - Additional notes or comments

---

### 4. Clients Template

**File:** `clients-template.csv`

Client/customer records with complete contact information.

**Required Fields:**

- `name` - Client company name
- `email` - Valid email address
- `phone` - Phone number with country code
- `country` - Client country

**Optional Fields:**

- `city` - Client city
- `address` - Full address
- `businessType` - Type of business (Importer, Distributor, Wholesaler, Retailer, etc.)
- `contactPerson` - Primary contact name
- `website` - Company website URL
- `consignee`, `buyer` - Multi-line address fields for shipping

---

### 5. Packing Lists Template

**File:** `packing-lists-template.csv`

Packing lists with shipping and container details.

**Required Fields:**

- `packingListNo` - Unique packing list number (e.g., PL/01/25/001)
- `date` - Packing list date in YYYY-MM-DD format
- `piReference` - Reference to proforma invoice
- `clientName` - Client company name
- `country` - Destination country

**Optional Fields:**

- `poReference` - Reference to proforma order
- `supplierName` - Supplier company name
- `totalPallets`, `totalBoxes`, `totalSQM`, `totalWeight` - Quantity details
- `portOfLoading`, `portOfDischarge`, `finalDestination` - Shipping details
- `containerType` - Container type and size (e.g., 40ft HC)
- `packingInstructions` - Special packing instructions

---

### 6. Account Entries Template

**File:** `account-entries-template.csv`

Account receivables and payables entries.

**Required Fields:**

- `type` - Entry type (Receivable or Payable)
- `partyName` - Party/company name
- `amount` - Amount in numbers

**Optional Fields:**

- `invoiceNo` - Reference invoice number
- `status` - Payment status (Pending, Paid, Overdue, etc.)
- `dueDate` - Due date in YYYY-MM-DD format
- `paymentMode` - Payment method (Wire Transfer, Bank Transfer, LC, RTGS, etc.)
- `date` - Entry date in YYYY-MM-DD format
- `remarks` - Additional notes or comments

---

### 7. QC Records Template

**File:** `qc-records-template.csv`

Quality control inspection records with detailed checkpoint assessments.

**Required Fields:**

- `qcId` - Unique QC record ID (e.g., QC/01/25/001)
- `orderNumber` - Reference to order number
- `clientName` - Client company name
- `productName` - Product being inspected
- `qcStatus` - QC status (Passed, Failed, Pending, Under Process, Re-inspection Required)
- `qcDate` - Inspection date in YYYY-MM-DD format

**Optional Fields:**

- `dimensionalCheck` - Dimensional inspection result (Pass, Fail)
- `surfaceQuality` - Surface quality assessment (Excellent, Good, Average, Poor)
- `colorConsistency` - Color consistency check (Consistent, Minor Variation, Major Variation)
- `packagingCondition` - Packaging quality (Good, Minor Issues, Major Issues)
- `overallGrade` - Overall quality grade (A+, A, B+, B, C, Reject)
- `notes` - Additional inspection notes and comments

---

### 8. Companies Template

**File:** `companies-template.csv`

Company/tenant management records for multi-tenant ERP system.

**Required Fields:**

- `name` - Company name (must be unique)
- `email` - Company contact email (must be unique and valid)
- `industry` - Business industry (Ceramics Manufacturing, Tile Distribution, Import/Export, etc.)
- `contactPerson` - Primary contact person name
- `phone` - Contact phone number with country code
- `country` - Company country
- `subscriptionPlan` - Subscription plan (Free, Basic, Pro, Enterprise)
- `status` - Company status (Active, Trial, Suspended, Expired)

**Optional Fields:**

- `address` - Full company address
- `website` - Company website URL
- `enabledModules` - Comma-separated list of enabled modules (e.g., "proforma_invoice,client_management,qc_management")

**Available Modules:**

- `proforma_invoice` - Proforma Invoices
- `proforma_order` - Proforma Orders
- `lead_management` - Lead Management
- `client_management` - Client Management
- `tile_product` - Tile Product
- `catalogue_management` - Catalogue Management
- `qc_management` - QC Management
- `pallet_management` - Pallet Management
- `invoice_packing` - Packing List Management
- `account_finance` - Account & Finance
- `user_management` - User Management

---

## 📝 Data Format Guidelines

### Date Format

- **Required format:** YYYY-MM-DD
- **Examples:** 2025-01-15, 2025-12-31
- ❌ Wrong: 15/01/2025, 01-15-2025, 15-Jan-2025

### Number Format

- **Use numbers only** (no currency symbols, commas, or spaces)
- **Examples:** 28505, 1250.50, 15500
- ❌ Wrong: $28,505, 1,250.50, 15 500

### Phone Format

- **Include country code** with + or 00
- **Examples:** +1-555-1234, +44-20-7946-0958, +971-4-123-4567
- ❌ Wrong: 5551234, (555) 123-4567

### Email Format

- **Valid email addresses** only
- **Examples:** john@company.com, contact@business.co.uk
- ❌ Wrong: john@company, @company.com, john.company.com

### Multi-line Text Fields

For fields that may contain multiple lines (addresses, notes, instructions):

- **Wrap the entire field in double quotes** if it contains:
  - Commas
  - Line breaks (new lines)
  - Double quotes (escape with double quotes)
- **Example:**
  ```csv
  "ABC Trading Co.
  123 Business Street
  New York, NY 10001"
  ```

### YES/NO Fields

- **Use exactly:** YES or NO (case-sensitive)
- **Examples:** fumigation: YES, legalisation: NO
- ❌ Wrong: yes, no, Y, N, True, False

---

## 🔄 Import Process Steps

### Step 1: Download Template

1. Navigate to the module you want to import data into
2. Click the **Import** button
3. Download the appropriate template file
4. Or download directly from this folder

### Step 2: Prepare Your Data

1. Open the template in Excel, Google Sheets, or any spreadsheet software
2. **Keep Row 1** (headers) - Do not modify
3. **Delete Row 2** (data type hints) - Optional, for reference only
4. **Keep or modify Rows 3+** (example data) with your actual data
5. Add as many rows as needed for your data

### Step 3: Validate Your Data

Before importing, ensure:

- ✅ All required fields are filled
- ✅ Dates are in YYYY-MM-DD format
- ✅ Numbers contain no symbols or commas
- ✅ Email addresses are valid
- ✅ Phone numbers include country codes
- ✅ Multi-line fields are properly quoted

### Step 4: Save as CSV

1. **File → Save As → CSV (Comma delimited)**
2. ⚠️ Important: Save as .csv, not .xlsx or .xls
3. Choose UTF-8 encoding if prompted

### Step 5: Upload and Import

1. Click the **Import** button in the module
2. Select your CSV file
3. Review the validation results
4. If errors are found:
   - Download the error report
   - Fix the issues in your CSV
   - Re-upload
5. If validation passes:
   - Review the summary (total rows, valid rows, etc.)
   - Click **Confirm Import**
6. Your data will be imported and available immediately

---

## ⚠️ Common Issues & Troubleshooting

### Issue: "CSV file must contain at least a header row and one data row"

**Solution:** Ensure your file has:

- Row 1: Headers (field names)
- Row 2+: At least one data row

### Issue: "Invalid date format"

**Solution:**

- Use YYYY-MM-DD format only
- Example: 2025-01-15 ✅
- Not: 15/01/2025 ❌

### Issue: "Invalid email address"

**Solution:**

- Ensure email follows format: name@domain.com
- Check for spaces or special characters
- Verify domain extension exists

### Issue: "Invalid number format"

**Solution:**

- Remove currency symbols ($, €, ₹)
- Remove commas from numbers (1,250 → 1250)
- Use decimal point, not comma (1250.50 ✅, not 1250,50 ❌)

### Issue: "Required field missing"

**Solution:**

- Check that all required fields have values
- Empty cells in required fields will cause validation to fail
- Refer to template documentation for required fields

### Issue: "File too large"

**Solution:**

- Maximum file size: 10MB
- Split large imports into multiple smaller files
- Remove unnecessary columns or rows

### Issue: "Multi-line text not importing correctly"

**Solution:**

- Wrap multi-line fields in double quotes
- Example:
  ```csv
  "Address Line 1
  Address Line 2
  City, State ZIP"
  ```

### Issue: "Special characters causing errors"

**Solution:**

- Save CSV with UTF-8 encoding
- Ensure special characters (é, ñ, 中, etc.) are preserved
  - Test with a small dataset first

---

## 💡 Best Practices

### 1. Start Small

- Import 5-10 records first to test
- Verify data appears correctly
- Then proceed with bulk import

### 2. Keep Backup

- Always keep a backup of your original data
- Save a copy before making changes
- You can re-import if needed

### 3. Use Examples

- The templates include realistic example data
- Study the examples before filling your data
- Follow the same format and conventions

### 4. Validate Before Import

- Double-check required fields
- Verify date and number formats
- Ensure phone and email formats are correct

### 5. Reference Fields

- For fields like `piReference`, `poReference`:
  - Ensure the referenced record exists
  - Use exact invoice/order numbers
  - Case-sensitive matching

### 6. Consistent Data

- Use consistent naming conventions
- Standardize country names (USA vs United States)
- Standardize status values (Pending vs pending)

### 7. Document Changes

- Keep notes on what you import
- Track import batch dates
- Maintain a change log

---

## 📞 Support

If you encounter issues not covered in this guide:

1. **Check the validation errors** - They provide specific details about what's wrong
2. **Review the template examples** - Ensure your data matches the format
3. **Test with example data** - Use the provided examples first
4. **Contact support** - Provide error messages and example data for assistance

---

## 📊 Template Field Reference

### Data Type Legend

- **string** - Short text (names, codes, single-line values)
- **text** - Long text (addresses, notes, multi-line values)
- **number** - Numeric values (amounts, quantities, weights)
- **date** - Date values in YYYY-MM-DD format
- **email** - Valid email address
- **phone** - Phone number with country code

### Status Values Reference

**Invoice/Order Status:**

- Pending
- Confirmed
- Processing
- Completed
- Cancelled

**QC Status:**

- Passed
- Failed
- Pending
- Under Process
- Re-inspection Required

**Lead Status:**

- New
- Contacted
- Qualified
- Proposal Sent
- Negotiation
- Won
- Lost

**Payment Status:**

- Pending
- Paid
- Overdue
- Partial
- Cancelled

---

## 🔄 Updates & Versioning

**Current Version:** 2.0.0  
**Last Updated:** October 27, 2025

**Version 2.0.0 Changes:**

- Added QC Records template for quality control inspections
- Added Companies template for multi-tenant company management
- Updated status values reference for QC records

Templates are regularly updated to match system requirements. Always download the latest version before importing.

---

## ✅ Quick Checklist

Before importing, verify:

- [ ] Downloaded the correct template for your module
- [ ] Filled all required fields
- [ ] Used correct date format (YYYY-MM-DD)
- [ ] Numbers are formatted correctly (no symbols/commas)
- [ ] Email addresses are valid
- [ ] Phone numbers include country codes
- [ ] Multi-line fields are properly quoted
- [ ] Saved file as .csv format
- [ ] File size is under 10MB
  - [ ] Tested with a small dataset first
- [ ] Have a backup of original data

---

**Happy Importing! 🎉**
