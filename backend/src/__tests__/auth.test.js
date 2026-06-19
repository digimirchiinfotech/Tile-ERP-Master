import request from 'supertest';
import app from '../server.js';
import { TEST_CREDENTIALS } from './helpers.js';
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

describe('Health & Auth', () => {
  it('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBe('connected');
  });

  it('GET /api/clients without token returns 401', async () => {
    const res = await request(app).get('/api/clients').expect(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email_id: 'nonexistent@test.com', password: 'wrongpassword' })
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login succeeds with valid super admin', async () => {
    if (!TEST_CREDENTIALS.superAdminPassword) return;

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email_id: TEST_CREDENTIALS.superAdminEmail,
        password: TEST_CREDENTIALS.superAdminPassword,
      })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.mustChangePassword).toBe(false);
  });

  it('POST /api/auth/login rejects old weak super-admin password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email_id: 'admin@admin.com', password: 'admin123' });
    expect(res.status).toBe(401);
  });
});
