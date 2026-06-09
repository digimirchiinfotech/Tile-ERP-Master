# 🚀 Final SaaS Launch Checklist

**Version:** 4.1.0  
**Last Updated:** June 2026

---

Follow these steps to deploy the Tile Exporter SaaS platform to production in under 5 minutes.

---

### 1. Server Environment Setup

- Provision a Virtual Private Server (Ubuntu 22.04 LTS recommended, 4GB+ RAM).
- SSH into your target machine:
  ```bash
  ssh root@your_server_ip
  ```
- Execute the environment setup utility to configure PostgreSQL, Node, Nginx, and system dependencies:
  ```bash
  bash setup_production.sh
  ```

### 2. Codebase Retrieval & Installation

- Clone the repository in a secure directory:
  ```bash
  git clone <your_private_repo_url> /var/www/tile-exporter
  cd /var/www/tile-exporter
  ```

### 3. Production Environment Configuration (`backend/.env`)

Create a secure production `.env` file on your server with hardened secrets:

```env
NODE_ENV=production
PORT=8000
DB_HOST=localhost
DB_NAME=tile_exporter_master
DB_USER=saas_admin
DB_PASSWORD=<Your_Secure_DB_Password_From_setup_production>
JWT_SECRET=<High_Entropy_64_Character_JWT_Key>
JWT_REFRESH_SECRET=<High_Entropy_64_Character_Refresh_Key>
CORS_ORIGIN=https://app.yourdomain.com
```

### 4. Database Sync & Multi-Tenant Schema Validation

Ensure all dynamic connection routing tables and tenant definitions are synced and schema columns are self-healed:

```bash
cd backend
npm run db:setup     # Seeding master metrics
node src/scripts/sync-tenant-db.js  # Runs validation checks across all dynamic connection pools
```

### 5. Automated SaaS Orchestration Launch

Run the automated deployment script to trigger PM2 background tasks and web compilation:

```bash
cd /var/www/tile-exporter
bash launch_production.sh
```

### 6. Domain Setup & SSL Certificate Enforcements

Configure Nginx configurations to redirect traffic securely to backend port `8000` and frontend client folder `/var/www/tile-exporter/frontend/dist`:

- Establish Nginx templates at `/etc/nginx/sites-available/default`.
- Run Let's Encrypt Certbot to acquire a free, auto-renewing SSL certificate:
  ```bash
  sudo certbot --nginx -d app.yourdomain.com
  ```

---

**🎉 Your enterprise B2B SaaS platform is now LIVE and fully secure for customer operations!**
