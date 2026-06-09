#!/bin/bash
 
 # ==========================================================================
 # TILE EXPORTER SAAS - PRODUCTION SETUP SCRIPT
 # Target OS: Ubuntu 22.04 LTS
 # Components: Node.js 20, PostgreSQL 15, Nginx, PM2, UFW Firewall
 # ==========================================================================
 
 set -e # Exit on error
 
 echo "🚀 Starting Production Environment Setup..."
 
 # 1. Update System
 echo "🔄 Updating system packages..."
 sudo apt update && sudo apt upgrade -y
 
 # 2. Install Essential Tools
 echo "🛠️ Installing basic utilities..."
 sudo apt install -y curl git build-essential nginx wget
 
 # 3. Install Node.js 20
 echo "📦 Installing Node.js 20..."
 curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
 sudo apt install -y nodejs
 
 # 4. Install PostgreSQL 15
 echo "🗄️ Installing PostgreSQL 15..."
 sudo apt install -y postgresql postgresql-contrib
 
 # 5. Install PM2 (Process Manager)
 echo "🏃 Installing PM2..."
 sudo npm install -g pm2
 
 # 6. Configure Firewall (Security)
 echo "🛡️ Configuring Firewall..."
 sudo ufw allow OpenSSH
 sudo ufw allow 'Nginx Full'
 sudo ufw --force enable
 
 # 7. Setup Master Database
 echo "💎 Initializing Master Database..."
 # Set a random password for the database user (Change this in production!)
 DB_PASS=$(openssl rand -base64 12)
 sudo -u postgres psql -c "CREATE DATABASE tile_exporter_master;"
 sudo -u postgres psql -c "CREATE USER saas_admin WITH PASSWORD '$DB_PASS';"
 sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tile_exporter_master TO saas_admin;"
 
 # 8. Create Application Directory
 echo "📂 Creating app directory at /var/www/tile-exporter..."
 sudo mkdir -p /var/www/tile-exporter
 sudo chown -R $USER:$USER /var/www/tile-exporter
 
 # 9. Cleanup & Summary
 echo "=========================================================================="
 echo "✅ SETUP COMPLETE!"
 echo "=========================================================================="
 echo "📍 PostgreSQL Master User: saas_admin"
 echo "📍 PostgreSQL Master Password: $DB_PASS"
 echo "📍 Next Steps:"
 echo "   1. Clone your repository into /var/www/tile-exporter"
 echo "   2. Update your backend/.env with the password above"
 echo "   3. Run 'npm install' in both frontend and backend folders"
 echo "   4. Use 'pm2 start' to run the server"
 echo "=========================================================================="
