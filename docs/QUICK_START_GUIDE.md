# Quick Start Guide — Tile Exporter Solution

**Version:** 4.1.0  
**Last Updated:** June 2026

Get the system running in under 5 minutes.

---

## Prerequisites

- Node.js 20+
- PostgreSQL 13+
- npm 9+

---

## Step 1: Configure Environment

```bash
# Copy the example environment file
cp backend/.env.example backend/.env
```

Open `backend/.env` and set at minimum:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/tile_exporter
JWT_SECRET=your-strong-random-secret-at-least-32-characters
NODE_ENV=development
```

---

## Step 2: Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend (open a new terminal)
cd frontend && npm install
```

---

## Step 3: Initialize the Database

```bash
cd backend

# Run all migrations (creates all tables)
node src/database/migrate.js

# Seed initial data (creates admin user + master data)
node src/database/seed.js
```

---

## Step 4: Start the Application

**Terminal 1 — Backend:**

```bash
cd backend && npm start
```

Backend runs on: `http://localhost:8000`

**Terminal 2 — Frontend:**

```bash
cd frontend && npm run dev -- --host 0.0.0.0 --port 5000
```

Frontend runs on: `http://localhost:5000`

---

## Step 5: Log In

Open `http://localhost:5000` in your browser.

```
Email:    admin@admin.com
Password: (set via ADMIN_PASSWORD environment variable before running seed.js)
```

**Change the admin password immediately after first login.**

---

## Default Ports

| Service           | Port | URL                          |
| ----------------- | ---- | ---------------------------- |
| Frontend (Vite)   | 5000 | http://localhost:5000        |
| Backend (Express) | 8000 | http://localhost:8000        |
| API Base          | 8000 | http://localhost:8000/api    |
| Health Check      | 8000 | http://localhost:8000/health |

---

## On Replit

Both servers are pre-configured and start automatically:

- **App Server (Vite)** — Runs the React frontend
- **Backend Server** — Runs migrations, seed, then Express API

No additional setup is required. The `DATABASE_URL` and `JWT_SECRET` are configured as Replit Secrets.

---

## Verify Everything Works

```bash
# Check backend health
curl http://localhost:8000/health

# Expected response:
# {"status":"ok","timestamp":"...","database":"connected"}
```

---

## Next Steps

- [Getting Started Guide](USER_GUIDE_GETTING_STARTED.md) — Learn to navigate the system
- [Daily Operations Guide](USER_GUIDE_DAILY_OPERATIONS.md) — Complete your first export workflow
- [API Documentation](05_API_DOCUMENTATION.md) — Integrate with the API
- [Production Deployment Guide](07_PRODUCTION_DEPLOYMENT_GUIDE.md) — Deploy to production

---

_For issues, see [Troubleshooting & FAQ](14_TROUBLESHOOTING_AND_FAQQA.md)_
