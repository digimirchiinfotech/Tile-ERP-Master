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
import { authenticate, optionalAuth, filterByCompany } from '../middleware/auth.js';
import { createUpload } from '../middleware/multerConfig.js';
import { validateFileMagicBytes } from '../middleware/fileValidator.js';
import { requirePermission, requireRole, PERMISSIONS } from '../middleware/rbac.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getAllMasterData,
  getMasterDataByType,
  createMasterData,
  updateMasterData,
  deleteMasterData,
  hardDelete,
  toggleStatus,
  getAllCountries,
  getCitiesByCountry,
  getAllCities,
  searchCities,
  getAllPorts,
  getPortsByCountry,
  getMasterDataById
} from '../controllers/masterDataController.js';
import { validateCreateMasterData, validateUpdateMasterData } from '../validators/masterDataValidator.js';

const router = express.Router();

const GLOBAL_MASTER_DATA_TYPES = new Set(['countries', 'cities', 'ports']);

const requireSuperAdminForGlobalMasterData = (req, res, next) => {
  // Relaxed global master data administration requirement 
  // to allow Company Admins to add/edit their own Ports, Cities, etc.
  next();
};

// Create wrapper for public master data endpoints
const getPublicMasterData = (type) => async (req, res, next) => {
  req.params.type = type;
  req.user = req.user || {}; // Ensure user object exists
  return getMasterDataByType(req, res, next);
};

// Public routes with optional auth - extracts user if token present for tenant-scoped data
router.get('/countries', optionalAuth, filterByCompany, getAllCountries);
router.get('/cities', optionalAuth, filterByCompany, getAllCities);
router.get('/cities/search', optionalAuth, filterByCompany, searchCities);
router.get('/cities/country/:countryCode', optionalAuth, filterByCompany, getCitiesByCountry);
router.get('/ports', optionalAuth, filterByCompany, getAllPorts);
router.get('/ports/country/:countryCode', optionalAuth, filterByCompany, getPortsByCountry);
router.get('/sizes', optionalAuth, filterByCompany, getPublicMasterData('sizes'));
router.get('/surfaces', optionalAuth, filterByCompany, getPublicMasterData('surfaces'));
router.get('/applications', optionalAuth, filterByCompany, getPublicMasterData('applications'));
router.get('/thickness', optionalAuth, filterByCompany, getPublicMasterData('thickness'));
router.get('/thicknesses', optionalAuth, filterByCompany, getPublicMasterData('thickness'));
router.get('/factoryNames', optionalAuth, filterByCompany, getPublicMasterData('factoryNames'));
router.get('/shippingLines', optionalAuth, filterByCompany, getPublicMasterData('shippingLines'));
router.get('/currencies', optionalAuth, filterByCompany, getPublicMasterData('currencies'));
router.get('/palletCategories', optionalAuth, filterByCompany, getPublicMasterData('palletCategories'));
router.get('/warehouseLocations', optionalAuth, filterByCompany, getPublicMasterData('warehouseLocations'));
router.get('/finalDestinations', optionalAuth, filterByCompany, getPublicMasterData('finalDestinations'));
router.get('/portsOfLoading', optionalAuth, filterByCompany, getPublicMasterData('portsOfLoading'));
router.get('/portsOfDischarge', optionalAuth, filterByCompany, getPublicMasterData('portsOfDischarge'));
router.get('/catalogueNames', optionalAuth, filterByCompany, getPublicMasterData('catalogueNames'));
router.get('/palletTypes', optionalAuth, filterByCompany, getPublicMasterData('palletTypes'));
router.get('/tilesBack', optionalAuth, filterByCompany, getPublicMasterData('tilesBack'));
router.get('/boxesMarking', optionalAuth, filterByCompany, getPublicMasterData('boxesMarking'));
router.get('/boxTypes', optionalAuth, filterByCompany, getPublicMasterData('boxTypes'));
router.get('/deliveryTerms', optionalAuth, filterByCompany, getPublicMasterData('deliveryTerms'));
router.get('/paymentTerms', optionalAuth, filterByCompany, getPublicMasterData('paymentTerms'));
router.get('/tariffCodes', optionalAuth, filterByCompany, getPublicMasterData('tariffCodes'));
router.get('/authorizedSignatories', optionalAuth, filterByCompany, getPublicMasterData('authorizedSignatories'));
router.get('/contactDetails', optionalAuth, filterByCompany, getPublicMasterData('contactDetails'));
router.get('/maxPermissibleWeights', optionalAuth, filterByCompany, getPublicMasterData('maxPermissibleWeights'));

// Sanitaryware Master Data Routes
router.get('/sanitarywareCategories', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareCategories'));
router.get('/sanitarywareBrands', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareBrands'));
router.get('/sanitarywareCollections', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareCollections'));
router.get('/sanitarywareMaterialTypes', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareMaterialTypes'));
router.get('/sanitarywareColors', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareColors'));
router.get('/sanitarywareShapes', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareShapes'));
router.get('/sanitarywareFlushTypes', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareFlushTypes'));
router.get('/sanitarywareTrapTypes', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareTrapTypes'));
router.get('/sanitarywareMountTypes', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareMountTypes'));
router.get('/sanitarywareSeatCoverTypes', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareSeatCoverTypes'));
router.get('/sanitarywarePackagingTypes', optionalAuth, filterByCompany, getPublicMasterData('sanitarywarePackagingTypes'));
router.get('/sanitarywareFinishTypes', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareFinishTypes'));
router.get('/sanitarywareDimensionStandards', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareDimensionStandards'));
router.get('/sanitarywareContainerCapacityRules', optionalAuth, filterByCompany, getPublicMasterData('sanitarywareContainerCapacityRules'));

router.get('/:type/:id', optionalAuth, filterByCompany, getMasterDataById);
router.get('/', optionalAuth, filterByCompany, getAllMasterData); // Master data with optional tenant scoping

// Protected routes - Authentication required for admin operations
router.use(authenticate);

// Image upload for master data (like Box Types)
router.post('/upload-image', filterByCompany, requirePermission(PERMISSIONS.MASTER_DATA_MANAGEMENT), createUpload('PRODUCT_IMAGE').single('image'), validateFileMagicBytes('PRODUCT_IMAGE'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided' });
  }
  
  // Use location (S3 URL) if available, otherwise construct local URL
  const imageUrl = req.file.location || `/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl });
});

router.get('/:type', filterByCompany, getMasterDataByType);
router.post('/:type', filterByCompany, requireSuperAdminForGlobalMasterData, requirePermission(PERMISSIONS.MASTER_DATA_MANAGEMENT), validateCreateMasterData, createMasterData);
router.put('/:type/:id', filterByCompany, requireSuperAdminForGlobalMasterData, requirePermission(PERMISSIONS.MASTER_DATA_MANAGEMENT), validateUpdateMasterData, updateMasterData);
router.delete('/:type/:id', filterByCompany, requireSuperAdminForGlobalMasterData, requirePermission(PERMISSIONS.MASTER_DATA_MANAGEMENT), deleteMasterData);
router.delete('/:type/:id/hard-delete', filterByCompany, requireSuperAdminForGlobalMasterData, requirePermission(PERMISSIONS.MASTER_DATA_MANAGEMENT), hardDelete);
router.patch('/:type/:id/toggle-status', filterByCompany, requireSuperAdminForGlobalMasterData, requirePermission(PERMISSIONS.MASTER_DATA_MANAGEMENT), toggleStatus);

export default router;
