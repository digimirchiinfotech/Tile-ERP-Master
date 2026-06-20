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

import { parentPort, workerData } from 'worker_threads';
import puppeteer from 'puppeteer';

(async () => {
  let browser = null;
  let page = null;
  try {
    const { htmlContent, options } = workerData;

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();
    
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
      timeout: 30000
    });

    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: true,
      margin: options.margin || {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      ...options
    });

    // Send the buffer back to the parent thread
    parentPort.postMessage({ success: true, buffer: pdfBuffer });

  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
})();
