import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());

// Mocking middleware and routes
app.use((req, res, next) => {
  // Extract tenant from header for test simulation
  req.user = { tenant_id: req.headers['x-tenant-id'] || 'tenant-1' };
  next();
});

app.get('/api/documents/:id', (req, res) => {
  const docTenant = 'tenant-1'; // Document belongs to tenant-1
  if (req.user.tenant_id !== docTenant) {
    return res.status(403).json({ success: false, message: 'Access denied: Tenant mismatch' });
  }
  res.status(200).json({ success: true, document: { id: req.params.id, data: 'secure data' } });
});

describe('Tenant Isolation', () => {
  it('should allow access if tenant ID matches', async () => {
    const res = await request(app)
      .get('/api/documents/DOC-123')
      .set('x-tenant-id', 'tenant-1');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should deny access if tenant ID does not match (Cross-Tenant Access)', async () => {
    const res = await request(app)
      .get('/api/documents/DOC-123')
      .set('x-tenant-id', 'tenant-2');
    
    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access denied');
  });
});
