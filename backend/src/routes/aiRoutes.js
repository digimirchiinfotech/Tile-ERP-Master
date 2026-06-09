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
import { getDocumentInsights, chatWithAssistant } from '../controllers/aiController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';

const router = express.Router();

router.post('/insights', authenticate, filterByCompany, getDocumentInsights);
router.post('/chat', authenticate, filterByCompany, chatWithAssistant);

export default router;
