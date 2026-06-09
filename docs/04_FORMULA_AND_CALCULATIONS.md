# Formulas & Calculations Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Invoice Calculations

### Total Value Calculation

```
Base Subtotal = SUM(Quantity × Unit Price) for all items

Line Discounts:
  - Line Discount Amount = Subtotal × (Line Discount % / 100)

Total Discounts = Line Discount Amount + Other Discounts

Taxable Amount = Subtotal - Total Discounts

Tax Calculations (GST):
  - SGST Amount = Taxable Amount × (SGST % / 100)
  - CGST Amount = Taxable Amount × (CGST % / 100)
  - IGST Amount = Taxable Amount × (IGST % / 100)

  Note: Either (SGST + CGST) OR IGST, not both

Subtotal after Tax = Taxable Amount + (SGST + CGST + IGST)

Additional Charges:
  - Packing Charges
  - Shipping Charges
  - Insurance
  - Handling Charges

FOB Total = Subtotal after Tax + Additional Charges

Shipping Cost (if CIF):
  - Weight-based: (Total Weight in kg / 100) × Rate per 100kg
  - Fixed: Flat rate
  - Percentage: FOB Total × (Shipping % / 100)

CIF Total = FOB Total + Shipping Cost
```

## Database Formulas

### Invoice Total Calculation

```sql
-- Calculate invoice totals
SELECT
    id,
    client_id,

    -- Line items subtotal
    COALESCE(SUM(quantity * unit_price), 0) as subtotal,

    -- Discounts
    COALESCE(line_discount, 0) +
    COALESCE(other_discounts, 0) as total_discounts,

    -- Taxable amount
    (COALESCE(SUM(quantity * unit_price), 0) -
     (COALESCE(line_discount, 0) + COALESCE(other_discounts, 0))) as taxable_amount,

    -- GST calculations
    ((COALESCE(SUM(quantity * unit_price), 0) -
      (COALESCE(line_discount, 0) + COALESCE(other_discounts, 0))) *
     (COALESCE(sgst_rate, 0) / 100)) as sgst_amount,

    ((COALESCE(SUM(quantity * unit_price), 0) -
      (COALESCE(line_discount, 0) + COALESCE(other_discounts, 0))) *
     (COALESCE(cgst_rate, 0) / 100)) as cgst_amount,

    -- FOB calculation
    (COALESCE(SUM(quantity * unit_price), 0) -
     (COALESCE(line_discount, 0) + COALESCE(other_discounts, 0)) +
     ((COALESCE(SUM(quantity * unit_price), 0) -
       (COALESCE(line_discount, 0) + COALESCE(other_discounts, 0))) *
      ((COALESCE(sgst_rate, 0) + COALESCE(cgst_rate, 0)) / 100)) +
     COALESCE(other_charges, 0)) as fob_total,

    -- CIF calculation
    (COALESCE(SUM(quantity * unit_price), 0) -
     (COALESCE(line_discount, 0) + COALESCE(other_discounts, 0)) +
     ((COALESCE(SUM(quantity * unit_price), 0) -
       (COALESCE(line_discount, 0) + COALESCE(other_discounts, 0))) *
      ((COALESCE(sgst_rate, 0) + COALESCE(cgst_rate, 0)) / 100)) +
     COALESCE(other_charges, 0) +
     COALESCE(shipping_charges, 0)) as cif_total

FROM proforma_invoices
GROUP BY id;
```

## Shipping Calculations

### Weight-Based Shipping

```
Total Weight = SUM(Item Weight × Quantity) for all items

Shipping Cost = (Total Weight in kg / 100) × Rate per 100kg

Example:
  - 50 boxes × 10kg = 500 kg
  - Rate = ₹500 per 100kg
  - Shipping Cost = (500 / 100) × 500 = ₹2,500
```

### Percentage-Based Shipping

```
Shipping Cost = FOB Total × (Shipping % / 100)

Example:
  - FOB Total = ₹100,000
  - Shipping % = 5%
  - Shipping Cost = 100,000 × (5 / 100) = ₹5,000
```

## Currency Conversion

```
Converted Amount = Base Amount × Exchange Rate

Example:
  - Amount: ₹100,000
  - Currency: USD
  - Exchange Rate: 82.5
  - USD Amount = 100,000 / 82.5 = $1,212.12
```

## Payment Terms Calculation

### Days to Pay

```
Payment Due Date = Invoice Date + Credit Days

Example:
  - Invoice Date: 2024-01-15
  - Credit Days: 30
  - Payment Due: 2024-02-14
```

### Aging Analysis

```
Overdue Days = Current Date - Payment Due Date

Aging Brackets:
  - Current: 0 days
  - 30 Days: 1-30 days overdue
  - 60 Days: 31-60 days overdue
  - 90 Days: 61-90 days overdue
  - 120+ Days: 90+ days overdue
```

## Quantity & Packaging

### Box Calculations

```
Total Items = SUM(Quantity) for all products

Boxes Required = CEIL(Total Items / Items per Box)

Items Per Box:
  - Standard Box: 10-20 items
  - Export Box: 20-50 items
  - Pallet Box: 50-100 items
```

### Pallet Calculations

```
Boxes per Pallet = CEIL(Total Boxes / Boxes per Pallet)

Total Pallets = CEIL(Boxes per Pallet / Pallets per Container)

Container Capacity:
  - 20ft Container: 10-15 pallets (1,000-1,200 boxes)
  - 40ft Container: 20-25 pallets (2,000-2,500 boxes)
```

### Export Container Aggregations

_Used universally across Annexure, VGM, Backside, and Shipping Instructions modules._

```
Total Boxes (Total Packages) = SUM(boxes) for all assigned containers

Total SQM = SUM(boxes × sqm_per_box)

Net Weight (kg) = SUM(boxes × box_weight)

Gross Weight (kg) = Net Weight + (pallets × 20)
// Standardized formula assuming average pallet weight = 20kg
```

## Sanitaryware Calculations

### 1. Quantity and Carton Calculations

Unlike tiles, which are aggregated by surface area (SQM) and box counts, sanitaryware items are individually counted and measured in pieces. The pieces count maps directly to carton counts:

$$\text{Total Pieces} = \sum (\text{Line Pieces})$$

$$\text{Total Cartons (Boxes)} = \text{Total Pieces}$$

### 2. Weight and Volume Aggregations

For sanitaryware, package volume (CBM) and weight are calculated on a per-unit basis:

$$\text{Net Weight (kg)} = \sum (\text{Line Pieces} \times \text{Box Weight})$$

$$\text{Gross Weight (kg)} = \sum (\text{Line Pieces} \times \text{Box Weight})$$

$$\text{Total Volume (CBM)} = \sum (\text{Line Pieces} \times \text{CBM Per Piece})$$

### 3. Financial Amount

The financial amount is calculated using the piece rate:

$$\text{Line Amount} = \text{Line Pieces} \times \text{Rate}$$

## System Numbering Formula

### Document Sequence Identifier

_Affects Proforma, Export Invoice, Packing List, VGM, SI, Backside, Annexure._

```
Document Number = PREFIX/SERIAL_COUNT

Numbering Formula logic bypassed standard date-reset constraints.
Uses 'ALL_TIME' generation. Format increments consistently globally per tenant:
e.g. IB/0001 → IB/0002 → IB/0003
```

## Commission Calculations

### Sales Commission

```
Commission = Net Sales × (Commission % / 100)

Example:
  - Net Sales: ₹500,000
  - Commission %: 2.5%
  - Commission: 500,000 × (2.5 / 100) = ₹12,500
```

## QC Pass Rate

```
Pass Rate (%) = (Items Passed / Total Items Inspected) × 100

Example:
  - Total Inspected: 1000 units
  - Passed: 980 units
  - Pass Rate = (980 / 1000) × 100 = 98%
```

## Database Aggregation Queries

### Monthly Sales

```sql
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as invoice_count,
    SUM(cif_total) as total_sales,
    AVG(cif_total) as avg_invoice_value
FROM proforma_invoices
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

### Client Payment Status

```sql
SELECT
    c.client_name,
    COUNT(pi.id) as invoice_count,
    SUM(pi.cif_total) as total_due,
    SUM(CASE WHEN pi.payment_status = 'paid' THEN pi.cif_total ELSE 0 END) as paid,
    SUM(CASE WHEN pi.payment_status = 'pending' THEN pi.cif_total ELSE 0 END) as pending,
    SUM(CASE WHEN pi.payment_status = 'overdue' THEN pi.cif_total ELSE 0 END) as overdue
FROM clients c
LEFT JOIN proforma_invoices pi ON c.id = pi.client_id
GROUP BY c.id, c.client_name
ORDER BY pending DESC;
```

### Product Performance

```sql
SELECT
    p.product_name,
    SUM(pil.quantity) as total_quantity,
    COUNT(DISTINCT pi.id) as invoice_count,
    AVG(pil.unit_price) as avg_price,
    SUM(pil.quantity * pil.unit_price) as total_sales
FROM products p
JOIN proforma_invoice_lines pil ON p.id = pil.product_id
JOIN proforma_invoices pi ON pil.invoice_id = pi.id
WHERE pi.status = 'completed'
GROUP BY p.id, p.product_name
ORDER BY total_sales DESC;
```

## Accounting Entries

### Double Entry Bookkeeping

```
Every transaction creates two entries:
  1. Debit Entry (Asset/Expense)
  2. Credit Entry (Liability/Revenue)

Example - Invoice Creation:
  - Debit: Accounts Receivable ₹100,000
  - Credit: Sales Revenue ₹100,000

Example - Payment Received:
  - Debit: Cash ₹100,000
  - Credit: Accounts Receivable ₹100,000
```

## Financial Ratios

### Profit Margin

```
Profit Margin (%) = (Net Profit / Revenue) × 100
```

### Current Ratio

```
Current Ratio = Current Assets / Current Liabilities
```

### Debt-to-Equity

```
Debt-to-Equity = Total Debt / Total Equity
```
