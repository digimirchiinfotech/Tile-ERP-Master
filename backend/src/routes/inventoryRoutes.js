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
  getWarehouses,
  createWarehouse,
  getStockBalance,
  getStockBalanceByProduct,
  createStockTransaction,
  getStockLedger,
  getLowStockAlerts
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

// NEW INVENTORY MODULE ROUTES
router.get('/warehouses', requirePermission('inventory_management', 'all'), getWarehouses);
router.post('/warehouse', requirePermission('inventory_management', 'all'), createWarehouse);
router.get('/stock-balance', requirePermission('inventory_management', 'all'), getStockBalance);
router.get('/stock-balance/:product_id', requirePermission('inventory_management', 'all'), getStockBalanceByProduct);
router.post('/stock-transaction', requirePermission('inventory_management', 'all'), createStockTransaction);
router.get('/stock-ledger/:product_id', requirePermission('inventory_management', 'all'), getStockLedger);
router.get('/low-stock-alerts', requirePermission('inventory_management', 'all'), getLowStockAlerts);

export default router;
