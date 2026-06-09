# Production Deployment Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Pre-Deployment Checklist

- [ ] All code reviewed and tested in development
- [ ] All migrations applied and tested
- [ ] All environment variables documented and ready
- [ ] Final validation performed using the [Deployment Readiness Package](deployment_readiness_package.md)
- [ ] SSL/TLS certificates obtained
- [ ] Database backup strategy defined and tested
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented
- [ ] Team trained on the deployment process

---

## Deployment Architecture

```
Production Stack:
├── Frontend:   Vercel / Netlify / S3 + CloudFront
├── Backend:    AWS EC2 / Railway / Render
├── Database:   AWS RDS PostgreSQL / Supabase / Neon
├── Files:      S3 or compatible object storage
├── CDN:        CloudFront / Cloudflare
└── Monitoring: DataDog / CloudWatch / UptimeRobot
```

---

## Environment Configuration

### Production backend/.env

```bash
NODE_ENV=production
PORT=8000
HOST=0.0.0.0

# Database — use a managed PostgreSQL service in production
DATABASE_URL=postgres://prod_user:strong_password@prod-db.region.rds.amazonaws.com:5432/tile_exporter_crm
DB_HOST=prod-db.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=tile_exporter_crm
DB_USER=prod_user
DB_PASSWORD=<use-a-strong-random-password>

# JWT — generate a random string of at least 64 characters
JWT_SECRET=<generate-random-64-char-key>
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Frontend — your production domain
FRONTEND_URL=https://app.yourdomain.com

# Email — use a transactional email service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@yourdomain.com

# Security
BCRYPT_ROUNDS=14
MAX_LOGIN_ATTEMPTS=3
LOCKOUT_DURATION=30

# Logging
LOG_LEVEL=error
```

### Production frontend/.env

```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

---

## Database Setup (AWS RDS)

### Create RDS Instance

1. AWS Console → RDS → Create Database
2. Configuration:
   - Engine: PostgreSQL 15+
   - Instance class: `db.t3.medium` (adjust for load)
   - Allocated storage: 100 GB (gp3)
   - Multi-AZ: Yes (recommended for high availability)
   - Backup retention: 30 days
   - Encryption at rest: Enabled

3. Network & Security:
   - VPC: Production VPC
   - Public accessibility: No
   - Security group: Allow port 5432 from backend EC2 only

4. Backup settings:
   - Enable automated backups
   - Backup window: 3:00 AM UTC
   - Enable Enhanced Monitoring

### Initialize Database

SSH into your EC2 instance, then:

```bash
# Verify connectivity
psql -h prod-db.region.rds.amazonaws.com -U prod_user -d tile_exporter_crm -c "SELECT version();"

# Run all pending migrations
cd /app/backend
node src/database/migrate.js

# Seed initial admin user and master data (first deploy only)
node src/database/seed.js

# Verify tables were created
psql -h prod-db.region.rds.amazonaws.com -U prod_user -d tile_exporter_crm -c "\dt"
```

---

## Backend Deployment (AWS EC2)

### Launch EC2 Instance

- AMI: Ubuntu 22.04 LTS
- Instance type: `t3.large` (adjust based on load)
- Storage: 50 GB gp3
- Security group: Allow ports 8000 (app), 443 (HTTPS), 22 (SSH, restrict to your IP)

### Initial Server Setup

```bash
# Connect
ssh -i prod-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 process manager
sudo npm install -g pm2
```

### Deploy Backend

```bash
# Clone repository
git clone https://github.com/yourusername/tile-exporter.git /app
cd /app/backend

# Install dependencies
npm install --omit=dev

# Create .env with production values
nano .env
# (fill in all production values from the template above)

# Run migrations
node src/database/migrate.js

# Seed initial data (first deploy only)
node src/database/seed.js

# Start with PM2
pm2 start npm --name "tile-backend" -- start

# Enable auto-restart on system reboot
pm2 startup
pm2 save
```

### Verify Backend is Running

```bash
pm2 status
pm2 logs tile-backend --lines 50
curl http://localhost:8000/health
```

### Setup Nginx Reverse Proxy

```bash
sudo apt install -y nginx

# Create site config
sudo tee /etc/nginx/sites-available/tile-api << 'EOF'
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/tile-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificates (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is handled by certbot's systemd timer
sudo systemctl status certbot.timer
```

---

## Frontend Deployment (Vercel)

### Steps

1. Push your repository to GitHub
2. Connect it to Vercel: https://vercel.com/new
3. Configure the build:
   - **Framework**: Vite
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Output directory**: `dist`

4. Add environment variable in Vercel dashboard:

   ```
   VITE_API_BASE_URL=https://api.yourdomain.com/api
   ```

5. Deploy

### Custom Domain

1. Vercel Dashboard → Project → Settings → Domains
2. Add: `app.yourdomain.com`
3. Update DNS:
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com`

---

## Alternative: Railway Deployment

Railway is a simpler alternative to EC2 for hosting the backend:

1. Create a new project at https://railway.app
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Add all environment variables in Railway dashboard
5. Set the start command: `node src/database/migrate.js && npm start`
6. Railway provisions a PostgreSQL database automatically if needed

---

## Database Backup

### Automated Backups

RDS automated backups are configured during instance creation (30-day retention recommended).

### Manual Backup

```bash
# Dump database
pg_dump -h prod-db.region.rds.amazonaws.com -U prod_user -d tile_exporter_crm \
  --no-password -Fc -f backup_$(date +%Y%m%d_%H%M).dump

# Upload to S3
aws s3 cp backup_*.dump s3://your-backup-bucket/tile-exporter/
```

### Restore from Backup

```bash
# Restore from custom-format dump
pg_restore -h prod-db.region.rds.amazonaws.com -U prod_user -d tile_exporter_crm \
  --no-password -Fc backup_20260226_0300.dump
```

---

## Monitoring & Logging

### PM2 Monitoring

```bash
pm2 status           # Check process status
pm2 logs tile-backend --lines 100   # View recent logs
pm2 monit            # Live CPU/memory monitor
```

### Error Monitoring (Sentry — optional)

Install in the backend:

```bash
npm install @sentry/node
```

Configure in `backend/src/server.js`:

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.requestHandler());
// ... routes ...
app.use(Sentry.Handlers.errorHandler());
```

Add to backend `.env`:

```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Health Check Monitoring

Set up an external monitor (e.g., UptimeRobot, Better Uptime) to ping:

```
https://api.yourdomain.com/health
```

Expect HTTP 200 with:

```json
{ "status": "ok" }
```

---

## Performance Optimization

### Database

- Add indexes on columns used in frequent `WHERE` clauses (`company_id`, `created_at`, `status`)
- Use connection pooling (configured in `config/database.js`)
- Archive records older than 3 years using soft-delete + partitioning
- Enable RDS Performance Insights

### Application

- Set `NODE_ENV=production` — enables Express production optimizations
- Enable gzip compression (already configured via `compression` middleware)
- Use a CDN for static frontend assets (Vercel handles this automatically)
- Implement Redis caching for frequently-read reference data (future enhancement)

### Infrastructure

- Use RDS read replicas for analytics/reporting queries
- Use auto-scaling groups for EC2 if traffic is variable
- Load balance between multiple backend instances with AWS ALB

---

## Security Hardening

1. **Strong JWT_SECRET** — generate with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **CORS** — only allow your exact frontend domain:

   ```bash
   FRONTEND_URL=https://app.yourdomain.com
   ```

3. **Database** — never expose port 5432 to the public internet

4. **Dependencies** — audit regularly:

   ```bash
   npm audit
   npm audit fix
   ```

5. **Rate limiting** — already configured; adjust `MAX_LOGIN_ATTEMPTS` and `LOCKOUT_DURATION` for production

6. **File uploads** — validate file types and set maximum file size limits in `multerConfig.js`

7. **HTTP headers** — Helmet is already configured in `server.js`

---

## Deployment Checklist (Going Live)

- [ ] `NODE_ENV=production` set
- [ ] Strong `JWT_SECRET` (64+ random chars) configured
- [ ] SSL certificate installed and auto-renewal enabled
- [ ] Backend health check returns 200
- [ ] Frontend loads correctly and can reach the backend API
- [ ] Login works with the seeded admin account
- [ ] Database migrations ran successfully
- [ ] Admin user password changed from default
- [ ] Email delivery tested (SMTP credentials configured)
- [ ] Monitoring and alerting active
- [ ] Backups configured and tested
- [ ] DNS records propagated
- [ ] PM2 configured to auto-start on server reboot

---

## Rollback Plan

### Quick Rollback

```bash
# On EC2
cd /app

# Tag every release in git
git tag -a v2.1.0 -m "Production release 2026-03-01"
git push origin v2.1.0

# Roll back to previous version
git checkout v2.0.0
cd backend && npm install --omit=dev
pm2 restart tile-backend
```

### Database Rollback

- Use RDS automated snapshots for point-in-time recovery
- For minor changes, write a compensating SQL script
- Keep migration scripts reversible where possible

### Frontend Rollback

- Vercel keeps all previous deployments — use the Vercel dashboard to promote a previous deployment to production instantly

---

## Updating the Application

```bash
# On EC2
cd /app
git pull origin main
cd backend
npm install --omit=dev

# Run any new migrations
node src/database/migrate.js

# Restart the backend (zero-downtime with PM2 cluster mode)
pm2 reload tile-backend
```

For frontend, simply push to the connected Git branch — Vercel deploys automatically.
