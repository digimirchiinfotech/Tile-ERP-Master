import { query } from './src/config/database.js';

async function checkRLS() {
  try {
    const res = await query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('subscription_transactions', 'company_subscriptions', 'subscription_plans', 'companies');
    `, [], 'super_admin_bypass');
    console.table(res.rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
checkRLS();
