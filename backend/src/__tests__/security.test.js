import request from 'supertest';
import app from '../server.js';
import { loginAsCompanyAdmin, authHeaders, extractList } from './helpers.js';

const unlockIfLocked = async (token, invoiceId) => {
  await request(app)
    .post('/api/locks/unlock')
    .set(authHeaders(token))
    .send({ documentType: 'PI', documentId: invoiceId, unlockReason: 'Test cleanup' });
};

describe('Document Locking', () => {
  let token;
  let testInvoice;

  beforeAll(async () => {
    const data = await loginAsCompanyAdmin(request(app));
    token = data.accessToken;

    const listRes = await request(app)
      .get('/api/proforma-invoices?limit=1')
      .set(authHeaders(token));

    const invoices = extractList(listRes.body);
    testInvoice = invoices[0] || null;
  });

  afterAll(async () => {
    if (token && testInvoice?.id) {
      await unlockIfLocked(token, testInvoice.id);
    }
  });

  it('blocks update on locked proforma invoice', async () => {
    if (!testInvoice) {
      console.warn('Skipping lock test — no proforma invoices in tenant');
      return;
    }

    await unlockIfLocked(token, testInvoice.id);

    await request(app)
      .post('/api/locks/lock')
      .set(authHeaders(token))
      .send({
        documentType: 'PI',
        documentId: testInvoice.id,
        snapshotData: { locked_at_test: true, invoice_no: testInvoice.invoice_no },
      })
      .expect(200);

    const updateRes = await request(app)
      .put(`/api/proforma-invoices/${testInvoice.id}`)
      .set(authHeaders(token))
      .send({ client_name: 'LOCK_TEST_SHOULD_FAIL' });

    expect(updateRes.status).toBe(403);

    await unlockIfLocked(token, testInvoice.id);
  });

  it('returns locked snapshot on GET after lock', async () => {
    if (!testInvoice) return;

    await unlockIfLocked(token, testInvoice.id);

    await request(app)
      .post('/api/locks/lock')
      .set(authHeaders(token))
      .send({
        documentType: 'PI',
        documentId: testInvoice.id,
        snapshotData: { test_snapshot: true },
      })
      .expect(200);

    const getRes = await request(app)
      .get(`/api/proforma-invoices/${testInvoice.id}`)
      .set(authHeaders(token))
      .expect(200);

    expect(getRes.body.message).toMatch(/LOCKED/i);

    await unlockIfLocked(token, testInvoice.id);
  });
});

describe('Inventory Module', () => {
  let token;

  beforeAll(async () => {
    const data = await loginAsCompanyAdmin(request(app));
    token = data.accessToken;
  });

  it('GET /api/inventory/summary returns stock summary', async () => {
    const res = await request(app)
      .get('/api/inventory/summary')
      .set(authHeaders(token))
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total_skus');
  });

  it('rejects stock OUT movement when no stock exists', async () => {
    const productsRes = await request(app)
      .get('/api/products?limit=1')
      .set(authHeaders(token));

    const products = extractList(productsRes.body);
    if (products.length === 0) return;

    const res = await request(app)
      .post('/api/inventory/movements')
      .set(authHeaders(token))
      .send({
        product_id: products[0].id,
        movement_type: 'OUT',
        quantity_boxes: 99999,
      });

    expect(res.status).toBe(400);
  });
});

describe('Tenant Backup', () => {
  let token;

  beforeAll(async () => {
    const data = await loginAsCompanyAdmin(request(app));
    token = data.accessToken;
  });

  it('GET /api/tenant-backups/list accessible to company admin', async () => {
    const res = await request(app)
      .get('/api/tenant-backups/list')
      .set(authHeaders(token))
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Password Policy', () => {
  it('rejects weak passwords on register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: `weak_${Date.now()}@test.com`,
        password: 'admin123',
        company_id: '00000000-0000-0000-0000-000000000001',
      });
    expect([400, 422]).toContain(res.status);
  });

  it('rejects weak super-admin password at login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email_id: 'admin@admin.com', password: 'admin123' });
    expect(res.status).toBe(401);
  });
});
