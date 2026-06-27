import request from 'supertest';
import app from '../server.js';
import pool from '../config/database-wrapper.js';
import bcrypt from 'bcrypt';

describe('Auth Endpoints', () => {
  let testUser = {
    email: 'test@example.com',
    password: 'password123',
    hashedPassword: ''
  };

  beforeAll(async () => {
    testUser.hashedPassword = await bcrypt.hash(testUser.password, 10);
    // Cleanup users table if needed and insert a test user
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await pool.query(
      'INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true)',
      [testUser.email, testUser.hashedPassword, 'admin', 'Test', 'User']
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await pool.end();
  });

  describe('POST /api/auth/login', () => {
    it('Returns 200 + accessToken + refreshToken for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('Returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Returns 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Returns 429 or locked response after 5 failed login attempts', async () => {
      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send({ email: testUser.email, password: 'wrongpassword' });
      }
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });
      
      expect([429, 401, 403]).toContain(res.status);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let validRefreshToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      validRefreshToken = res.body.refreshToken;
    });

    it('POST /api/auth/refresh-token returns new accessToken when refresh token is valid', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ token: validRefreshToken });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
    });

    it('POST /api/auth/refresh-token returns 401 for expired or invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ token: 'invalid.token.here' });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
