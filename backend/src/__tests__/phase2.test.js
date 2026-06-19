import request from 'supertest';
import app from '../server.js';
import { loginAsCompanyAdmin, authHeaders, extractList } from './helpers.js';
import pool from '../config/database.js';
import router from '../config/companyDatabaseRouter.js';

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

describe('Phase 2 Relational Transition & Transaction Protection', () => {
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

  it('creates an export invoice and writes matching rows to export_invoice_items', async () => {
    if (!testProductId) {
      console.warn('Skipping test — no product found');
      return;
    }

    const payload = {
      invoice_date: new Date().toISOString().split('T')[0],
      client_name: 'Phase 2 Test Client',
      product_lines: [
        {
          product_id: testProductId,
          product_name: 'Phase 2 Test Product',
          size: '600x1200',
          surface: 'Glossy',
          thickness: '9mm',
          total_boxes: 100,
          sqm_auto: 72.0,
          rate: 12.5,
          amount: 900.0,
          sku: 'P2-TEST-SKU',
          hsn_code: '69072100',
          net_weight: 1500,
          gross_weight: 1550
        }
      ],
      pallets: 2,
      total_sqm: 72.0,
      total_amount: 900.0,
      status: 'Draft'
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

    // Query DB directly to check export_invoice_items
    const dbRes = await companyPool.query(
      'SELECT * FROM export_invoice_items WHERE export_invoice_id = $1',
      [invoiceId]
    );

    expect(dbRes.rows.length).toBe(1);
    const item = dbRes.rows[0];
    expect(item.product_id).toBe(testProductId);
    expect(parseFloat(item.quantity)).toBe(72.0);
    expect(parseFloat(item.unit_price)).toBe(12.5);
    expect(parseFloat(item.total_amount)).toBe(900.0);
    expect(item.sku).toBe('P2-TEST-SKU');
    expect(item.hsn_code).toBe('69072100');

    // Test Document Lock transaction Row Lock (FOR UPDATE)
    const lockRes = await request(app)
      .post('/api/locks/lock')
      .set(authHeaders(token))
      .send({
        documentType: 'EXPORT_INVOICE',
        documentId: invoiceId,
        snapshotData: { test: true }
      });

    expect(lockRes.status).toBe(200);

    // Verify invoice is locked
    const invoiceCheck = await companyPool.query(
      'SELECT is_locked FROM export_invoices WHERE id = $1',
      [invoiceId]
    );
    expect(invoiceCheck.rows[0].is_locked).toBe(true);

    // Unlock document
    const unlockRes = await request(app)
      .post('/api/locks/unlock')
      .set(authHeaders(token))
      .send({
        documentType: 'EXPORT_INVOICE',
        documentId: invoiceId,
        unlockReason: 'Cleanup'
      });

    expect(unlockRes.status).toBe(200);

    // Test Conversion to Packing List and container_allocations/packing_items insertion
    const plPayload = {
      packing_list_date: new Date().toISOString().split('T')[0],
      client_name: 'Phase 2 Test Client',
      container_details: [
        {
          container_no: 'P2CON1234567',
          line_seal_no: 'P2SEAL001',
          container_type: '20FT',
          tare_weight: 2200,
          max_payload: 28000,
          gross_weight: 25000,
          net_weight: 22800,
          boxes: 100,
          pallets: 2,
          product_id: testProductId
        }
      ],
      product_lines: [
        {
          product_id: testProductId,
          product: 'Phase 2 Test Product',
          size: '600x1200',
          surface: 'Glossy',
          thickness: '9mm',
          totalBoxes: '100'
        }
      ],
      status: 'Draft'
    };

    const plRes = await request(app)
      .post(`/api/packing-lists/export-invoice/${invoiceId}`)
      .set(authHeaders(token))
      .send(plPayload);

    expect(plRes.status).toBe(200);

    // Query DB directly to check container_allocations & packing_items
    const containerAllocations = await companyPool.query(
      'SELECT * FROM container_allocations WHERE export_invoice_id = $1',
      [invoiceId]
    );
    expect(containerAllocations.rows.length).toBe(1);
    expect(containerAllocations.rows[0].container_number).toBe('P2CON1234567');
    expect(containerAllocations.rows[0].seal_number).toBe('P2SEAL001');

    const packingItems = await companyPool.query(
      'SELECT * FROM packing_items WHERE container_allocation_id = $1',
      [containerAllocations.rows[0].id]
    );
    expect(packingItems.rows.length).toBe(1);
    expect(packingItems.rows[0].boxes_packed).toBe(100);
    expect(packingItems.rows[0].pallets_used).toBe(2);

    // Cleanup: delete the created export invoice
    await companyPool.query('DELETE FROM export_invoices WHERE id = $1', [invoiceId]);
  });
});
