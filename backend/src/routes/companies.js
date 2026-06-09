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
import * as companyController from '../controllers/companyController.js';
import * as companyValidator from '../validators/companyValidator.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/inputValidation.js';
import { upload } from '../middleware/fileUpload.js';

const router = express.Router();

// Public endpoints (no auth required)
router.post('/register', companyValidator.registerCompanyValidation, validateRequest, companyController.registerCompany);
router.get('/modules/available', companyController.getAvailableModules);

// Protected endpoints (Auth required)
router.use(authenticate);

// Only super admin can list and manage all companies
router.get(
  '/',
  requireRole('super_admin'),
  companyValidator.getAllCompaniesValidation,
  validateRequest,
  companyController.getAllCompanies
);

router.get('/:id/modules', requireRole('super_admin'), companyController.getCompanyModules);
router.put('/:id/modules', requireRole('super_admin'), companyController.updateCompanyModules);

router.get('/analytics', requireRole('super_admin'), companyController.getCompanyAnalytics);

// Super admin OR company admin can view their own company details
router.get(
  '/:id',
  companyValidator.getCompanyValidation,
  validateRequest,
  companyController.getCompanyById
);

router.post(
  '/',
  upload.single('logo'),
  companyValidator.createCompanyValidation,
  validateRequest,
  companyController.createCompany
);

router.put(
  '/:id',
  upload.single('logo'),
  companyValidator.updateCompanyValidation,
  validateRequest,
  companyController.updateCompany
);

router.delete(
  '/:id',
  companyValidator.deleteCompanyValidation,
  validateRequest,
  companyController.deleteCompany
);

router.delete(
  '/:id/hard-delete',
  companyValidator.deleteCompanyValidation,
  validateRequest,
  companyController.hardDelete
);

router.patch(
  '/:id/toggle-status',
  companyValidator.getCompanyValidation,
  validateRequest,
  companyController.toggleStatus
);

export default router;
