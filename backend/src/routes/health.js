import express from 'express';
import { requireAdminRole } from '../middleware/rbac.js';
import pool from '../config/database-wrapper.js';

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', async (req, res) => {
  let dbStatus = 'error';
  try {
    const client = await pool.connect();
    client.release();
    dbStatus = 'connected';
  } catch (error) {
    console.error('Healthcheck DB Error:', error);
  }

  res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    db: dbStatus
  });
});

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/detailed', requireAdminRole, async (req, res) => {
  // We check for super_admin role internally since requireAdminRole allows company_admin/admin as well
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super_admin can access detailed health' });
  }

  const memory = process.memoryUsage();
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memory.external / 1024 / 1024)} MB`
    },
    pool: {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    }
  });
});

export default router;
