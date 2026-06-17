import { getAllSubscriptions } from './src/controllers/subscriptionController.js';

async function test() {
  const req = {
    query: {},
    user: { role: 'super_admin' },
    db: {
      globalQuery: async (text, values) => {
        const { query } = await import('./src/config/database.js');
        return query(text, values);
      }
    }
  };

  const res = {
    status: (code) => {
      console.log('Status:', code);
      return {
        json: (data) => console.log('Response JSON:', JSON.stringify(data, null, 2))
      };
    }
  };

  const next = (err) => console.error('Next error:', err);

  await getAllSubscriptions(req, res, next);
  process.exit(0);
}

test();
