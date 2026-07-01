import { validateGSTIN } from './src/controllers/gstinController.js';

const mockReq = {
  body: { gstin: '24CJOPP4304H1Z6' }
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('JSON Output:', data);
    return this;
  }
};

const mockNext = (err) => {
  console.error('Next called with error:', err);
};

console.log('Testing validateGSTIN...');
validateGSTIN(mockReq, mockRes, mockNext).then(() => {
  console.log('Test completed');
}).catch(err => {
  console.error('Unhandled promise rejection:', err);
});
