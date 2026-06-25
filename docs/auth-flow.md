# Authentication & Security Flow

This document details the security architecture of the Tile ERP application, specifically focusing on authentication, authorization, and data protection.

## Authentication Strategy (Hybrid)

The Tile ERP application employs a hybrid authentication strategy to support both web clients (cookies) and mobile/external API clients (bearer tokens).

1. **Web Clients (Browsers):**
   - The primary authentication mechanism uses HTTP-only, secure cookies (`token`).
   - Cookies prevent XSS attacks from extracting the JWT.
   - Requires robust CSRF protection since cookies are automatically sent by browsers.

2. **API/Mobile Clients:**
   - Authenticate via the `Authorization: Bearer <token>` header.
   - Bypasses CSRF protection as CSRF attacks rely on automatic cookie submission.

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection is active for all mutating requests (POST, PUT, DELETE, PATCH).

- **Token Generation:** The backend provides a `GET /api/csrf-token` endpoint. 
- **Validation:** 
  - The token is checked on mutating requests via the `x-csrf-token` header or the `_csrf` body payload.
  - **Exception:** Requests containing a valid `Authorization: Bearer` header are explicitly bypassed by the CSRF middleware since bearer tokens are immune to CSRF.
  - **Storage:** CSRF tokens are mapped to user sessions (IP or User ID) in a centralized Map (which must be migrated to Redis for multi-instance deployments).

## Rate Limiting & Abuse Prevention

1. **Global Limits:** 300 requests per 15 minutes per IP.
2. **Strict Limits:** Mutating operations (writes) are restricted to 60 requests per 15 minutes.
3. **Sensitive Limits:** Export, financial, and user management endpoints are capped at 30 requests per 15 minutes.
4. **Progressive Backoff:** The system tracks 4xx and 5xx errors per IP. Sustained errors result in escalating block durations (e.g., 5 minutes, 30 minutes) to thwart brute force and vulnerability scanning.

## Data Protection (PII Encryption & Masking)

### AES-256-GCM Encryption
Sensitive fields (e.g., bank details, consignee information) are encrypted at rest using AES-256-GCM.
- Encryption occurs transparently at the controller level before database insertion.
- Decryption occurs upon reading before the data hits the API response layer.

### Role-Based Data Masking
The `dataMaskingMiddleware` sanitizes API responses before they leave the server based on the requester's role:
- **Clients:** All financial data (bank accounts, PAN, GST) is completely scrubbed from responses.
- **Sales Reps:** Identifiers and bank details are partially masked (e.g., `******1234`).
- **Admins & Finance:** Full visibility.

## Audit Logs (Immutability)

- Every mutation (CREATE, UPDATE, DELETE) is logged to the `audit_logs` table.
- A database-level trigger strictly forbids `UPDATE` and `DELETE` operations on this table.
- To prevent tenant isolation bypasses or data loss, all audit events are immediately replicated to a cross-tenant `global_audit_logs` table in the master schema.
