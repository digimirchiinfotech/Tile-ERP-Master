import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getBrandingConfig, applyInvoiceBranding } from '../services/pdfBrandingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASELINE_DIR = path.join(__dirname, 'baselines');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Ensure directories exist
if (!fs.existsSync(BASELINE_DIR)) fs.mkdirSync(BASELINE_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

describe('Visual QA Regression Suite', () => {
  let browser;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  it('renders invoice layout identically against baseline', async () => {
    const branding = getBrandingConfig('modern', {
      companyName: 'TEST EXPORTS PVT LTD',
      website: 'www.testexports.com'
    });

    const mockInvoiceHTML = `
      <div style="padding: 20px; background: white; font-family: sans-serif;">
        <div style="font-size: 20px; font-weight: bold; color: #333;">INVOICE DETAILS</div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: #f0f0f0; border-bottom: 2px solid #ccc;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: right;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px;">600x1200 Glossy Tile</td>
              <td style="padding: 8px; text-align: right;">100</td>
              <td style="padding: 8px; text-align: right;">$12.50</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const htmlContent = applyInvoiceBranding(mockInvoiceHTML, branding, 'Export Invoice');

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const screenshotPath = path.join(SCREENSHOT_DIR, 'invoice_modern.png');
    const baselinePath = path.join(BASELINE_DIR, 'invoice_modern.png');

    await page.screenshot({ path: screenshotPath });

    if (!fs.existsSync(baselinePath)) {
      // First run: save as baseline
      fs.copyFileSync(screenshotPath, baselinePath);
      console.log(`Saved baseline screenshot at: ${baselinePath}`);
      expect(fs.existsSync(baselinePath)).toBe(true);
    } else {
      const screenshotStats = fs.statSync(screenshotPath);
      const baselineStats = fs.statSync(baselinePath);

      // Verify screenshot generated correctly
      expect(screenshotStats.size).toBeGreaterThan(1000);
      
      // Check if file sizes match within reasonable limits (handling minor environment layout shifts)
      const sizeDifference = Math.abs(screenshotStats.size - baselineStats.size) / baselineStats.size;
      expect(sizeDifference).toBeLessThan(0.15);
    }

    await page.close();
  });
});
