#!/bin/bash

# ==========================================================================
# TILE EXPORTER SAAS - LIVE LAUNCH SCRIPT
# This script builds and starts the application for production.
# ==========================================================================

set -e

echo "🚀 Launching Tile Exporter SaaS in Production Mode..."

# 1. Backend Setup
echo "📡 Setting up Backend..."
cd backend
npm install
# Run migrations to ensure DB is up to date
npm run db:setup || echo "⚠️ Database already setup, skipping..."
cd ..

# 2. Frontend Setup & Build
echo "🎨 Setting up Frontend & Generating Production Build..."
cd frontend
npm install
npm run build
cd ..

# 3. Start/Restart with PM2
echo "⚙️ Starting processes with PM2..."
pm2 delete all || true # Clear old processes
pm2 start ecosystem.config.js
pm2 save

echo "=========================================================================="
echo "🎉 SUCCESS! YOUR APP IS NOW LIVE INTERNALLY."
echo "=========================================================================="
echo "📍 Backend Running on Port: 8000"
echo "📍 Frontend Running on Port: 5000"
echo "📍 Use 'pm2 status' to monitor your app."
echo "📍 Use 'pm2 logs' to see real-time activity."
echo "=========================================================================="
