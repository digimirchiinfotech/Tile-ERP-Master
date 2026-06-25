import { createAuditMiddleware } from '../middleware/auditLog.js';
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

import express from 'express';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  createProducts,
  removeProducts,
  updateProductInCatalogue,
  hardDelete,
  toggleStatus
} from '../controllers/catalogueController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import { createUpload } from '../middleware/multerConfig.js';
import { validateFileMagicBytes } from '../middleware/fileValidator.js';
import {
  createCatalogueValidator,
  updateCatalogueValidator,
  createProductsValidator,
  removeProductsValidator,
  updateProductInCatalogueValidator
} from '../validators/catalogueValidator.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  getAll
);

router.get(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  getById
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  createUpload('DOCUMENT').fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 }
  ]),
  validateFileMagicBytes('DOCUMENT'),
  createCatalogueValidator,
  validateRequest,
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  createUpload('DOCUMENT').fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 }
  ]),
  validateFileMagicBytes('DOCUMENT'),
  updateCatalogueValidator,
  validateRequest,
  update
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  createAuditMiddleware('catalogue', 'DELETE'),
  remove
);

router.post(
  '/:id/products',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  createProductsValidator,
  validateRequest,
  createProducts
);

router.delete(
  '/:id/products',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  removeProductsValidator,
  validateRequest,
  removeProducts
);

router.put(
  '/:id/products/:productId',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  updateProductInCatalogueValidator,
  validateRequest,
  updateProductInCatalogue
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  hardDelete
);

router.patch(
  '/:id/toggle-status',
  authenticate,
  filterByCompany,
  requirePermission('catalogue_management', 'all'),
  createAuditMiddleware('catalogue', 'STATUS_CHANGE'),
  toggleStatus
);

export default router;
