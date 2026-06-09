# Tile Exporter SaaS: Easy Deployment Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

This guide provides an exact, step-by-step checklist to deploy this specific codebase to a live production environment. We will use **Render** (for the backend and database) and **Vercel** (for the React frontend) because they are the easiest and most reliable platforms for Node/React applications.

---

## Part 1: Deploy the Database & Backend (Render.com)

Render is excellent because it can host both your PostgreSQL multi-tenant database and your Node.js backend seamlessly.

### Step 1: Create the Database

1. Create a free account at [Render.com](https://render.com).
2. Click **New +** and select **PostgreSQL**.
3. Name it `tile-exporter-db`.
4. Select your preferred region (e.g., Singapore or Frankfurt).
5. Choose the **Free** or **Starter** tier and click **Create Database**.
6. Once created, copy the **Internal Database URL** (we will use this in the next step).

### Step 2: Deploy the Backend API

1. On the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub account and select this repository.
3. Configure the web service:
   - **Name:** `tile-exporter-api`
   - **Root Directory:** `backend` (very important!)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. **Environment Variables:** Scroll down to Advanced -> Environment Variables. Add the following exactly as written:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = _(Paste the Internal Database URL you copied in Step 1)_
   - `JWT_SECRET` = `(Create a long random string here, e.g. super_secret_tile_jwt_key_2026)`
   - `PORT` = `8000`
5. Click **Create Web Service**.
6. Render will now download the code, install dependencies, and start `node src/server.js`.

### Step 3: Initialize the Master Database

Because this is a multi-tenant platform, you must seed the initial Master Database (which creates the companies architecture) before the app will work.

1. In your Render Web Service dashboard, click on the **Shell** tab.
2. Type the following command and hit Enter:
   ```bash
   npm run db:setup
   ```
3. This runs the `setupMasterDB.js`, `migrate.js`, and `seed.js` files we created dynamically. Your database is now ready for production users!

---

## Part 2: Deploy the Frontend (Vercel.com)

Vercel is the absolute best place to host Vite/React applications. It is free, blisteringly fast, and provides instant SSL certificates.

### Step 1: Link to Vercel

1. Create a free account at [Vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Connect your GitHub account and import this repository.

### Step 2: Configure the Frontend Build

1. **Framework Preset:** Select `Vite`.
2. **Root Directory:** Click Edit and select `frontend` (very important!).
3. Expand **Environment Variables** and add:
   - `VITE_API_BASE_URL` = `https://tile-exporter-api.onrender.com/api` _(Warning: Replace `tile-exporter-api.onrender.com` with the actual public URL Render gave your backend in Part 1!)_
4. Click **Deploy**.

### Step 3: Test and Map Domains

1. Vercel will run `vite build` and instantly give you a live URL (e.g. `https://tile-exporter-frontend.vercel.app`).
2. Open that URL. The frontend will ping the Render backend, authenticate, and load the dashboard!
3. (Optional) Go to Vercel Dashboard -> Settings -> Domains to map your custom professional domain name (e.g. `app.yourdomain.com`).

---

## Troubleshooting

- **Frontend says "Network Error" or "API Unreachable":**
  You probably forgot to set the `VITE_API_BASE_URL` on Vercel, or you didn't append `/api` to the end of the Render URL.
- **Backend crashes complaining about "User does not exist" or "Table not found":**
  You missed Part 1, Step 3. You must execute `npm run db:setup` in the backend shell to instantiate the initial database tables.
- **Multi-tenant creation fails:**
  Ensure the database user created by Render has `CREATEDB` privileges so the application can spawn isolated databases for new clients. If it fails, you can run the app in Single-Tenant mode by commenting out the dynamic DB creation block in `payment-webhook`.
