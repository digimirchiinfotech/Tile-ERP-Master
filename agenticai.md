# Agentic AI Architecture for Tile Exporter ERP

## 1. System Understanding & Workflow Analysis
After deeply analyzing the **Tile Exporter Solution**, it's clear that the system is an enterprise-grade, multi-tenant B2B SaaS designed for strict operational compliance. 

### Core Workflows:
1. **Sales & CRM**: Leads → Clients → Proforma Invoice (PI) → Proforma Order (PO)
2. **Production & QC**: Order Sheet → Factory Assignment → QC Records & Defect Logging
3. **Export Documentation**: IGST Invoice → Export Invoice (EI) → Packing List (PL) → Annexure → Invoice Backside → VGM → Shipping Instructions.
4. **Finance**: Account entries, payment tracking.

### Key Architectural Constraints:
- **Database Isolation**: One PostgreSQL database per tenant (company).
- **Strict 1-to-1 Locking**: Downstream document generation locks the upstream document to prevent duplication.
- **RBAC**: 11 distinct user roles limiting data access.

### AI Opportunities:
The highly structured, sequential nature of the workflows presents perfect opportunities for an Agentic AI architecture. Agents can take over repetitive document transformations, anomaly detection, and data-driven alerting, serving as "virtual employees" for the ERP tenants.

---

## 2. Proposed Agentic AI Architecture

We propose a **Multi-Agent System (MAS)** using a hierarchical "Orchestrator-Worker" model. The system will integrate natively into the existing Node.js/Express backend.

### A. The Orchestrator Agent (The Manager)
- **Role**: A central AI assistant embedded in the React frontend (via a chat interface or voice command). 
- **Function**: Interprets user intent, extracts parameters, and routes the task to the appropriate specialized sub-agent.
- **Security**: It securely binds to the user's JWT `req.companyFilter`, guaranteeing that all sub-agents operate strictly within the isolated tenant database.

### B. Specialized Sub-Agents (The Workforce)

#### 1. Sales & Catalog Agent (Virtual Sales Rep)
- **Tasks**: 
  - Analyzes incoming leads and emails.
  - Uses RAG (Retrieval-Augmented Generation) on the Tile & Sanitaryware Catalog to answer buyer queries about specs (size, thickness, HSN, box weights).
  - Autonomously drafts Proforma Invoices (PI) based on natural language requests (e.g., "Draft a PI for Acme Corp for 20 pallets of 60x60 gloss tiles").
- **Tools Needed**: `SearchCatalog`, `DraftProformaInvoice`, `FetchClientDetails`.

#### 2. Documentation & Compliance Agent (Virtual Logistics Coordinator)
- **Tasks**:
  - Hooks into the `exportWorkflowInterconnectionService`.
  - When an Export Invoice is generated, this agent automatically drafts the Packing List, mapping boxes/pallets based on product master rules.
  - Continuously runs consistency checks (e.g., "Do the net weights in the VGM match the Invoice Backside exactly?").
- **Tools Needed**: `VerifyDocumentLineage`, `DraftDownstreamDocument`, `CheckConsistencyMismatch`.

#### 3. Production & QC Agent (Virtual Factory Supervisor)
- **Tasks**:
  - Monitors the active "Order Sheets" and compares daily production logs against the Proforma Order delivery timeline.
  - Analyzes QC Records. If defect rates exceed a threshold, it sends predictive alerts to the Production Manager about potential shipment delays.
- **Tools Needed**: `AnalyzeProductionVelocity`, `QueryQCLogs`.

#### 4. Finance Agent (Virtual Accountant)
- **Tasks**:
  - Scans outstanding Export Invoices against payment logs.
  - Drafts and queues polite follow-up emails to clients for overdue payments.
- **Tools Needed**: `QueryAccountLedger`, `SendEmail`.

---

## 3. Implementation Strategy

### Phase 1: AI Infrastructure Setup
- **Framework**: Use LangChain.js or Microsoft AutoGen (adapted for Node.js) to manage agent state and tool calling.
- **LLM Provider**: Integrate OpenAI (GPT-4o) or Anthropic (Claude 3.5 Sonnet) for robust reasoning.
- **Vector Database**: Add `pgvector` to the Tenant PostgreSQL databases to store embeddings of the Product Catalog and past resolved leads.

### Phase 2: Tool & Skill Development
Expose the existing Express controllers as functional tools for the AI:
- `getCompleteWorkflowData` → AI can answer "What is the status of the Acme Corp shipment?"
- `getDataForNextStage` → AI can prepopulate forms automatically.
- Ensure all AI tool executions pass through the existing `dbRouter.js` and `auditLog.js` middlewares to maintain data isolation and audit trails.

### Phase 3: Frontend Integration
- Build an AI Assistant Widget using React 18, applying the platform's custom glassmorphism styling.
- Enable "Agentic Actions" directly from tables (e.g., clicking a magic wand icon on an Export Invoice to have the AI auto-generate and validate the Packing List).

## 4. Security & Compliance
- **Tenant Boundary Enforcement**: The Orchestrator Agent must never be allowed to formulate direct SQL queries. Instead, it interacts with predefined REST tools that already enforce the `req.companyFilter`.
- **Human-in-the-Loop (HITL)**: Agents should "draft" transactional documents (like PIs or Packing Lists). A human user must still click "Save & Finalize" to trigger the `is_used = TRUE` lock progression.
- **Audit Logging**: Every action taken by an AI agent is logged in the `audit_logs` table with the user ID `System_AI` and the human initiator's context.
