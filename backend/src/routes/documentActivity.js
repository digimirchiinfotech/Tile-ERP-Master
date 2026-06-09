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
import { getDocumentTimeline, recordDocumentAction } from '../controllers/documentActivityController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';

const router = express.Router();

router.get('/:type/:id/timeline', authenticate, filterByCompany, getDocumentTimeline);
router.post('/:type/:id/action', authenticate, filterByCompany, recordDocumentAction);

export default router;
