const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large HTML template sizes

const PORT = process.env.PORT || 8001;

let globalBrowser = null;

async function getBrowser() {
  if (!globalBrowser) {
    console.log('[PDFService] Initializing global Puppeteer browser...');
    globalBrowser = await puppeteer.launch({
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
  }
  return globalBrowser;
}

// Pre-warm browser
getBrowser().catch(err => console.error('[PDFService] Failed to pre-warm browser:', err));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'pdf-service' });
});

app.post('/generate', async (req, res) => {
  let browser = null;
  let page = null;
  
  try {
    const { html, options = {} } = req.body;
    
    if (!html) {
      return res.status(400).json({ success: false, error: 'HTML content is required' });
    }
    
    console.log('[PDFService] Generating PDF using global browser instance...');
    
    browser = await getBrowser();
    page = await browser.newPage();
    
    await page.setContent(html, {
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
    
    console.log(`[PDFService] Generated PDF successfully, size: ${pdfBuffer.length} bytes`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(Buffer.from(pdfBuffer));
    
  } catch (error) {
    console.error('[PDFService] Error during PDF generation:', error.message);
    return res.status(500).json({ success: false, error: 'PDF generation failed: ' + error.message });
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    // DO NOT close the global browser here
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PDFService] Standalone PDF microservice running on port ${PORT}`);
});
