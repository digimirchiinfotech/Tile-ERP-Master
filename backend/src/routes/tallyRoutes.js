import express from 'express';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { exportSalesToTally } from '../controllers/tallyController.js';

const router = express.Router();

router.use(authenticate, filterByCompany);

router.get('/export-sales', requirePermission('export_management', 'account_management', 'all'), exportSalesToTally);

export default router;
