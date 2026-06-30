import express from 'express';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateGSTIN } from '../controllers/gstinController.js';

const router = express.Router();

router.use(authenticate, filterByCompany);

router.post('/validate', requirePermission('client_management', 'supplier_management', 'all'), validateGSTIN);

export default router;
