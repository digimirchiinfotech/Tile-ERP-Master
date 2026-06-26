import request from 'supertest';
import app from '../../src/server.js';
import { loginAsCompanyAdmin, authHeaders, extractList } from '../../src/__tests__/helpers.js';
import pool from '../../src/config/database.js';
import router from '../../src/config/companyDatabaseRouter.js';

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

describe('Export Document Locking Chain (Integration)', () => {
  let token;
  let companyId;
  let testProductId;
  let clientId;
  
  // Document IDs
  let piId;
  let eiId;
  let plId;
  let anxId;
  let ibId;
  let vgmId;
  let siId;

  beforeAll(async () => {
    // 1. Setup - login and fetch baseline data
    const data = await loginAsCompanyAdmin(request(app));
    token = data.accessToken;
    companyId = data.user.companyId;

    const productsRes = await request(app)
      .get('/api/products?limit=1')
      .set(authHeaders(token));
    const products = extractList(productsRes.body);
    if (products.length > 0) testProductId = products[0].id;

    const clientsRes = await request(app)
      .get('/api/clients?limit=1')
      .set(authHeaders(token));
    const clients = extractList(clientsRes.body);
    if (clients.length > 0) clientId = clients[0].id;
  });

  it('1. Creates a Proforma Invoice (PI)', async () => {
    if (!testProductId || !clientId) {
      console.warn('Skipping test - no product or client found');
      return;
    }

    const piPayload = {
      client_id: clientId,
      date: new Date().toISOString().split('T')[0],
      total_amount: 1500,
      status: 'Draft',
      product_lines: [
        {
          product_id: testProductId,
          product_name: 'Test Lock Product',
          total_boxes: 50,
          rate: 30,
          amount: 1500,
          sqm_auto: 50
        }
      ]
    };

    const res = await request(app)
      .post('/api/proforma-invoices')
      .set(authHeaders(token))
      .send(piPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    piId = res.body.data.id;
    expect(piId).toBeDefined();
  });

  it('2. Creates Export Invoice (EI) from PI', async () => {
    if (!piId) return;

    // We can simulate conversion by passing proforma_invoice_id to the EI creation
    const eiPayload = {
      proforma_invoice_id: piId,
      invoice_date: new Date().toISOString().split('T')[0],
      client_id: clientId,
      status: 'Draft',
      total_amount: 1500,
      product_lines: [
        {
          product_id: testProductId,
          product_name: 'Test Lock Product',
          total_boxes: 50,
          rate: 30,
          amount: 1500,
          sqm_auto: 50
        }
      ]
    };

    const res = await request(app)
      .post('/api/export-invoices')
      .set(authHeaders(token))
      .send(eiPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    eiId = res.body.data.id;
    expect(eiId).toBeDefined();
  });

  it('3. Generates all dependent documents (PL, ANX, IB, VGM, SI)', async () => {
    if (!eiId) return;

    const commonPayload = { test_field: 'Generated for Locking Test' };

    // Packing List
    const plRes = await request(app)
      .post(`/api/packing-lists/export-invoice/${eiId}`)
      .set(authHeaders(token))
      .send(commonPayload);
    expect(plRes.status).toBe(200).or.toBe(201);
    plId = plRes.body?.data?.id || plRes.body?.data?.packing_list_id;
    
    // Annexure
    const anxRes = await request(app)
      .post(`/api/export-invoice-annexures/export-invoice/${eiId}`)
      .set(authHeaders(token))
      .send(commonPayload);
    expect(anxRes.status).toBe(200).or.toBe(201);
    anxId = anxRes.body?.data?.id || anxRes.body?.data?.annexure_id;

    // Invoice Backside
    const ibRes = await request(app)
      .post(`/api/invoice-backsides/export-invoice/${eiId}`)
      .set(authHeaders(token))
      .send({ invoice_date: new Date().toISOString().split('T')[0] });
    expect(ibRes.status).toBe(200).or.toBe(201);
    ibId = ibRes.body?.data?.id || ibRes.body?.data?.invoice_backside_id;

    // VGM
    const vgmRes = await request(app)
      .post(`/api/vgm/by-export-invoice/${eiId}`)
      .set(authHeaders(token))
      .send(commonPayload);
    expect(vgmRes.status).toBe(200).or.toBe(201);
    vgmId = vgmRes.body?.data?.id || vgmRes.body?.data?.vgm_id;

    // Shipping Instruction
    const siRes = await request(app)
      .post(`/api/shipping-instructions/by-export-invoice/${eiId}`)
      .set(authHeaders(token))
      .send(commonPayload);
    expect(siRes.status).toBe(200).or.toBe(201);
    siId = siRes.body?.data?.id || siRes.body?.data?.instruction_id;
  });

  it('4. Locks the EI and verifies lock cascades to all children', async () => {
    if (!eiId) return;

    const lockRes = await request(app)
      .post('/api/lock/lock-document')
      .set(authHeaders(token))
      .send({
        documentType: 'EXPORT_INVOICE',
        documentId: eiId
      });

    expect(lockRes.status).toBe(200);
    expect(lockRes.body.success).toBe(true);

    // Verify locking at database level
    const companyPool = await router.getCompanyDatabase(companyId);
    
    const verifyLock = async (table, idField, idValue) => {
      const result = await companyPool.query(`SELECT is_locked FROM ${table} WHERE ${idField} = $1`, [idValue]);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].is_locked).toBe(true);
    };

    await verifyLock('export_invoices', 'id', eiId);
    if(plId) await verifyLock('packing_lists', 'export_invoice_id', eiId);
    if(anxId) await verifyLock('export_invoice_annexures', 'export_invoice_id', eiId);
    if(ibId) await verifyLock('invoice_backside', 'export_invoice_id', eiId);
    if(vgmId) await verifyLock('vgm_documents', 'export_invoice_id', eiId);
    if(siId) await verifyLock('shipping_instructions', 'export_invoice_id', eiId);
  });

  it('5. Prevents modification of locked documents', async () => {
    if (!eiId) return;

    // Try modifying the Packing List
    const modRes = await request(app)
      .post(`/api/packing-lists/export-invoice/${eiId}`)
      .set(authHeaders(token))
      .send({ test_field: 'Hacking the locked document' });

    // Should be rejected by lockManager middleware
    expect(modRes.status).toBeGreaterThanOrEqual(400);
    expect(modRes.body.success).toBe(false);
    expect(modRes.body.message).toMatch(/locked/i);
  });

  it('6. Unlocks the EI and verifies cascading unlock', async () => {
    if (!eiId) return;

    const unlockRes = await request(app)
      .post('/api/lock/unlock-document')
      .set(authHeaders(token))
      .send({
        documentType: 'EXPORT_INVOICE',
        documentId: eiId,
        unlockReason: 'Test unlock cascade'
      });

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.success).toBe(true);

    const companyPool = await router.getCompanyDatabase(companyId);
    
    const verifyUnlock = async (table, idField, idValue) => {
      const result = await companyPool.query(`SELECT is_locked FROM ${table} WHERE ${idField} = $1`, [idValue]);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].is_locked).toBe(false);
    };

    await verifyUnlock('export_invoices', 'id', eiId);
    if(plId) await verifyUnlock('packing_lists', 'export_invoice_id', eiId);
    if(anxId) await verifyUnlock('export_invoice_annexures', 'export_invoice_id', eiId);
    if(ibId) await verifyUnlock('invoice_backside', 'export_invoice_id', eiId);
    if(vgmId) await verifyUnlock('vgm_documents', 'export_invoice_id', eiId);
    if(siId) await verifyUnlock('shipping_instructions', 'export_invoice_id', eiId);
  });
});
