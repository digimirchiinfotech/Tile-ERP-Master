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

import { generatePdfFromHtml } from '../services/pdfService.js';
import { AppError } from '../middleware/errorHandler.js';
import { debugLogger } from '../utils/debugLogger.js';

export const generatePdf = async (req, res, next) => {
  try {
    const { html, filename = 'document.pdf', format = 'A4' } = req.body;

    if (!html) {
      return next(new AppError('HTML content is required', 400));
    }

    debugLogger.info('[PDFController]', `Generating PDF: ${filename}`);

    const pdfBuffer = await generatePdfFromHtml(html, { format });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.end(pdfBuffer);
  } catch (error) {
    debugLogger.error('[PDFController]', 'Error in generatePdf endpoint:', error);
    next(new AppError('Failed to generate PDF', 500));
  }
};
