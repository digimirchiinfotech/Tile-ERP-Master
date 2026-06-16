import dotenv from 'dotenv';
dotenv.config();
import { dbRouter } from './src/middleware/dbRouter.js';

const req = { companyFilter: 'b1ca19d9-95de-4d37-9750-f86052bbdc4d' };
const res = {};
dbRouter(req, res, async () => {
  try {
    const r = await req.db.globalQuery('SELECT name, email_id FROM users WHERE id = $1', ['3ace99f5-9ec5-4a30-8728-f325adb551d5']);
    console.log('Result:', r.rows);
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit(0);
});
