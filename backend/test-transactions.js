import { getTransactions } from './src/controllers/subscriptionController.js';
import { query } from './src/config/database.js';

const req = {
  query: {},
  user: { role: 'super_admin' },
  db: {
    globalQuery: async (text, params) => {
      return query(text, params, 'super_admin_bypass');
    }
  }
};

const res = {
  status: (code) => {
    console.log(`Status: ${code}`);
    return {
      json: (data) => {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
        process.exit(0);
      }
    };
  }
};

const next = (err) => {
  console.error('Error:', err);
  process.exit(1);
};

console.log('Running getTransactions...');
getTransactions(req, res, next);
