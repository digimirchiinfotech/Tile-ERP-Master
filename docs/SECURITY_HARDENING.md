# SaaS Security & IP Hardening Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

This guide details the security configurations and IP protection strategies implemented across the Tile Exporter SaaS platform to secure source code, prevent hacking, and isolate client data.

---

## 1. 🛡️ Intellectual Property (IP) Protection

### **Private Source Repositories**

- **Crucial:** Do not upload this source code to any public GitHub/GitLab repositories. Use a **Private Repository** with strict team permissions.
- The system `.gitignore` is pre-configured to ensure local configuration parameters (`.env`, `.env.local`) are never committed.

### **Production Minification & Obfuscation**

- Always deploy the client application using `npm run build`.
- This triggers Vite's Rollup build chain, compiling React and Bootstrap JSX elements into highly compressed, obfuscated, and minified production bundles within the `dist/` folder, protecting front-end logic from reverse-engineering.

---

## 2. 🗄️ Multi-Tenant Data Protection

### **Stealth Router Security Mode**

To block tenant probing and context-hijacking:

- Standard users are bound strictly to their authenticated tenant DB context (`req.companyFilter`).
- If a client manually crafts unauthorized headers (e.g. `x-company-id` overrides) to attempt data querying across other company profiles, the gateway interceptor in `auth.js` automatically rejects the request and returns a **Stealth 404 Not Found** instead of a `403 Forbidden`, masking the system context and preventing endpoint enumeration.

### **Dynamic Connection Encryption**

- Credentials for dynamic tenant connection databases are stored within the Master Database in **AES-256-CBC** encrypted format.
- **Action Required:** Before going live, ensure `ENCRYPTION_KEY` inside `backend/.env` is set to a secure, random 32-byte key.
- _Warning:_ If the encryption key is lost, connection credentials for existing tenants can no longer be decrypted, preventing database routing.

### **SSL/TLS Encryption**

- Never serve the platform over unencrypted HTTP.
- Our production script configures Nginx to force TLS 1.3 (HTTPS) with Let's Encrypt certificates, ensuring all transactional client data remains fully secure in transit.

---

## 3. 🚧 Infrastructure Hardening

### **Database Network Isolation**

- Ensure PostgreSQL is bound strictly to `localhost` (`127.0.0.1`) or local interfaces.
- Configure the database firewall to reject all incoming public network traffic, restricting database access solely to the Express API backend gateway running on the local host.

### **API Rate Limiting**

- The Express API gateway implements dynamic rate limiting using `express-rate-limit`.
- Authentication endpoints are capped at a maximum of 15 attempts per 15-minute window to protect against brute-force attacks.

---

## 🚫 4. Administrative Control (Kill-Switch)

If a tenant account violates terms or fails billing:

1.  Set the target client's record to `status = 'Inactive'` in the `companies` coordinator table within the **Master Database**.
2.  The backend `dbRouter.js` middleware will immediately intercept and reject all subsequent incoming requests for that company ID, disabling application access.
