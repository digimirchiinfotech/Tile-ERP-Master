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

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import debugLogger from '../utils/debugLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generatePdfFromHtml = async (htmlContent, options = {}) => {
  return new Promise((resolve, reject) => {
    debugLogger.info('[PDFService]', 'Delegating PDF generation to worker thread');
    const workerPath = path.resolve(__dirname, '../workers/pdfWorker.js');
    
    const worker = new Worker(workerPath, {
      workerData: {
        htmlContent,
        options: {
          format: options.format || 'A4',
          margin: options.margin
        }
      }
    });

    worker.on('message', (message) => {
      if (message.success) {
        debugLogger.info('[PDFService]', `PDF generated successfully via worker thread, size: ${message.buffer.length} bytes`);
        resolve(Buffer.from(message.buffer));
      } else {
        debugLogger.error('[PDFService]', 'PDF Worker error:', message.error);
        reject(new Error(message.error || 'Worker failed to generate PDF'));
      }
    });

    worker.on('error', (err) => {
      debugLogger.error('[PDFService]', 'PDF Worker thread error:', err);
      reject(err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        debugLogger.error('[PDFService]', `PDF Worker thread stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
};

export const closeBrowser = async () => {
  // No-op
};
