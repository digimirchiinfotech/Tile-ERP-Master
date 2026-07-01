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
  getStockBalance,
  createGRN,
  getGRNs,
  getStockLedger,
  createWarehouse,
  updateWarehouse
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
router.post('/warehouses', requirePermission('inventory_management', 'all'), createWarehouse);
router.put('/warehouses/:id', requirePermission('inventory_management', 'all'), updateWarehouse);

router.get('/stock-balance', requirePermission('inventory_management', 'all'), getStockBalance);

// NEW MODULES
router.post('/grn', requirePermission('inventory_management', 'all'), createGRN);
router.get('/grn', requirePermission('inventory_management', 'all'), getGRNs);
router.get('/ledger', requirePermission('inventory_management', 'all'), getStockLedger);

export default router;
