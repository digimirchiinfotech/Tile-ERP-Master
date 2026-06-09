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

import puppeteer from 'puppeteer';
import debugLogger from '../utils/debugLogger.js';

export const generatePdfFromHtml = async (htmlContent, options = {}) => {
  let browser = null;
  let page = null;

  try {
    debugLogger.info('[PDFService]', 'Launching Puppeteer browser');

    browser = await puppeteer.launch({
      headless: true,
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
      waitUntil: ['load', 'networkidle0'],
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
      }
    });

    debugLogger.info('[PDFService]', `PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    return Buffer.from(pdfBuffer);

  } catch (error) {
    debugLogger.error('[PDFService]', 'Error generating PDF:', error.message);
    throw error;
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }
};

export const closeBrowser = async () => {
  // No-op: browser is now created and closed per-request
};
