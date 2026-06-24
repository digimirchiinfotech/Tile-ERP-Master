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

import debugLogger from '../utils/debugLogger.js';
import axios from 'axios';

export const generatePdfFromHtml = async (htmlContent, options = {}) => {
  return new Promise(async (resolve, reject) => {
    debugLogger.info('[PDFService]', 'Delegating PDF generation to standalone microservice');
    
    const pdfServiceUrl = process.env.PDF_SERVICE_URL || 'http://127.0.0.1:8001/generate';

    try {
      const response = await axios.post(pdfServiceUrl, {
        html: htmlContent,
        options: {
          format: options.format || 'A4',
          margin: options.margin
        }
      }, {
        responseType: 'arraybuffer', // Expect binary PDF data
        timeout: 60000 // 60 seconds
      });

      debugLogger.info('[PDFService]', `PDF generated successfully via microservice, size: ${response.data.byteLength} bytes`);
      resolve(Buffer.from(response.data));
    } catch (error) {
      debugLogger.error('[PDFService]', 'PDF microservice error:', error.message);
      
      // Fallback: If microservice is unreachable, you could optionally fallback to the local worker here.
      // But for enterprise stability, we strictly enforce microservice isolation.
      reject(new Error(`Microservice failed to generate PDF: ${error.message}`));
    }
  });
};

export const closeBrowser = async () => {
  // No-op
};
