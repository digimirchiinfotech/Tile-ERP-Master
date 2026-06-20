import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import swaggerUI from 'swagger-ui-express';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import env from './config/env.js';
import pool from './config/database-wrapper.js';
import swaggerConfig from './docs/swagger.js';
import logger from './utils/debugLogger.js';
import { Server } from 'socket.io';
import socketService from './services/socketService.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import middleware
import errorHandler from './middleware/errorHandler.js';
import securityHeaders from './middleware/securityHeaders.js';
import requestLogger from './middleware/requestLogger.js';
import performanceMonitor, { getMetrics } from './middleware/performanceMonitor.js';
import csrfProtection from './middleware/csrf.js';
import { preventParameterPollution, sanitizeInput } from './middleware/inputValidation.js';
import { authenticate, optionalAuth } from './middleware/auth.js';
import { dbRouter } from './middleware/dbRouter.js';
import { standardizePayload } from './middleware/standardizePayload.js';
import { requireAdminRole } from './middleware/rbac.js';

import { cleanupExpiredTokens } from './utils/tokenManager.js';
import { initSubscriptionScheduler } from './jobs/subscriptionScheduler.js';
import { runGlobalSchemaMigration } from './utils/globalSchemaMigration.js';
import { initBackupScheduler } from './utils/backupScheduler.js';
import { ensurePerformanceIndexes } from './utils/ensurePerformanceIndexes.js';

// Import routes
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import clientRoutes from './routes/clients.js';
import productRoutes from './routes/products.js';
import sanitarywareProductRoutes from './routes/sanitarywareProducts.js';
import catalogueRoutes from './routes/catalogues.js';
import leadRoutes from './routes/leads.js';
import invoiceRoutes from './routes/proformaInvoices.js';
import orderRoutes from './routes/proformaOrders.js';
import masterDataRoutes from './routes/masterData.js';
import supplierRoutes from './routes/suppliers.js';
import supportTicketRoutes from './routes/supportTickets.js';
import companyRoutes from './routes/companies.js';
import qcRecordRoutes from './routes/qcRecords.js';
import subscriptionRoutes from './routes/subscriptions.js';
import notificationRoutes from './routes/notifications.js';

import packingListRoutes from './routes/packingLists.js';
import shippingInstructionRoutes from './routes/shippingInstructions.js';
import accountEntryRoutes from './routes/accountEntries.js';
import workflowRoutes from './routes/workflows.js';
import rateHistoryRoutes from './routes/rateHistory.js';
import sessionRoutes from './routes/sessionRoutes.js';
import searchRoutes from './routes/search.js';
import globalSearchRoutes from './routes/global-search.js';
import profileRoutes from './routes/profile.js';
import dashboardRoutes from './routes/dashboardStats.js';
import pdfTemplateRoutes from './routes/pdfTemplates.js';
import csvImportRoutes from './routes/csvImport.js';
import csvExportRoutes from './routes/csvExport.js';
import reportsRoutes from './routes/reports.js';
import systemSettingsRoutes from './routes/systemSettings.js';
import companyManagementRoutes from './routes/companyManagement.js';
import messagesRoutes from './routes/messages.js';
import clientOrderRoutes from './routes/clientOrders.js';
import exportInvoiceRoutes from './routes/exportInvoices.js';
import exportInvoiceAnnexureRoutes from './routes/exportInvoiceAnnexures.js';
import invoiceBacksideRoutes from './routes/invoiceBacksides.js';
import vgmRoutes from './routes/vgmRoutes.js';
import igstInvoiceRoutes from './routes/igstInvoices.js';
import exportDocumentReferencesRoutes from './routes/exportDocumentReferences.js';
import paymentRoutes from './routes/paymentRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import bulkDeleteRoutes from './routes/bulkDeleteRoutes.js';
import bulkRoutes from './routes/bulkRoutes.js';
import exportWorkflowInterconnectionRoutes from './routes/exportWorkflowInterconnection.js';
import customsClearancesRoutes from './routes/customsClearances.js';
import certificatesRoutes from './routes/certificates.js';
import adminPasswordResetRoutes from './routes/admin-password-reset.js';
import emailNotificationRoutes from './routes/emailNotifications.js';
import adminConsistencyRoutes from './routes/admin.js';
import storageRoutes from './routes/storage.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import sizePackingMasterRoutes from './routes/sizePackingMasterRoutes.js';
import factoryMasterRoutes from './routes/factoryMasterRoutes.js';
import productionSheetRoutes from './routes/productionSheetRoutes.js';
import orderSheetRoutes from './routes/orderSheets.js';
import signatureRoutes from './routes/signatureRoutes.js';

import backupRoutes from './routes/backupRoutes.js';
import tenantBackupRoutes from './routes/tenantBackupRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import pdfRoutes from './routes/pdf.js';
import lockRoutes from './routes/lockRoutes.js';
import documentActivityRoutes from './routes/documentActivity.js';

const app = express();

app.set('trust proxy', 1);

// ─── CORS ── Must be registered FIRST, before helmet and securityHeaders ───────
// This ensures preflight OPTIONS requests are handled before any other middleware
// can reject or modify them.
const corsOptions = {
  origin: (origin, callback) => {
    // Allow all origins in development
    if (env.node_env === 'development') {
      callback(null, true);
    } else {
      // In production: allow explicitly listed origins + any *.vercel.app preview URL
      const allowedOrigins = env.frontend_url 
        ? env.frontend_url.split(',').map(u => u.trim().replace(/\/$/, '')) 
        : [];
      
      const normalizedOrigin = origin ? origin.trim().replace(/\/$/, '') : '';

      if (!origin) {
        // Allow server-to-server (internal health checks, Railway probes)
        callback(null, true);
      } else if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(null, false);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'x-company-id', 'x-selected-company-id'],
  maxAge: 3600
};

// Handle preflight OPTIONS requests immediately — before any other middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Security & Middleware Stack
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(securityHeaders);



app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(standardizePayload);
app.use(sanitizeInput);
app.use(compression());
app.use(requestLogger);
app.use(performanceMonitor);
app.use(preventParameterPollution);

if (env.node_env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(dbRouter); // Global database context


// ─── RATE LIMITING ─────────────────────────────────────────────────────────────
// Raised to 1000 req/15 min: an ERP dashboard with 10+ polling hooks (invoices,
// products, leads, clients, suppliers, etc.) easily exceeds 300 in normal use.
// Socket.IO handles real-time updates, so polling intervals are being relaxed too.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.node_env === 'development' ? 2000 : 1000,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and metrics
    return req.path === '/health';
  }
});
app.use('/api/', globalLimiter);

// Strict limiter for mutating operations (POST/PUT/PATCH/DELETE)
// Applied specifically in sensitive modules via route-level middleware
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // 60 write operations per 15 minutes per IP
  message: { success: false, message: 'Too many write requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication limiter — stricter: 20 failed attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' },
  skipSuccessfulRequests: true, // Only count failures
  standardHeaders: true,
  legacyHeaders: false,
});

// Documentation (admin-only in production)
if (env.node_env === 'development') {
  app.use('/api/docs', swaggerUI.serve);
  app.get('/api/docs', swaggerUI.setup(swaggerConfig, {
    swaggerOptions: { url: '/api/docs/swagger.json' }
  }));
  app.get('/api/docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerConfig);
  });
} else {
  // In production, require authentication and admin role
  app.use('/api/docs', authenticate, (req, res, next) => {
    if (!['super_admin', 'company_admin', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }
    next();
  }, swaggerUI.serve);
  app.get('/api/docs', authenticate, (req, res, next) => {
    if (!['super_admin', 'company_admin', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }
    swaggerUI.setup(swaggerConfig)(req, res, next);
  });
  app.get('/api/docs/swagger.json', authenticate, (req, res) => {
    if (!['super_admin', 'company_admin', 'admin'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerConfig);
  });
}

// ─── SERVE UPLOADED FILES (signatures, images, etc.) ──────────────────────────
// Must be registered BEFORE the frontend static path so /uploads/* routes resolve correctly.
const uploadsDir = join(__dirname, '..', env.upload.dir || 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  etag: true,
}));

// Serve built frontend static files
const frontendDistPath = join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath, { index: false }));

// Root route - serve frontend
app.get('/', (req, res) => {
  res.sendFile(join(frontendDistPath, 'index.html'));
});

// Health & Metrics
app.get('/health', async (req, res) => {
  try {
    const result = await req.db.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: result.rows.length > 0 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

app.get('/api/metrics', authenticate, (req, res) => {
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'company_admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  getMetrics(req, res);
});

app.post('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ success: true, token: req.csrfToken() });
});

// Rate limiting for file access
const fileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many file requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

import { serveFile } from './controllers/fileController.js';

// Secure File Access Route
app.get('/api/files/:filename', authenticate, fileLimiter, serveFile);

// SECURITY FIX (HIGH-SEC-004): Removed optionalAuth — all file access now requires
// a valid JWT. Unauthenticated users cannot enumerate or download uploaded files.
app.get('/uploads/:filename', authenticate, fileLimiter, serveFile);

// SECURITY: Backup files are admin-only — require full authentication + admin role
app.get('/uploads/backups/:filename', authenticate, requireAdminRole, fileLimiter, (req, res, next) => {
  const { filename } = req.params;
  const backupsDir = resolve(process.cwd(), 'uploads', 'backups');
  const fullPath = resolve(backupsDir, filename);

  if (!fullPath.startsWith(backupsDir)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, message: 'Backup file not found' });
  }

  res.download(fullPath);
});

// Feature Routes
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/client-orders', clientOrderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sanitaryware-products', sanitarywareProductRoutes);
app.use('/api/catalogues', catalogueRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/proforma-invoices', invoiceRoutes); // Alias for frontend compatibility
app.use('/api/orders', orderRoutes);
app.use('/api/proforma-orders', orderRoutes); // Alias for frontend compatibility
app.use('/api/master-data', masterDataRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/support-tickets', supportTicketRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/qc-records', qcRecordRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/order-sheets', orderSheetRoutes);
// signatures mounted once below with authenticate

app.use('/api/packing-lists', packingListRoutes);

app.use('/api/export-shipping-instructions', shippingInstructionRoutes);
app.use('/api/shipping-instructions', shippingInstructionRoutes); // Alias for compatibility
app.use('/api/export-invoices', exportInvoiceRoutes);
app.use('/api/export-invoice-annexures', exportInvoiceAnnexureRoutes);
app.use('/api/invoice-backsides', invoiceBacksideRoutes);
app.use('/api/vgm', vgmRoutes);
app.use('/api/export-igst-invoices', igstInvoiceRoutes);
app.use('/api/igst-invoices', igstInvoiceRoutes);

app.use('/api/export-documents', exportDocumentReferencesRoutes);
app.use('/api/export-workflow', exportWorkflowInterconnectionRoutes);
app.use('/api/export-customs-clearances', customsClearancesRoutes);
app.use('/api/export-certificates', certificatesRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/bulk-delete', authenticate, bulkDeleteRoutes); // Legacy route
app.use('/api/bulk', bulkRoutes); // New unified generic bulk API
app.use('/api/pdf-templates', pdfTemplateRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/account-entries', accountEntryRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/rate-history', rateHistoryRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/global-search', globalSearchRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import', csvImportRoutes);
app.use('/api/csv-export', csvExportRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/admin', companyManagementRoutes);
app.use('/api/admin', adminPasswordResetRoutes);
app.use('/api/admin', adminConsistencyRoutes);
app.use('/api/email-notifications', emailNotificationRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/tenant-backups', tenantBackupRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/locks', lockRoutes);
app.use('/api/document-activity', documentActivityRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/size-packing-master', sizePackingMasterRoutes);
app.use('/api/factory-master', factoryMasterRoutes);
app.use('/api/production-sheets', productionSheetRoutes);
app.use('/api/signatures', authenticate, signatureRoutes);

// SPA catch-all: serve frontend index.html for all non-API GET routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(join(frontendDistPath, 'index.html'));
});

// 404 handler (API routes only)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    status: 404
  });
});

// Error handling
app.use(errorHandler);

// Server startup — skip in test mode (supertest uses app directly)
const PORT = env.port || 8000;
const HOST = env.host || '0.0.0.0';

let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, HOST);

  const io = new Server(server, {
    cors: corsOptions,
    path: '/socket.io'
  });
  socketService.initSocket(io);

  server.on('listening', () => {
    logger.info('Server', `
📊 Using PostgreSQL database (production)
🚀 Tile Exporter Solution Backend Server Started
========================================
Environment: ${env.node_env}
Server: http://${HOST}:${PORT}
Health Check: http://${HOST}:${PORT}/health
API Docs: http://${HOST}:${PORT}/api/docs
API Base: http://${HOST}:${PORT}/api
========================================
    `);

    runGlobalSchemaMigration().catch(err =>
      logger.warn('Server', `Global schema migration warning: ${err.message}`)
    );

    ensurePerformanceIndexes().catch(err =>
      logger.warn('Server', `Performance index check warning: ${err.message}`)
    );

    setTimeout(() => {
      initSubscriptionScheduler();
      initBackupScheduler();
    }, 1000);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      logger.error('Server', `Port ${PORT} is already in use. Please stop the process using it or set a different PORT.`);
      process.exit(1);
    }
    logger.error('Server', 'Server error:', err);
    process.exit(1);
  });
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  if (!server) return;
  logger.info('Server', `Received ${signal}. Starting graceful shutdown procedure...`);

  // 1. Stop accepting new HTTP requests
  server.close(async () => {
    logger.info('Server', 'HTTP server closed. Starting database connection pool drains...');
    try {
      // 2. Import dynamic router and close all company databases
      const { default: router } = await import('./config/companyDatabaseRouter.js');
      const { companyDatabaseCache, masterPool } = router;

      const closePromises = [];
      for (const [companyId, poolInstance] of companyDatabaseCache.entries()) {
        if (poolInstance && poolInstance !== masterPool) {
          logger.info('Server', `Draining connection pool for company "${companyId}"...`);
          closePromises.push(poolInstance.end().catch(err =>
            logger.error('Server', `Error draining pool for company "${companyId}":`, err.message)
          ));
        }
      }

      // Drain company connection pools in parallel
      await Promise.all(closePromises);
      logger.info('Server', 'All company database pools drained successfully.');

      // 3. Close the master pool
      if (masterPool) {
        logger.info('Server', 'Draining master database pool...');
        await masterPool.end();
      }

      // 4. Close the compatibility pool wrapper
      await pool.end();

      logger.info('Server', 'Graceful shutdown complete. Exiting process safely.');
      process.exit(0);
    } catch (err) {
      logger.error('Server', 'Error during database pool cleanup:', err);
      process.exit(1);
    }
  });

  // Force close after 15 seconds if pools are hanging
  setTimeout(() => {
    logger.error('Server', 'Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 15000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Prevent global process crashes from unhandled database promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Server', 'Unhandled Rejection at:', promise, 'reason:', reason);
  // Do not exit the process, allowing the server to gracefully continue serving other requests
});

process.on('uncaughtException', (error) => {
  logger.error('Server', 'Uncaught Exception (FATAL):', error);
  // Uncaught exceptions leave the process in an undefined state.
  // Log the error, then exit so the process manager (PM2/Railway) can restart cleanly.
  gracefulShutdown('uncaughtException').finally(() => process.exit(1));
});

// Cleanup expired tokens periodically
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
}

export default app;
