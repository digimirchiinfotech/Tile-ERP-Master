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

import axios from 'axios';
import debugLogger from '../utils/debugLogger.js';

export const generatePdfFromHtml = async (htmlContent, options = {}) => {
  try {
    debugLogger.info('[PDFService]', 'Calling standalone PDF service to generate PDF');

    const pdfServiceUrl = process.env.PDF_SERVICE_URL || 'http://localhost:8001/generate';

    const response = await axios.post(pdfServiceUrl, {
      html: htmlContent,
      options: {
        format: options.format || 'A4',
        margin: options.margin
      }
    }, {
      responseType: 'arraybuffer',
      timeout: 35000 // slightly higher than Puppeteer page timeout
    });

    debugLogger.info('[PDFService]', `PDF generated successfully via HTTP, size: ${response.data.byteLength} bytes`);
    return Buffer.from(response.data);

  } catch (error) {
    debugLogger.error('[PDFService]', 'Error generating PDF via standalone service:', error.message);
    throw error;
  }
};

export const closeBrowser = async () => {
  // No-op
};
