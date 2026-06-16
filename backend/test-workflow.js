import dotenv from 'dotenv';
dotenv.config();
import { getFullWorkflowStatus } from './src/controllers/workflowController.js';
import { dbRouter } from './src/middleware/dbRouter.js';

const req = {
  params: { piNumber: 'CNPI/3386' },
  companyFilter: '00000000-0000-0000-0000-000000000001',
  user: { role: 'super_admin' },
  db: null
};

const res = {
  json: (data) => console.log(JSON.stringify(data, null, 2)),
  status: () => res
};

dbRouter(req, res, async () => {
  try {
    await getFullWorkflowStatus(req, res, (e) => console.error('Next called with:', e));
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit(0);
});
