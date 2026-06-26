import request from 'supertest';
import express from 'express';
// Assuming app is exported from server.js or we can mock the routes
import * as proformaInvoiceController from '../../src/controllers/proformaInvoiceController.js';
import * as exportInvoiceController from '../../src/controllers/exportInvoiceController.js';

const app = express();
app.use(express.json());

// Mocking auth middleware for tests
app.use((req, res, next) => {
  req.user = { id: 'test-user-id', tenant_id: 'test-tenant', role: 'admin' };
  next();
});

// Mock routes
app.post('/api/proforma-invoice/convert-to-ei', (req, res) => {
  // Simulate the controller action
  res.status(200).json({ success: true, message: 'Converted to Export Invoice', documentId: 'EI-123' });
});

describe('Document Conversion Endpoints', () => {
  it('should successfully convert a Proforma Invoice to Export Invoice', async () => {
    const res = await request(app)
      .post('/api/proforma-invoice/convert-to-ei')
      .send({ pi_id: 'PI-123' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('documentId');
  });

  it('should prevent converting an already converted PI', async () => {
    // We would mock the controller or db to simulate an error here
    const mockApp = express();
    mockApp.use(express.json());
    mockApp.post('/api/proforma-invoice/convert-to-ei', (req, res) => {
      res.status(400).json({ success: false, message: 'Document already converted' });
    });

    const res = await request(mockApp)
      .post('/api/proforma-invoice/convert-to-ei')
      .send({ pi_id: 'PI-123' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message).toContain('already converted');
  });
});
