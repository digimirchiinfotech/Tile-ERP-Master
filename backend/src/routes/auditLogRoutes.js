import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All audit log routes require authentication
router.use(authenticate);

// Get paginated audit logs
router.get('/', getAuditLogs);

export default router;
