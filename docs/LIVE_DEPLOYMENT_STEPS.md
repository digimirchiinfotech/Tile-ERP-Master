# 🚀 Live Deployment Guide — Tile Exporter SaaS

**Version:** 5.0.0 | **Stack:** Node.js + React (Vite) + PostgreSQL + Nginx + PM2
**Last Updated:** June 2026

> **Who is this for?** This guide is written for someone deploying for the first time. Every command is explained. Every step tells you WHY, not just WHAT.

---

## 📋 TABLE OF CONTENTS

1. [What You Need Before Starting](#phase-0)
2. [Buy & Access Your Server](#phase-1)
3. [Connect to Your Server from Windows](#phase-2)
4. [Install All Server Software](#phase-3)
5. [Upload Your Project Code](#phase-4)
6. [Configure Environment Variables](#phase-5)
7. [Setup the Database](#phase-6)
8. [Start the Backend with PM2](#phase-7)
9. [Build & Serve the Frontend](#phase-8)
10. [Configure Nginx Reverse Proxy](#phase-9)
11. [Enable HTTPS / SSL Certificate](#phase-10)
12. [Configure Firewall](#phase-11)
13. [Verify Everything is Working](#phase-12)
14. [Monitoring & Maintenance](#phase-13)
15. [Automated Backups](#phase-14)
16. [Troubleshooting Common Problems](#phase-15)

---

## PHASE 0 — What You Need Before Starting {#phase-0}

Before touching any server, prepare these 4 things:

### ✅ Checklist

| Item               | What It Is                                         | Where to Get                                  |
| ------------------ | -------------------------------------------------- | --------------------------------------------- |
| **Domain Name**    | Your website address e.g. `app.mytileexporter.com` | Namecheap, GoDaddy, Hostinger (~₹800/yr)      |
| **VPS Server**     | A Linux computer in the cloud that runs 24/7       | DigitalOcean, Hostinger VPS, Contabo, Hetzner |
| **Git Repository** | Your code hosted on GitHub/GitLab                  | github.com (free)                             |
| **`.env` values**  | Your secret passwords and config                   | You create these — see Phase 5                |

### 💡 Recommended Server Specs

| Clients             | RAM  | CPU     | Storage    | Estimated Cost |
| ------------------- | ---- | ------- | ---------- | -------------- |
| Up to 20 companies  | 2 GB | 1 Core  | 50 GB SSD  | ~$6/month      |
| Up to 100 companies | 4 GB | 2 Cores | 80 GB SSD  | ~$12/month     |
| 100+ companies      | 8 GB | 4 Cores | 160 GB SSD | ~$24/month     |

> **Recommended for beginners:** [Hostinger VPS](https://www.hostinger.com/vps-hosting) — has a simple control panel. Choose **Ubuntu 22.04 LTS** as the OS when setting up.

---

## PHASE 1 — Buy & Access Your Server {#phase-1}

### Step 1.1 — Buy a VPS

1. Go to [hostinger.com](https://hostinger.com) or [digitalocean.com](https://digitalocean.com)
2. Choose a VPS plan (2GB RAM minimum)
3. Select **Ubuntu 22.04 LTS** as the operating system
4. Choose a data center region closest to your users (e.g., Singapore for India)
5. Complete payment — you will receive an **IP address** and **root password** by email

> **Your server IP** will look like: `165.22.45.123` — save this.

### Step 1.2 — Point Your Domain to the Server

1. Log into your domain registrar (Namecheap / GoDaddy)
2. Go to **DNS Settings** for your domain
3. Add an **A Record**:
   - **Type:** `A`
   - **Host:** `@` (or `app` if you want `app.yourdomain.com`)
   - **Value:** Your server IP address (e.g. `165.22.45.123`)
   - **TTL:** Automatic
4. Also add a `www` A record pointing to the same IP
5. DNS propagation takes **5 to 30 minutes** (sometimes up to 24 hours)

> ✅ Test propagation at: [dnschecker.org](https://dnschecker.org)

---

## PHASE 2 — Connect to Your Server from Windows {#phase-2}

You control your server by typing commands into it remotely using **SSH**.

### Step 2.1 — Install PuTTY (SSH Client for Windows)

1. Download PuTTY from: [putty.org](https://www.putty.org/)
2. Install it normally

### Step 2.2 — Connect to Your Server

1. Open **PuTTY**
2. In the **Host Name** field, type your server IP (e.g. `165.22.45.123`)
3. Port: `22` (default, leave it)
4. Click **Open**
5. A black terminal window opens — it asks: `login as:` → type `root` → press Enter
6. It asks for password → type the password from your email (you won't see it as you type — that's normal) → press Enter
7. You're now inside your server! The prompt looks like: `root@ubuntu:~#`

> **Alternative (built into Windows 11):** Open **PowerShell** or **Command Prompt** and type:
>
> ```
> ssh root@165.22.45.123
> ```
>
> Then enter your password when asked.

### Step 2.3 — Create a Secure User (Best Practice)

Running everything as `root` is dangerous. Create a regular user:

```bash
# Create a new user called "deployer"
adduser deployer

# Give it admin powers
usermod -aG sudo deployer

# Switch to the new user
su - deployer
```

> From now on, all commands are run as `deployer`. Your prompt changes to `deployer@ubuntu:~$`

---

## PHASE 3 — Install All Server Software {#phase-3}

This is a one-time setup. Run these commands **in order**.

### Step 3.1 — Update the Server

```bash
# Download the latest software list and upgrade existing software
sudo apt update && sudo apt upgrade -y
```

> This is like Windows Update. Takes 2-5 minutes.

### Step 3.2 — Install Node.js 20

```bash
# Download the Node.js 20 setup script from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation (should print v20.x.x)
node --version
npm --version
```

### Step 3.3 — Install PostgreSQL 15

```bash
# Install PostgreSQL database server
sudo apt install -y postgresql postgresql-contrib

# Start the database service
sudo systemctl start postgresql

# Make PostgreSQL auto-start when the server reboots
sudo systemctl enable postgresql

# Verify it's running
sudo systemctl status postgresql
# You should see "active (running)" in green
```

### Step 3.4 — Install PM2 (Process Manager)

PM2 keeps your Node.js backend running 24/7. If it crashes, PM2 restarts it automatically.

```bash
# Install PM2 globally
sudo npm install -g pm2
```

### Step 3.5 — Install Nginx (Web Server)

Nginx handles incoming web traffic and routes it to your frontend and backend.

```bash
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx

# Auto-start on reboot
sudo systemctl enable nginx

# Verify (should say "active (running)")
sudo systemctl status nginx
```

### Step 3.6 — Install Git

```bash
sudo apt install -y git

# Confirm
git --version
```

### Step 3.7 — Install Certbot (for Free SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## PHASE 4 — Upload Your Project Code {#phase-4}

### Method A — From GitHub (Recommended)

If your project is on GitHub:

```bash
# Go to the /var/www directory (standard place for websites)
cd /var/www

# Create a folder for your app
sudo mkdir tile-exporter
sudo chown deployer:deployer tile-exporter
cd tile-exporter

# Clone your repository (replace with your actual GitHub URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git .

# List files to confirm they're there
ls -la
# You should see: backend/  frontend/  package.json  etc.
```

> **If your repo is private:**
>
> 1. On GitHub, go to **Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
> 2. Generate a new token with `repo` permissions
> 3. Use this URL format when cloning:
>    ```bash
>    git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git .
>    ```

### Method B — Upload via SFTP (FileZilla)

If your code is not on GitHub:

1. Download [FileZilla](https://filezilla-project.org/) on your Windows PC
2. Open FileZilla
3. Fill in: **Host:** `sftp://165.22.45.123` | **Username:** `deployer` | **Password:** your server password | **Port:** `22`
4. Click **Quickconnect**
5. On the left panel (your PC), navigate to `D:\Dev\143\143`
6. On the right panel (server), navigate to `/var/www/tile-exporter`
7. Drag your project folders (`backend/`, `frontend/`, `ecosystem.config.js`, etc.) to the server

---

## PHASE 5 — Configure Environment Variables {#phase-5}

Your backend needs a `.env` file with secret values. **This file is never committed to Git.**

### Step 5.1 — Create the Backend `.env`

```bash
# Navigate to the backend folder
cd /var/www/tile-exporter/backend

# Create the .env file (this opens a text editor in the terminal)
nano .env
```

> **How to use `nano`:** Type your content. Press `CTRL+X` to exit, press `Y` to save, press `Enter` to confirm filename.

Paste and fill in the following template:

```env
# Server Configuration
NODE_ENV=production
PORT=8000

# Database — Master database connection
DATABASE_URL=postgresql://saas_admin:YOUR_STRONG_PASSWORD@localhost:5432/tile_exporter_master

# Security — Generate a random 64-character string for this
# Run this command to generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=PASTE_YOUR_64_CHARACTER_RANDOM_STRING_HERE

# Frontend URL (used for CORS — must match your actual domain)
FRONTEND_URL=https://app.yourdomain.com

# Optional: OpenAI (if using AI features)
OPENAI_API_KEY=sk-...

# Optional: Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_...

# Optional: Email (for password reset, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

> **To generate a secure JWT secret**, run this first:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
>
> Copy the output and paste it as `JWT_SECRET`.

### Step 5.2 — Create the Frontend `.env`

```bash
cd /var/www/tile-exporter/frontend
nano .env
```

```env
# This tells React where to find the backend API
VITE_API_URL=https://app.yourdomain.com/api
```

---

## PHASE 6 — Setup the Database {#phase-6}

### Step 6.1 — Create Database User and Master Database

```bash
# Switch to the postgres system user
sudo -u postgres psql
```

You are now inside the PostgreSQL command line. Run these SQL commands:

```sql
-- Create a strong password user
CREATE USER saas_admin WITH PASSWORD 'YOUR_STRONG_PASSWORD';

-- Create the master database
CREATE DATABASE tile_exporter_master;

-- Give full access
GRANT ALL PRIVILEGES ON DATABASE tile_exporter_master TO saas_admin;

-- Also grant schema permissions (important for PostgreSQL 15+)
\c tile_exporter_master
GRANT ALL ON SCHEMA public TO saas_admin;
GRANT CREATE ON SCHEMA public TO saas_admin;

-- Exit postgres
\q
```

> ⚠️ **Replace `YOUR_STRONG_PASSWORD`** with the same password you used in the `.env` file `DATABASE_URL`.

### Step 6.2 — Install Backend Dependencies

```bash
cd /var/www/tile-exporter/backend

# Install all npm packages listed in package.json
npm install
```

### Step 6.3 — Run Database Migrations & Seed Data

```bash
# This command runs 3 scripts in order:
# 1. setupMasterDB.js — creates master tables
# 2. migrate.js — runs all schema migrations
# 3. seed.js — inserts default data (Super Admin account, etc.)
npm run db:setup
```

> If this completes without errors, your database is ready. If you see an error, check:
>
> - Is the password in `.env` matching the one you set in Step 6.1?
> - Is PostgreSQL running? (`sudo systemctl status postgresql`)

### Step 6.4 — Verify the Database

```bash
# Connect to your database and verify tables exist
sudo -u postgres psql -d tile_exporter_master

# List all tables
\dt

# You should see tables like: companies, users, products, etc.
\q
```

---

## PHASE 7 — Start the Backend with PM2 {#phase-7}

### Step 7.1 — Test Backend Manually First

```bash
cd /var/www/tile-exporter/backend

# Run it once to check for errors
node src/server.js
```

You should see output like:

```
✅ Master DB connected
🚀 Server running on port 8000
```

Press `CTRL+C` to stop it. Now start it properly with PM2:

### Step 7.2 — Start with PM2

```bash
cd /var/www/tile-exporter

# Start the backend using the ecosystem config file
pm2 start ecosystem.config.js --only tile-exporter-backend

# OR manually:
pm2 start backend/src/server.js --name "tile-backend"

# Check it's running
pm2 list
# You should see: tile-backend | online
```

### Step 7.3 — Save PM2 Config & Enable Auto-Start

```bash
# Save the current PM2 process list
pm2 save

# Generate startup script so PM2 restarts after server reboot
pm2 startup

# The command above prints a command starting with "sudo env PATH=..."
# COPY that command and RUN it exactly as printed
# Example:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deployer --hp /home/deployer
```

### Step 7.4 — Monitor Backend Logs

```bash
# See real-time logs
pm2 logs tile-backend

# See last 100 lines
pm2 logs tile-backend --lines 100

# Press CTRL+C to stop watching logs
```

---

## PHASE 8 — Build & Serve the Frontend {#phase-8}

### Step 8.1 — Install Frontend Dependencies

```bash
cd /var/www/tile-exporter/frontend

npm install
```

### Step 8.2 — Build the Production Bundle

```bash
npm run build
```

This creates a `dist/` folder with optimized, minified HTML/CSS/JS files. Takes 1-3 minutes.

```bash
# Verify the build folder was created
ls dist/
# You should see: index.html  assets/  etc.
```

> ✅ **The `dist/` folder is what Nginx will serve to your users.**

---

## PHASE 9 — Configure Nginx Reverse Proxy {#phase-9}

Nginx does two things:

1. **Serves** your built React frontend files
2. **Proxies** `/api` requests to your Node.js backend on port 8000

### Step 9.1 — Create Nginx Config File

```bash
sudo nano /etc/nginx/sites-available/tile-exporter
```

Paste this entire configuration (replace `app.yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name app.yourdomain.com www.app.yourdomain.com;

    # Serve React Frontend
    root /var/www/tile-exporter/frontend/dist;
    index index.html;

    # Handle React Router — always serve index.html for unknown routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the Node.js backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeout for large file uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;

        # Increase max upload size (for logo uploads etc.)
        client_max_body_size 10M;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression for faster page loads
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

Press `CTRL+X`, then `Y`, then `Enter` to save.

### Step 9.2 — Enable the Config

```bash
# Create a symbolic link to enable the config
sudo ln -s /etc/nginx/sites-available/tile-exporter /etc/nginx/sites-enabled/

# Remove the default Nginx page
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config for syntax errors
sudo nginx -t
# Should say: configuration file test is successful

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

> At this point, your site is accessible on `http://app.yourdomain.com` (HTTP only — no padlock yet).

---

## PHASE 10 — Enable HTTPS / SSL Certificate {#phase-10}

This gives your site the **🔒 padlock** in the browser and makes it accessible via `https://`. It's **free** using Let's Encrypt.

### Step 10.1 — Run Certbot

```bash
sudo certbot --nginx -d app.yourdomain.com
```

Follow the interactive prompts:

1. Enter your email address (for renewal reminders)
2. Agree to terms → type `A` → Enter
3. Choose whether to share email → type `N` → Enter
4. Certbot automatically edits your Nginx config to add SSL

### Step 10.2 — Verify Auto-Renewal

SSL certificates expire every 90 days. Certbot sets up auto-renewal automatically. Test it:

```bash
sudo certbot renew --dry-run
# Should say: Congratulations, all renewals succeeded.
```

> ✅ Your site is now live at `https://app.yourdomain.com`

---

## PHASE 11 — Configure Firewall {#phase-11}

A firewall blocks unauthorized access to your server. Only allow the ports you need.

```bash
# Allow SSH (so you can still connect remotely)
sudo ufw allow ssh

# Allow HTTP (port 80)
sudo ufw allow 'Nginx HTTP'

# Allow HTTPS (port 443)
sudo ufw allow 'Nginx HTTPS'

# Block everything else and enable the firewall
sudo ufw enable

# Verify rules
sudo ufw status
```

Expected output:

```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx HTTP                 ALLOW       Anywhere
Nginx HTTPS                ALLOW       Anywhere
```

> ⚠️ **Do NOT block port 22 (SSH)** or you will lock yourself out of the server permanently.

---

## PHASE 12 — Verify Everything is Working {#phase-12}

Go through this checklist to confirm your deployment is correct:

### ✅ Verification Checklist

```bash
# 1. Check PM2 backend is running
pm2 list
# tile-backend should show: online

# 2. Check Nginx is running
sudo systemctl status nginx
# Should show: active (running)

# 3. Check PostgreSQL is running
sudo systemctl status postgresql
# Should show: active (running)

# 4. Test the backend API directly
curl http://localhost:8000/api/health
# Should return: {"status":"ok"} or similar

# 5. Test via domain
curl https://app.yourdomain.com/api/health
# Should return the same JSON response
```

### ✅ Browser Verification

1. Open your browser and go to `https://app.yourdomain.com`
2. You should see the **Tile Exporter login page**
3. Check for the 🔒 padlock in the browser address bar
4. Try logging in with the Super Admin credentials seeded during `npm run db:setup`
5. Register a test company and verify the tenant database is created

```bash
# Watch live backend logs while testing in browser
pm2 logs tile-backend
```

---

## PHASE 13 — Monitoring & Maintenance {#phase-13}

### Daily Monitoring Commands

```bash
# View all running PM2 processes
pm2 list

# Real-time CPU and memory dashboard
pm2 monit

# View last 50 lines of backend logs
pm2 logs tile-backend --lines 50

# Check disk space (keep above 20% free)
df -h

# Check RAM usage
free -m

# Check server load
top
# Press 'q' to quit
```

### Updating Your Application (Deploying New Code)

When you push new code to GitHub and want to update the live server:

```bash
cd /var/www/tile-exporter

# Pull latest code from GitHub
git pull origin main

# Update backend dependencies (if package.json changed)
cd backend && npm install && cd ..

# Run any new migrations
cd backend && npm run migrate && cd ..

# Restart backend (zero-downtime restart)
pm2 reload tile-backend

# Rebuild frontend (if frontend code changed)
cd frontend
npm install
npm run build
cd ..

# Reload Nginx (not usually needed but safe to do)
sudo systemctl reload nginx

echo "✅ Deployment complete!"
```

---

## PHASE 14 — Automated Backups {#phase-14}

Set up automatic daily database backups so you never lose data.

### Step 14.1 — Create Backup Script

```bash
# Create a backup directory
sudo mkdir -p /var/backups/tile-exporter
sudo chown deployer:deployer /var/backups/tile-exporter

# Create the backup script
nano /home/deployer/backup.sh
```

Paste this:

```bash
#!/bin/bash
# Tile Exporter — Daily Database Backup Script

BACKUP_DIR="/var/backups/tile-exporter"
DATE=$(date +%Y-%m-%d_%H-%M)
FILENAME="backup_${DATE}.sql.gz"

# Dump ALL databases (including all tenant schemas)
pg_dumpall -U postgres | gzip > "${BACKUP_DIR}/${FILENAME}"

# Keep only last 30 backups (delete older ones)
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup saved: ${BACKUP_DIR}/${FILENAME}"
```

```bash
# Make it executable
chmod +x /home/deployer/backup.sh

# Test it manually
/home/deployer/backup.sh

# Verify the backup file was created
ls -lh /var/backups/tile-exporter/
```

### Step 14.2 — Schedule Automatic Daily Backups

```bash
# Open the cron scheduler
crontab -e

# Choose editor 1 (nano) if asked
```

Add this line at the bottom (runs every day at 2:00 AM):

```
0 2 * * * /home/deployer/backup.sh >> /home/deployer/backup.log 2>&1
```

Press `CTRL+X`, `Y`, `Enter` to save.

```bash
# Verify the cron job is saved
crontab -l
```

---

## PHASE 15 — Troubleshooting Common Problems {#phase-15}

### ❌ Problem: Site shows "502 Bad Gateway"

**Cause:** Nginx is running but the Node.js backend is not.

```bash
# Check if backend is running
pm2 list

# If it shows "errored" or "stopped":
pm2 restart tile-backend

# Check what the error is
pm2 logs tile-backend --lines 30
```

### ❌ Problem: Backend starts then immediately crashes

```bash
# Check logs for the error message
pm2 logs tile-backend --lines 50

# Common causes:
# 1. Wrong DATABASE_URL in .env — check password matches PostgreSQL user
# 2. Port 8000 already in use — run: sudo lsof -i :8000
# 3. Missing .env file — check: ls -la backend/.env
```

### ❌ Problem: "Cannot connect to database"

```bash
# Is PostgreSQL running?
sudo systemctl status postgresql

# If stopped, start it:
sudo systemctl start postgresql

# Can you connect manually?
sudo -u postgres psql -d tile_exporter_master -U saas_admin -h localhost

# If connection refused, check pg_hba.conf allows md5 auth:
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Find the line for "local all all peer" and ensure localhost uses "md5"
sudo systemctl restart postgresql
```

### ❌ Problem: Frontend shows blank white page

```bash
# Check if the dist folder exists and has files
ls /var/www/tile-exporter/frontend/dist/

# If empty, rebuild:
cd /var/www/tile-exporter/frontend
npm run build

# Check Nginx is pointing to the right folder
cat /etc/nginx/sites-available/tile-exporter | grep root
# Should show: root /var/www/tile-exporter/frontend/dist;
```

### ❌ Problem: SSL Certificate fails (Certbot error)

```bash
# Make sure your domain DNS is pointing to this server IP
# Test with:
curl -I http://app.yourdomain.com

# If DNS isn't resolving yet, wait 30 minutes and try again
# Certbot needs to reach your domain over HTTP to verify ownership
```

### ❌ Problem: "Permission denied" errors

```bash
# Fix ownership of the project folder
sudo chown -R deployer:deployer /var/www/tile-exporter

# Fix permissions
sudo chmod -R 755 /var/www/tile-exporter
```

### ❌ Problem: API calls return 404 or CORS error

```bash
# Check FRONTEND_URL in backend .env matches your actual domain exactly
cat /var/www/tile-exporter/backend/.env | grep FRONTEND_URL

# Check VITE_API_URL in frontend .env
cat /var/www/tile-exporter/frontend/.env

# After editing .env, restart backend and rebuild frontend
pm2 restart tile-backend
cd /var/www/tile-exporter/frontend && npm run build
```

---

## 📊 Quick Reference — Important Paths

| What                 | Path                                       |
| -------------------- | ------------------------------------------ |
| Project root         | `/var/www/tile-exporter/`                  |
| Backend code         | `/var/www/tile-exporter/backend/`          |
| Backend `.env`       | `/var/www/tile-exporter/backend/.env`      |
| Frontend built files | `/var/www/tile-exporter/frontend/dist/`    |
| Nginx config         | `/etc/nginx/sites-available/tile-exporter` |
| Nginx logs           | `/var/log/nginx/access.log` & `error.log`  |
| Database backups     | `/var/backups/tile-exporter/`              |

## 🔑 Quick Reference — Key Commands

| Task               | Command                             |
| ------------------ | ----------------------------------- |
| See backend status | `pm2 list`                          |
| View backend logs  | `pm2 logs tile-backend`             |
| Restart backend    | `pm2 restart tile-backend`          |
| Reload Nginx       | `sudo systemctl reload nginx`       |
| Restart PostgreSQL | `sudo systemctl restart postgresql` |
| Manual backup      | `/home/deployer/backup.sh`          |
| Pull latest code   | `git pull origin main`              |
| Rebuild frontend   | `cd frontend && npm run build`      |
| Check disk space   | `df -h`                             |
| Check RAM          | `free -m`                           |

---

## 🎯 Deployment Complete!

Once you finish all phases, your platform is:

- 🌐 **Live** at `https://app.yourdomain.com`
- 🔒 **Secured** with HTTPS / SSL
- ⚙️ **Managed** by PM2 with auto-restart
- 🗄️ **Backed up** daily automatically
- 🛡️ **Protected** by UFW firewall
- 📈 **Ready** to onboard companies via the Super Admin panel

> **Next step:** Log into Super Admin → Create your first company → Share the login credentials with the client.
