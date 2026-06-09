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
 * Export Document Reference Routes
 * Provides endpoints for managing strict sequential document flow
 */

import express from 'express';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import * as referenceController from '../controllers/exportDocumentReferenceController.js';

const router = express.Router();

router.use(authenticate);
router.use(filterByCompany);

router.get('/references/export-invoices', referenceController.getExportInvoiceReferences);
router.get('/references/packing-lists', referenceController.getPackingListReferences);
router.get('/references/annexures', referenceController.getAnnexureReferences);
router.get('/references/backsides', referenceController.getBacksideReferences);
router.get('/references/vgm', referenceController.getVGMReferences);

router.get('/inherit/packing-list/:exportInvoiceId', referenceController.getPackingListInheritedData);
router.get('/inherit/annexure/:packingListId', referenceController.getAnnexureInheritedData);
router.get('/inherit/backside/:annexureId', referenceController.getBacksideInheritedData);
router.get('/inherit/vgm/:backsideId', referenceController.getVGMInheritedData);
router.get('/inherit/shipping/:vgmId', referenceController.getShippingInheritedData);
router.get('/inherit/bl/:exportInvoiceId', referenceController.getBLInheritedData);

router.get('/workflow-chain/:exportInvoiceId', referenceController.getWorkflowChain);

router.post('/validate-reference', referenceController.validateReference);

export default router;
