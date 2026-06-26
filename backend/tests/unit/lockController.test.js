import { jest } from '@jest/globals';
import { lockDocument } from '../../src/controllers/lockController.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('Lock Controller Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {
        documentType: 'PI',
        documentId: 'DOC-123'
      },
      user: {
        id: 'user-123'
      },
      companyFilter: 'company-123',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'jest-test'
      },
      db: {
        getClient: jest.fn()
      }
    };
    mockRes = {
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should return 404 if document is not found', async () => {
    const mockClient = {
      query: jest.fn().mockImplementation((queryText) => {
        if (queryText === 'BEGIN' || queryText === 'ROLLBACK') return Promise.resolve();
        if (queryText.includes('SELECT * FROM proforma_invoices')) {
          return Promise.resolve({ rows: [] }); // Not found
        }
        return Promise.resolve();
      }),
      release: jest.fn()
    };
    mockReq.db.getClient.mockResolvedValue(mockClient);

    await lockDocument(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
    expect(mockNext.mock.calls[0][0].message).toBe('Document not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('should return 400 if document is already locked', async () => {
    const mockClient = {
      query: jest.fn().mockImplementation((queryText) => {
        if (queryText === 'BEGIN' || queryText === 'ROLLBACK') return Promise.resolve();
        if (queryText.includes('SELECT * FROM proforma_invoices')) {
          return Promise.resolve({ rows: [{ id: 'DOC-123', is_locked: true }] });
        }
        return Promise.resolve();
      }),
      release: jest.fn()
    };
    mockReq.db.getClient.mockResolvedValue(mockClient);

    await lockDocument(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    expect(mockNext.mock.calls[0][0].message).toBe('Document is already locked');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
