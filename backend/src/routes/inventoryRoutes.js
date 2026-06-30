import express from 'express';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getStockRegister,
  getStockSummary,
  recordStockMovement,
  createReservation,
  releaseReservation,
  getMovements,
  getReservations,
  getWarehouses,
  getStockBalance
} from '../controllers/inventoryController.js';

const router = express.Router();

router.use(authenticate, filterByCompany);

router.get('/summary', requirePermission('inventory_management', 'product_management', 'all'), getStockSummary);
router.get('/register', requirePermission('inventory_management', 'product_management', 'all'), getStockRegister);
router.get('/movements', requirePermission('inventory_management', 'product_management', 'all'), getMovements);
router.get('/reservations', requirePermission('inventory_management', 'product_management', 'all'), getReservations);
router.post('/movements', requirePermission('inventory_management', 'product_management', 'all'), recordStockMovement);
router.post('/reservations', requirePermission('inventory_management', 'product_management', 'all'), createReservation);
router.post('/reservations/:id/release', requirePermission('inventory_management', 'product_management', 'all'), releaseReservation);

// MODULE DASHBOARD ROUTES
router.get('/warehouses', requirePermission('inventory_management', 'all'), getWarehouses);
router.get('/stock-balance', requirePermission('inventory_management', 'all'), getStockBalance);

export default router;
