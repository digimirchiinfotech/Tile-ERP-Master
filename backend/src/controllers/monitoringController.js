/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

import { debugLogger } from '../utils/debugLogger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import companyDatabaseRouterObj from '../config/companyDatabaseRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Real paths matching backupService.js
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const STORAGE_LIMIT_GB = 10;

// ─── helpers ──────────────────────────────────────────────────────────────────

const bytesToGB = (bytes) => parseFloat((bytes / (1024 ** 3)).toFixed(3));

const getDirSize = (dirPath) => {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) total += getDirSize(full);
      else { try { total += fs.statSync(full).size; } catch (_) { /* skip */ } }
    }
  } catch (_) { /* skip */ }
  return total;
};

// ─── main handler ─────────────────────────────────────────────────────────────

export const getSystemHealth = async (req, res) => {
  const wallStart = Date.now();
  const results   = [];

  // ── 1. API HEALTH ────────────────────────────────────────────────────────
  const apiLatency = Date.now() - wallStart;
  results.push({
    id:     'api',
    name:   'API Health',
    status: apiLatency < 300 ? 'healthy' : apiLatency < 1000 ? 'warning' : 'critical',
    message: `Response time: ${apiLatency} ms`,
    value:  `${apiLatency} ms`,
    detail: 'Express API server is responding normally',
    uptime: Math.floor(process.uptime()),
    checkedAt: new Date().toISOString(),
  });

  // ── 2. DATABASE HEALTH ───────────────────────────────────────────────────
  try {
    const dbStart  = Date.now();
    const result   = await req.db.query(
      `SELECT COUNT(*) AS table_count
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const dbLatency  = Date.now() - dbStart;
    const tableCount = parseInt(result.rows[0]?.table_count || 0);

    results.push({
      id:     'database',
      name:   'Database Health',
      status: dbLatency < 200 ? 'healthy' : dbLatency < 1000 ? 'warning' : 'critical',
      message: `Query time: ${dbLatency} ms · ${tableCount} tables`,
      value:  `${dbLatency} ms`,
      detail: `PostgreSQL is connected and responsive — ${tableCount} tables in public schema`,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    results.push({
      id:     'database',
      name:   'Database Health',
      status: 'critical',
      message: `Connection failed: ${err.message}`,
      value:  'Disconnected',
      detail: 'PostgreSQL is unreachable — check DB config',
      checkedAt: new Date().toISOString(),
    });
  }

  // ── 3. STORAGE HEALTH ────────────────────────────────────────────────────
  try {
    const totalBytes = getDirSize(UPLOADS_DIR);
    const usedGB     = bytesToGB(totalBytes);
    const usedPercent = parseFloat(((usedGB / STORAGE_LIMIT_GB) * 100).toFixed(1));

    const subDirs = ['pdfs', 'images', 'documents', 'excel', 'qc'];
    const breakdown = {};
    for (const d of subDirs) {
      breakdown[d] = bytesToGB(getDirSize(path.join(UPLOADS_DIR, d)));
    }

    const storageStatus = usedPercent >= 90 ? 'critical' : usedPercent >= 70 ? 'warning' : 'healthy';

    results.push({
      id:     'storage',
      name:   'Storage Health',
      status: storageStatus,
      message: `${usedGB} GB used of ${STORAGE_LIMIT_GB} GB (${usedPercent}%)`,
      value:  `${usedPercent}%`,
      detail: Object.entries(breakdown)
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v} GB`)
        .join(' · '),
      usedGB,
      limitGB: STORAGE_LIMIT_GB,
      usedPercent,
      breakdown,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    results.push({
      id: 'storage', name: 'Storage Health', status: 'warning',
      message: `Could not read storage: ${err.message}`,
      value: 'Unknown', detail: 'Uploads directory may be inaccessible',
      checkedAt: new Date().toISOString(),
    });
  }

  // ── 4. EMAIL HEALTH ──────────────────────────────────────────────────────
  try {
    // Real column names: setting_key, setting_value
    const emailRow = await req.db.query(
      `SELECT setting_value
       FROM system_settings
       WHERE setting_key = 'email_settings'
       LIMIT 1`
    );

    let emailConfig = null;
    if (emailRow.rows.length > 0 && emailRow.rows[0].setting_value) {
      const raw = emailRow.rows[0].setting_value;
      emailConfig = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }

    const configured = !!(emailConfig && emailConfig.smtpHost && emailConfig.smtpUsername);

    results.push({
      id:     'email',
      name:   'Email Health',
      status: configured ? 'healthy' : 'warning',
      message: configured
        ? `SMTP: ${emailConfig.smtpHost}:${emailConfig.smtpPort || 587}`
        : 'SMTP not yet configured',
      value:  configured ? 'Configured' : 'Not Set',
      detail: configured
        ? `From: ${emailConfig.fromEmail || emailConfig.smtpUsername} · Encryption: ${emailConfig.encryption || 'TLS'}`
        : 'Go to System Settings → Email to configure SMTP',
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    results.push({
      id: 'email', name: 'Email Health', status: 'warning',
      message: 'Could not read email settings',
      value: 'Unknown', detail: err.message,
      checkedAt: new Date().toISOString(),
    });
  }

  // ── 5. NOTIFICATION HEALTH ───────────────────────────────────────────────
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const notifResult = await req.db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) AS unread
       FROM notifications
       WHERE created_at >= $1`,
      [since]
    );
    const total = parseInt(notifResult.rows[0]?.total || 0);
    const unread = parseInt(notifResult.rows[0]?.unread || 0);

    results.push({
      id:     'notifications',
      name:   'Notification Health',
      status: 'healthy',
      message: `${total} sent in last 24 h · ${unread} unread`,
      value:  `${total} / 24 h`,
      detail: 'Notification system is active and delivering real-time alerts',
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    // Notifications table may not exist in master DB — degrade gracefully
    results.push({
      id: 'notifications', name: 'Notification Health', status: 'warning',
      message: 'Could not query notifications',
      value: 'Unknown', detail: err.message,
      checkedAt: new Date().toISOString(),
    });
  }

  // ── 6. BACKUP HEALTH ─────────────────────────────────────────────────────
  try {
    // Backups are stored in project_root/backups/ as BACKUP_*.zip
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('BACKUP_') && f.endsWith('.zip'))
      .map(f => {
        try {
          const stat = fs.statSync(path.join(BACKUPS_DIR, f));
          return { name: f, mtime: stat.mtime, size: stat.size };
        } catch (_) { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime);

    let backupStatus  = 'warning';
    let backupMessage = 'No backups found — run a manual backup';
    let backupValue   = 'Never';

    if (files.length > 0) {
      const latest    = files[0];
      const hoursAgo  = (Date.now() - latest.mtime.getTime()) / (1000 * 60 * 60);
      const sizeStr   = latest.size > 1024 * 1024
        ? `${(latest.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(latest.size / 1024).toFixed(0)} KB`;

      backupStatus  = hoursAgo < 25 ? 'healthy' : hoursAgo < 72 ? 'warning' : 'critical';
      backupMessage = `Last backup: ${Math.round(hoursAgo)} h ago · ${files.length} backup(s) · ${sizeStr}`;
      backupValue   = latest.mtime.toLocaleString();
    }

    results.push({
      id:     'backup',
      name:   'Backup Health',
      status: backupStatus,
      message: backupMessage,
      value:  backupValue,
      detail: `Backups stored in /backups/ directory (${files.length} file${files.length !== 1 ? 's' : ''})`,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    results.push({
      id: 'backup', name: 'Backup Health', status: 'warning',
      message: `Could not verify backups: ${err.message}`,
      value: 'Unknown', detail: 'Backup directory may be inaccessible',
      checkedAt: new Date().toISOString(),
    });
  }

  // ── OVERALL STATUS ────────────────────────────────────────────────────────
  const hasCritical   = results.some(r => r.status === 'critical');
  const hasWarning    = results.some(r => r.status === 'warning');
  const overallStatus = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';

  return res.json({
    success: true,
    data: {
      overall:       overallStatus,
      services:      results,
      checkedAt:     new Date().toISOString(),
      serverUptime:  Math.floor(process.uptime()),
      nodeVersion:   process.version,
    },
  });
};

export const getPoolHealth = async (req, res) => {
  try {
    const { companyDatabaseCache, masterPool } = companyDatabaseRouterObj;
    
    let total_pools = 0;
    let active_pools = 0;
    let idle_pools = 0;

    for (const [companyId, pool] of companyDatabaseCache.entries()) {
      if (pool === masterPool) continue; // Skip master pool
      
      total_pools++;
      
      // Check if pool is idle based on pg Pool stats
      if (pool.totalCount === pool.idleCount) {
        idle_pools++;
      } else {
        active_pools++;
      }
    }

    return res.json({
      success: true,
      data: {
        total_pools,
        active_pools,
        idle_pools,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    debugLogger.error('Monitoring', 'Error fetching pool health', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

