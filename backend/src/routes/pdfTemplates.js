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
  getTemplate, 
  saveTemplate, 
  resetTemplate,
  exportTemplate,
  importTemplate 
} from '../controllers/pdfTemplateController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and company filtering
router.use(authenticate, filterByCompany);

// Get template for a document type
router.get('/:templateType', getTemplate);

// Save/update template for a document type
router.post('/:templateType', saveTemplate);

// Reset template to default
router.delete('/:templateType', resetTemplate);

// Export template as JSON file
router.get('/:templateType/export', exportTemplate);

// Import template from JSON
router.post('/:templateType/import', importTemplate);

export default router;
