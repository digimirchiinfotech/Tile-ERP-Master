import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());

// Mock in-memory lock state
let documentLock = false;

app.post('/api/documents/:id/lock', (req, res) => {
  if (documentLock) {
    // Simulated delay to test atomicity
    setTimeout(() => {
      res.status(409).json({ success: false, message: 'Document is already locked by another process' });
    }, 10);
  } else {
    documentLock = true;
    setTimeout(() => {
      res.status(200).json({ success: true, message: 'Document locked successfully' });
    }, 50);
  }
});

app.post('/api/documents/:id/unlock', (req, res) => {
  documentLock = false;
  res.status(200).json({ success: true, message: 'Document unlocked' });
});

describe('Document Locking Atomicity', () => {
  beforeEach(() => {
    // Reset lock before each test
    documentLock = false;
  });

  it('should allow first request to lock the document', async () => {
    const res = await request(app).post('/api/documents/DOC-123/lock');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject concurrent requests to lock the same document', async () => {
    // Send two requests almost simultaneously
    const req1 = request(app).post('/api/documents/DOC-123/lock');
    const req2 = request(app).post('/api/documents/DOC-123/lock');

    const [res1, res2] = await Promise.all([req1, req2]);

    // One should succeed, one should fail
    const statuses = [res1.statusCode, res2.statusCode].sort();
    expect(statuses).toEqual([200, 409]);
  });
});
