# 📖 Enterprise User Onboarding Manual

**Version:** 4.1.0  
**Last Updated:** June 2026

---

Welcome to the Tile Exporter Solution. This manual guides your team through the platform's **"Golden Workflow"**—managing export cycles from lead qualification to strict post-shipment customs documentation.

---

## 🏦 Stage 1: The Sales Cycle (Sales Executive / Manager)

### **1.1 Lead Registration & Qualification**

- Navigate to **CRM > Lead Management** to record incoming client prospects.
- Once a deal is finalized, convert the lead to a active **Client** profile.

### **1.2 Proforma Invoice (PI) Generation**

- Go to **Proforma Management > Proforma Invoices** and click "New Invoice".
- Select the target Client; the system will auto-calculate taxes, quantities, and totals.
- Export the PI as a professional A4 PDF to secure the client's advance payment.

---

## 🧪 Stage 2: Quality Inspection & Production (QC & Purchase Manager)

### **2.1 Quality Control (QC) Approvals**

- The **QC Inspector** logs in to view pending Proforma Orders.
- The inspector must complete a quality check sheet for each product line.
- **System Requirement:** A product line must receive a "Pass" status before the order can be converted to downstream shipping documents.

---

## 📄 Stage 3: Strict 1-to-1 Document Conversion Pipeline

The platform enforces a strict, linear downstream document lock cycle. Once a downstream child document is created, the parent document is locked to prevent duplicate submissions:

$$\text{Proforma Invoice (PI)} \rightarrow \text{Export Invoice (EI)} \rightarrow \text{Packing List (PL)} \rightarrow \text{Annexure (ANX)} \rightarrow \text{Invoice Backside (IB)} \rightarrow \text{VGM} \rightarrow \text{Shipping Instructions (SI)}$$

### **3.1 Generating the Export Invoice (EI)**

- Navigate to **Export Management > Export Invoices** and click "Create".
- Use the **Reference Selector** to select your approved Proforma Invoice.
- The system will automatically pull and pre-fill all client, banking, and cargo details. Saving the Export Invoice locks the source Proforma Invoice.

### **3.2 Generating the Packing List (PL)**

- Go to **Export Management > Packing List Management** and select the saved Export Invoice.
- The system will dynamically calculate net and gross weights, pallet layouts, and box specifications. Saving the Packing List locks the parent Export Invoice.

### **3.3 Generating the Annexure (ANX)**

- Go to **Export Management > Annexure** and link the Packing List.
- This generates the statutory shipping data sheets required for port clearance. Saving locks the source Packing List.

### **3.4 Generating the Invoice Backside (IB)**

- Navigate to **Export Management > Invoice Backside** and link the Annexure.
- This forms the customs and excise clearance document. Saving locks the source Annexure.

---

## 🚛 Stage 4: Logistics & Port Clearance (Shipping & Documentation Roles)

### **4.1 Verified Gross Mass (VGM)**

- Navigate to **Export Management > VGM** and link the active Invoice Backside.
- Verify container weights, tare calculations, and shipper details for SOLAS compliance. Saving locks the source Invoice Backside.

### **4.2 Shipping Instructions (SI)**

- Navigate to **Export Management > Shipping Instructions** and link the VGM.
- Finalize vessel names, voyage numbers, container seals, and draft details.
- Saving the Shipping Instructions locks the VGM, completing the 1-to-1 document pipeline.
- Generate the final high-fidelity A4 document printout to secure the Bill of Lading (BL) from the shipping line.

---

## 🛠️ Stage 5: Platform Administration (Company Admin)

### **5.1 Role-Based Access Control (RBAC)**

- Go to **Administration > User Management** to invite staff.
- Assign appropriate roles (e.g. Sales, QC, Account) to restrict dashboard access to authorized pipelines.
