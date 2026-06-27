import request from 'supertest';
import app from '../server.js';
import pool from '../config/database-wrapper.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

describe('Document Locking Pipeline', () => {
  let token;
  let companyId = uuidv4();
  let userId = uuidv4();
  let clientId = uuidv4();
  
  beforeAll(async () => {
    // Setup test user and company
    await pool.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [companyId, 'Test Company']);
    const pwd = await bcrypt.hash('password123', 10);
    await pool.query(
      'INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [userId, 'doclock@example.com', pwd, 'admin', 'Doc', 'Lock', true, companyId]
    );
    await pool.query(
      'INSERT INTO clients (id, client_name, company_id, country) VALUES ($1, $2, $3, $4)',
      [clientId, 'Lock Client', companyId, 'USA']
    );

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doclock@example.com', password: 'password123' });
    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM packing_lists WHERE company_id = $1', [companyId]);
    await pool.query('DELETE FROM export_invoices WHERE company_id = $1', [companyId]);
    await pool.query('DELETE FROM proforma_invoices WHERE company_id = $1', [companyId]);
    await pool.query('DELETE FROM clients WHERE company_id = $1', [companyId]);
    await pool.query('DELETE FROM users WHERE company_id = $1', [companyId]);
    await pool.query('DELETE FROM companies WHERE id = $1', [companyId]);
    await pool.end();
  });

  it('Create PI, Convert to EI, test locks, Convert to PL, test locks', async () => {
    // 1. Create PI
    const piRes = await request(app)
      .post('/api/proforma-invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        client_id: clientId,
        invoice_number: 'PI-001',
        date: '2023-01-01',
        status: 'Open',
        shipping_terms: 'FOB',
        currency: 'USD'
      });
    expect(piRes.status).toBe(201);
    const piId = piRes.body.data.id;

    // 2. Convert PI to EI
    const eiRes = await request(app)
      .post('/api/export-invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        proforma_invoice_id: piId,
        client_id: clientId,
        invoice_number: 'EI-001',
        date: '2023-01-02'
      });
    expect(eiRes.status).toBe(201);
    const eiId = eiRes.body.data.id;

    // Assert PI is_used becomes true
    const checkPi = await request(app).get(`/api/proforma-invoices/${piId}`).set('Authorization', `Bearer ${token}`);
    expect(checkPi.body.data.is_used).toBe(true);
    expect(checkPi.body.data.lock_message).toBeDefined();

    // 3. Try to create a second EI from locked PI
    const eiRes2 = await request(app)
      .post('/api/export-invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        proforma_invoice_id: piId,
        client_id: clientId,
        invoice_number: 'EI-002',
        date: '2023-01-03'
      });
    expect(eiRes2.status).toBe(400);
    expect(eiRes2.body.message).toMatch(/already been converted/i);

    // 4. Create PL from EI
    const plRes = await request(app)
      .post('/api/packing-lists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        export_invoice_id: eiId,
        client_id: clientId,
        packing_list_number: 'PL-001',
        date: '2023-01-04'
      });
    expect(plRes.status).toBe(201);

    // Assert EI is_used becomes true
    const checkEi = await request(app).get(`/api/export-invoices/${eiId}`).set('Authorization', `Bearer ${token}`);
    expect(checkEi.body.data.is_used).toBe(true);

    // 5. Try to create second PL from locked EI
    const plRes2 = await request(app)
      .post('/api/packing-lists')
      .set('Authorization', `Bearer ${token}`)
      .send({
        export_invoice_id: eiId,
        client_id: clientId,
        packing_list_number: 'PL-002',
        date: '2023-01-05'
      });
    expect(plRes2.status).toBe(400);
    expect(plRes2.body.message).toMatch(/already been converted/i);
  });
});
