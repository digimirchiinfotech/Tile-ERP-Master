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

/**
 * Bulk Delete Routes
 * API endpoints for multi-delete operations
 */

import express from 'express';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  bulkDeleteClients,
  bulkDeleteLeads,
  bulkDeleteSuppliers,
  bulkDeleteProducts,
  bulkDeleteCatalogues,
  bulkDeleteInvoices,
  bulkHardDelete,
  bulkRestore
} from '../controllers/bulkDeleteController.js';
import { bulkAction } from '../controllers/bulkActionController.js';

const router = express.Router();

router.post('/clients', authenticate, filterByCompany, requirePermission('client_management', 'all'), bulkDeleteClients);
router.post('/leads', authenticate, filterByCompany, requirePermission('lead_management', 'all'), bulkDeleteLeads);
router.post('/suppliers', authenticate, filterByCompany, requirePermission('supplier_management', 'all'), bulkDeleteSuppliers);
router.post('/products', authenticate, filterByCompany, requirePermission('product_management', 'all'), bulkDeleteProducts);
router.post('/catalogues', authenticate, filterByCompany, requirePermission('catalogue_management', 'all'), bulkDeleteCatalogues);
router.post('/invoices', authenticate, filterByCompany, requirePermission('proforma_invoice', 'all'), bulkDeleteInvoices);
router.delete('/hard', authenticate, filterByCompany, requirePermission('all'), bulkHardDelete);
router.post('/restore', authenticate, filterByCompany, requirePermission('all'), bulkRestore);
router.post('/action', authenticate, filterByCompany, requirePermission('all'), bulkAction);

export default router;
