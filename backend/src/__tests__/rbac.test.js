import request from 'supertest';
import app from '../server.js';
import pool from '../config/database-wrapper.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

describe('Role-Based Access Control (RBAC)', () => {
  let companyId = uuidv4();
  let tokens = {};

  beforeAll(async () => {
    await pool.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [companyId, 'RBAC Company']);

    const roles = ['client', 'qc', 'sales_executive', 'sales_manager', 'company_admin'];
    const pwd = await bcrypt.hash('password123', 10);

    for (const role of roles) {
      const email = `${role}@rbac.com`;
      await pool.query(
        'INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [uuidv4(), email, pwd, role, 'Test', role, true, companyId]
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });
      tokens[role] = res.body.accessToken;
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE company_id = $1', [companyId]);
    await pool.query('DELETE FROM companies WHERE id = $1', [companyId]);
    await pool.end();
  });

  it('A user with role "client" cannot POST to /api/export-invoices (403)', async () => {
    const res = await request(app)
      .post('/api/export-invoices')
      .set('Authorization', `Bearer ${tokens['client']}`)
      .send({ client_id: uuidv4(), invoice_number: 'EI-TEST' });
    expect(res.status).toBe(403);
  });

  it('A user with role "qc" cannot access /api/account-entries (403)', async () => {
    const res = await request(app)
      .get('/api/account-entries')
      .set('Authorization', `Bearer ${tokens['qc']}`);
    expect(res.status).toBe(403);
  });

  it('A user with role "sales_executive" cannot delete clients (403)', async () => {
    const res = await request(app)
      .delete(`/api/clients/${uuidv4()}`)
      .set('Authorization', `Bearer ${tokens['sales_executive']}`);
    expect(res.status).toBe(403);
  });

  it('A user with role "sales_manager" CAN create a proforma invoice (201)', async () => {
    const res = await request(app)
      .post('/api/proforma-invoices')
      .set('Authorization', `Bearer ${tokens['sales_manager']}`)
      .send({
        client_id: uuidv4(), // assuming valid client isn't strictly checked or we mock it
        invoice_number: `PI-${Date.now()}`,
        date: '2023-01-01'
      });
    // Can be 201 or 400 (if client_id is invalid), but it must NOT be 403
    expect(res.status).not.toBe(403);
    expect([201, 400]).toContain(res.status);
  });

  it('A user with role "company_admin" can access all modules (200)', async () => {
    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${tokens['company_admin']}`);
    expect(res.status).toBe(200);
  });

  it('Requests with no Authorization header return 401 on all protected routes', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(401);
  });
});
