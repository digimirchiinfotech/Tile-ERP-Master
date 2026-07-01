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
import { generatePdf, getPdfStatus, downloadPdfTask } from '../controllers/pdfController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', authenticate, generatePdf);
router.get('/status/:taskId', authenticate, getPdfStatus);
router.get('/download/:taskId', authenticate, downloadPdfTask);

export default router;

