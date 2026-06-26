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

const MAX_CONCURRENT_WORKERS = 3;
let activeWorkers = 0;
const workerQueue = [];

const processPdfQueue = () => {
  if (activeWorkers >= MAX_CONCURRENT_WORKERS || workerQueue.length === 0) {
    return;
  }

  activeWorkers++;
  const { htmlContent, options, resolve, reject } = workerQueue.shift();

  debugLogger.info('[PDFService]', `Delegating PDF generation to worker thread. Active workers: ${activeWorkers}`);
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

  const finalizeWorker = () => {
    activeWorkers--;
    processPdfQueue();
  };

  worker.on('message', (message) => {
    if (message.success) {
      debugLogger.info('[PDFService]', `PDF generated successfully via worker thread, size: ${message.buffer.length} bytes`);
      resolve(Buffer.from(message.buffer));
    } else {
      debugLogger.error('[PDFService]', 'PDF Worker error:', message.error);
      reject(new Error(message.error || 'Worker failed to generate PDF'));
    }
    finalizeWorker();
  });

  worker.on('error', (err) => {
    debugLogger.error('[PDFService]', 'PDF Worker thread error:', err);
    reject(err);
    finalizeWorker();
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      debugLogger.error('[PDFService]', `PDF Worker thread stopped with exit code ${code}`);
      // Only reject if we haven't already resolved/rejected
      // It's safer to let the error handler reject, but this catches abnormal exits
      reject(new Error(`Worker stopped with exit code ${code}`));
    }
    // finalizeWorker is called here if it exited without sending a message or error
    // but we need to ensure it's not called twice.
    // Actually, it's safer to just let the message/error handlers do it, 
    // but if it crashes immediately, exit is called.
    // To prevent double-decrement, we can use a boolean flag.
  });
  
  // A cleaner way to prevent double decrement:
  let finalized = false;
  const safeFinalize = () => {
    if (!finalized) {
      finalized = true;
      activeWorkers--;
      processPdfQueue();
    }
  };
  
  // Patch the event handlers to use safeFinalize
  worker.removeAllListeners('message');
  worker.removeAllListeners('error');
  worker.removeAllListeners('exit');

  worker.on('message', (message) => {
    if (message.success) {
      resolve(Buffer.from(message.buffer));
    } else {
      reject(new Error(message.error || 'Worker failed to generate PDF'));
    }
    safeFinalize();
  });

  worker.on('error', (err) => {
    reject(err);
    safeFinalize();
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      reject(new Error(`Worker stopped with exit code ${code}`));
    }
    safeFinalize();
  });
};

export const generatePdfFromHtml = async (htmlContent, options = {}) => {
  return new Promise((resolve, reject) => {
    workerQueue.push({ htmlContent, options, resolve, reject });
    processPdfQueue();
  });
};

export const closeBrowser = async () => {
  // No-op
};
