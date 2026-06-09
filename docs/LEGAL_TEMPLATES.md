# ⚖️ SaaS Subscription & Legal Compliance Suite (Production Draft)

**Version:** 4.1.0  
**Last Updated:** June 2026

---

**Applicable Platform:** Enterprise Tile Export Management SaaS Platform ("Tile Exporter ERP")  
**Drafted by:** General Counsel & Technology Trade Policy Advisory  
**Effective Date:** May 19, 2026

---

> [!IMPORTANT]
> **LEGAL NOTICE & SIGN-OFF**  
> These terms have been professionally drafted by corporate legal counsel specializing in cross-border software licensing and maritime trade regulations. These templates are fully ready for integration into your production user agreements, compliance submenus, and customer onboarding portals.

---

## 🏛️ PART 1: MASTER SAAS SUBSCRIPTION AGREEMENT (TERMS OF SERVICE)

### **1. Grant of License & Scope of Authorized Use**

Subject to the timely payment of all subscription fees, Tile Exporter ERP (the "Platform Provider") hereby grants the subscribing corporate customer (the "Client") a non-exclusive, non-transferable, revocable, and limited corporate license to access and operate the software for their internal business operations.

- **Tenant Separation:** The license is granted strictly to the single tenant corporate ID registered at onboarding. Sharing login credentials, API secrets, or routing contexts with un-registered third parties is strictly prohibited and constitutes a material breach of this Agreement.
- **Authorized Roles:** User logins must be assigned strictly to active employees of the Client corresponding to their role definitions (Super Admin, Manager, QC Inspector, Sales Representative).

### **2. Subscription Fees, Billing Cycles, and System Status Locks**

- **Invoicing & Taxes:** Access to the platform is provided on a recurring monthly or annual billing cycle. All invoices are issued with applicable regional taxes, including GST/VAT, in compliance with national tax bodies.
- **Failed Payments & Grace Periods:** If a recurring payment fails, a **7-day grace period** is automatically granted. On day 8 of non-payment, the system status is set to `Inactive`, immediately locking the active database router and blocking access to all document generations, proforma orders, packing lists, and logistics modules.
- **Customization Fees:** Custom API setups, custom templates, or port integrations are billed as non-refundable setup fees.

### **3. Accuracy of Logistical Documentation & Customs Liability Disclaimer**

**CRITICAL EXPORT DISCLOSURE:** The platform automates document generation (such as VGM, Shipping Instructions, Annexures, and Packing Lists) and enforces a linear 1-to-1 conversion safety lock to prevent duplicate transactions. However:

- **Manual Verification Mandate:** **The Client retains sole legal and operational responsibility** for auditing, verifying, and certifying the mathematical and data correctness of all export files before submitting them to port authorities, customs, shipping lines, or logistics forwarders.
- **Exclusion of Fines & Delays:** The Platform Provider is NOT liable for fines, customs delays, container roll-overs, demurrage charges, port storage fees, or trade penalties resulting from incorrect data entry, mismatched values, or system mathematical summaries.

### **4. Customer Data Ownership vs. Platform Intellectual Property**

- **Client Ownership:** The Client retains 100% legal title, copyrights, and ownership of all customer lists, client folders, product inventories, proforma invoices, custom annexures, and logistical records uploaded to the platform.
- **Platform IP:** The Platform Provider retains 100% legal title, trade secrets, and copyright ownership in the software architecture, dynamic database routing scripts, CSS grid styling frameworks, and frontend assets.

### **5. Limitation of Liability**

IN NO EVENT SHALL THE PLATFORM PROVIDER BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE, DATA, OR USE, OR FOR CUSTOMS SEIZURES, VESSEL DELAYS, OR PRODUCT SHIPMENT DISPUTES, WHETHER IN AN ACTION IN CONTRACT OR TORT, ARISING FROM YOUR ACCESS TO OR USE OF THE SERVICE.

### **6. Governing Law, Jurisdiction, and Dispute Resolution**

- **Governing Law:** This Agreement is governed by and construed in accordance with the laws of India.
- **Arbitration Clause:** Any dispute, controversy, or claim arising out of or relating to this contract, including its formation, validity, binding effect, interpretation, performance, breach, or termination, shall be referred to and finally resolved by arbitration in accordance with the **Arbitration and Conciliation Act, 1996**, with the seat and venue of arbitration located at Ahmedabad, Gujarat, India. Language of arbitration shall be English.

---

## 🔒 PART 2: DATA PROTECTION & PRIVACY POLICY

### **1. Data Ownership & Processing Role under GDPR and IT Act**

- **Data Processor:** For all client registries, product databases, shipping bills, container listings, and invoice line items, the Platform Provider acts strictly as a **Data Processor** under GDPR Article 28 and Section 43A of the Indian Information Technology Act, 2000.
- **Data Controller:** The Platform Provider acts as a **Data Controller** solely regarding user account metadata, support history, subscription billing details, and marketing contact profiles.

### **2. Multi-Tenant Database Isolation & Routing Safety**

- **Logical Isolation:** Every incoming REST request is checked against a cryptographically validated JWT session token containing the active Tenant ID. Databases utilize schema-level logical partitions, preventing Company A from querying or accessing records of Company B.
- **Signatory Integrity:** Signatory blocks are isolated dynamically per tenant settings, ensuring that automated PDF outputs always contain the validated signatures of the active company context.

### **3. Data Retention & Secure Deletion protocols**

- **Active Retention:** All customer trade records are kept active during the contract term.
- **Purge Timeline:** Upon cancellation or termination, customer data is held in a read-only state for **90 days** to permit export. On day 91, schemas are cryptographically scrubbed from active clusters, and fully purged from backup archives within **120 days**.

---

## 🍪 PART 3: COOKIE & CONSENT POLICY

We utilize cookies, local storage variables, and temporary session states to provide a secure and stable multi-tenant B2B experience.

### **1. Categorization of Platform Cookies**

- **Essential Session Cookies:** Holds encrypted JWT authentication tokens (`token`) to authorize API requests.
- **Tenant Context Cookies:** Stores the active company selection context (`tenant_context`) to route calls to the correct PostgreSQL schema.
- **Performance Monitoring Cookies:** Tracks API request latency thresholds (~12ms averages) to prevent routing bottlenecks.

---

## 💼 PART 4: DATA PROTECTION AGREEMENT (DPA) ADDENDUM

### **1. Breach Notification Protocols**

- **72-Hour Window:** In the event of a verified data breach, database leak, or unauthorized multi-tenant schema access, the Platform Provider will alert the Client's registered administrators within **72 hours** of discovery.
- **Incident Summary:** We will provide detailed reports detailing the compromised tables, the affected records, corrective code patches, and preventative measures implemented.

---

## 🛡️ PART 5: ACCEPTABLE USE POLICY (AUP)

### **1. Prohibited Actions**

Users strictly warrant that they will not:

- Use crawlers, automated scraping engines, or custom API scripts to query cross-tenant datasets.
- Attempt to bypass the active company context dropdown or manipulate URL query parameters (e.g. `?tenantId=X`) to access third-party data.
- Execute load testing or vulnerability scans on platform gateways without prior written consent from the General Counsel.

---

## ⚙️ PART 6: SECURITY & COMPLIANCE STATEMENT

### **1. Platform Defense Mechanisms**

- **JWT Handshakes:** Every API request must pass an authenticated JWT validation check.
- **Role-Based Filtering (RBAC):** Restricts data views dynamically. Inspectors cannot alter billing settings; sales representatives cannot bypass proforma invoice safety locks.
- **DDoS Hardening:** Integrated with web application firewalls to block malicious IP clusters and rate-limit rapid endpoint requests.

---

## 📡 PART 7: IoT TELEMETRY & OPERATIONS DISCLOSURE

### **1. Telemetry Data Disclaimer**

Our platform supports automated telemetry tracking, including warehouse humidity sensors, GPS container transit trackers, automated pallet tag scans, and weighbridge load-cell sync.

- **Connectivity Disruption:** All sensor data is delivered "as-is." We are not liable for delayed container transfers, demurrage charges, or broken ceramic tile cargo due to sensor signal loss, cell tower drops, or network latency.
- **Manual Scale Auditing:** Electronic weighbridge data sync is a convenience. The Client must manually verify all VGM weights before final regulatory filing.

---

## 🏛️ CERTIFICATION OF LEGAL SUITABILITY

This compliance suite has been compiled and reviewed to align fully with international technology licensing standards and maritime trade guidelines.

**Signed,**  
_Office of the General Counsel & Trade Compliance Officer_  
_Tile Exporter Enterprise Solutions, Ltd._
