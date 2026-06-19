import request from 'supertest';
import app from '../server.js';
import { loginAsCompanyAdmin, authHeaders, extractList } from './helpers.js';
import pool from '../config/database.js';
import router from '../config/companyDatabaseRouter.js';
import { recordPaymentAgainstInvoice } from '../services/accountLedgerIntegrationService.js';
import { generatePdfFromHtml } from '../services/pdfService.js';
import http from 'http';

afterAll(async () => {
  for (const companyId of router.companyDatabaseCache.keys()) {
    await router.closeCompanyDatabase(companyId);
  }
  if (router.masterPool) {
    await router.masterPool.end();
  }
  if (pool) {
    await pool.end();
  }
});

describe('Phase 3 Financial Ledger & Standalone PDF Service', () => {
  let token;
  let companyId;
  let testProductId;

  beforeAll(async () => {
    const data = await loginAsCompanyAdmin(request(app));
    token = data.accessToken;
    companyId = data.user.companyId;

    // Fetch a test product ID
    const productsRes = await request(app)
      .get('/api/products?limit=1')
      .set(authHeaders(token));
    const products = extractList(productsRes.body);
    if (products.length > 0) {
      testProductId = products[0].id;
    }
  });

  it('posts balanced double-entry ledger entries upon finalizing invoice and recording payment', async () => {
    if (!testProductId) {
      console.warn('Skipping test — no product found');
      return;
    }

    const payload = {
      invoice_date: new Date().toISOString().split('T')[0],
      client_name: 'Phase 3 Test Client',
      product_lines: [
        {
          product_id: testProductId,
          product_name: 'Phase 3 Test Product',
          size: '600x1200',
          surface: 'Glossy',
          thickness: '9mm',
          total_boxes: 100,
          sqm_auto: 72.0,
          rate: 10.0,
          amount: 720.0,
          sku: 'P3-TEST-SKU',
          hsn_code: '69072100',
          net_weight: 1500,
          gross_weight: 1550
        }
      ],
      pallets: 2,
      total_sqm: 72.0,
      total_amount: 720.0,
      status: 'Finalized' // This should trigger automated ledger sync!
    };

    const res = await request(app)
      .post('/api/export-invoices')
      .set(authHeaders(token))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const invoiceId = res.body.data.id;
    expect(invoiceId).toBeDefined();

    const companyPool = await router.getCompanyDatabase(companyId);

    // Wait a brief moment for the async task queue to complete background posting
    await new Promise(resolve => setTimeout(resolve, 500));

    // 1. Verify journal entry exists for invoice finalization
    const journalRes = await companyPool.query(
      "SELECT * FROM journal_entries WHERE source_type = 'ExportInvoice' AND source_id = $1",
      [invoiceId]
    );

    expect(journalRes.rows.length).toBe(1);
    const journalEntryId = journalRes.rows[0].id;

    // 2. Verify ledger entries are balanced
    const ledgerRes = await companyPool.query(
      "SELECT * FROM ledger_entries WHERE journal_entry_id = $1 ORDER BY account_code",
      [journalEntryId]
    );

    expect(ledgerRes.rows.length).toBe(2);
    
    const debitAR = ledgerRes.rows.find(r => r.account_code === 'AR');
    const creditSales = ledgerRes.rows.find(r => r.account_code === 'SALES');

    expect(debitAR).toBeDefined();
    expect(parseFloat(debitAR.debit)).toBe(720.0);
    expect(parseFloat(debitAR.credit)).toBe(0.0);

    expect(creditSales).toBeDefined();
    expect(parseFloat(creditSales.debit)).toBe(0.0);
    expect(parseFloat(creditSales.credit)).toBe(720.0);

    // 3. Record a payment using recordPaymentAgainstInvoice directly
    const mockReqDb = {
      getClient: async () => companyPool.connect()
    };
    await recordPaymentAgainstInvoice(invoiceId, { method: 'bank', ref: 'P3-TXN-123' }, mockReqDb);

    // 4. Verify payment journal entry was created
    const payJournalRes = await companyPool.query(
      "SELECT * FROM journal_entries WHERE source_type = 'Payment' AND source_id = $1",
      [invoiceId]
    );
    expect(payJournalRes.rows.length).toBe(1);
    const payJournalId = payJournalRes.rows[0].id;

    // 5. Verify payment ledger entries (Debit BANK, Credit AR)
    const payLedgerRes = await companyPool.query(
      "SELECT * FROM ledger_entries WHERE journal_entry_id = $1 ORDER BY account_code",
      [payJournalId]
    );
    expect(payLedgerRes.rows.length).toBe(2);

    const debitBank = payLedgerRes.rows.find(r => r.account_code === 'BANK');
    const creditAR = payLedgerRes.rows.find(r => r.account_code === 'AR');

    expect(debitBank).toBeDefined();
    expect(parseFloat(debitBank.debit)).toBe(720.0);
    expect(parseFloat(debitBank.credit)).toBe(0.0);

    expect(creditAR).toBeDefined();
    expect(parseFloat(creditAR.debit)).toBe(0.0);
    expect(parseFloat(creditAR.credit)).toBe(720.0);

    // Cleanup
    await companyPool.query('DELETE FROM export_invoices WHERE id = $1', [invoiceId]);
  });

  it('delegates PDF generation to the standalone microservice over HTTP', async () => {
    // Spin up a mock HTTP server on port 8001 to return a mock PDF buffer
    const mockPdfBuffer = Buffer.from('MOCK_PDF_DATA');
    let requestReceived = false;

    const mockServer = http.createServer((req, res) => {
      if (req.url === '/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          requestReceived = true;
          const parsed = JSON.parse(body);
          expect(parsed.html).toBe('<h1>Hello World</h1>');
          expect(parsed.options.format).toBe('A4');
          
          res.writeHead(200, { 'Content-Type': 'application/pdf' });
          res.end(mockPdfBuffer);
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise(resolve => mockServer.listen(8001, '127.0.0.1', resolve));

    try {
      const generatedBuffer = await generatePdfFromHtml('<h1>Hello World</h1>', { format: 'A4' });
      expect(requestReceived).toBe(true);
      expect(generatedBuffer.toString()).toBe('MOCK_PDF_DATA');
    } finally {
      await new Promise(resolve => mockServer.close(resolve));
    }
  });
});
