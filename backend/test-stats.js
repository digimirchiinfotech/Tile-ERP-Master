import { getDashboardData } from './src/controllers/dashboardController.js';
import masterPool from './src/config/masterDatabase.js';

async function test() {
  const req = {
    user: { id: 'uuid', role: 'super_admin' },
    companyFilter: '10d7f367-faaf-4553-8c59-165caf150814',
    hasOwnProperty: () => true,
    db: {
      query: (...args) => masterPool.query(...args),
      globalQuery: (...args) => masterPool.query(...args),
    }
  };
  const res = {
    status: (code) => ({ json: (data) => console.log('res:', code, data) })
  };
  const next = (err) => console.error('next error:', err);

  await getDashboardData(req, res, next);
  await masterPool.end();
}

test();
