const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:442277@localhost:5432/tile_exporter_crm' });
async function test() {
  try {
    const res = await pool.query(`SELECT c.id, c.name,
              u_agg.last_login,
              COALESCE(u_agg.total_users, 0) as total_users,
              cs_agg.monthly_revenue,
              cs_agg.subscription_end_date,
              cs_agg.days_until_expiry,
              CASE
                WHEN c.status = 'Expired' THEN 'At Risk'
                WHEN u_agg.last_login < CURRENT_DATE - INTERVAL '30 days' THEN 'Inactive'
                WHEN cs_agg.subscription_end_date < CURRENT_DATE + INTERVAL '14 days' THEN 'Expiring Soon'
                ELSE 'Healthy'
              END as health_status
       FROM companies c
       LEFT JOIN (
         SELECT company_id, MAX(last_login) as last_login, COUNT(*)::int as total_users
         FROM users
         GROUP BY company_id
       ) u_agg ON u_agg.company_id = c.id
       LEFT JOIN LATERAL (
         SELECT cs.amount as monthly_revenue,
                cs.end_date as subscription_end_date,
                (DATE(cs.end_date) - CURRENT_DATE) as days_until_expiry
         FROM company_subscriptions cs
         WHERE cs.company_id = c.id AND cs.status = 'Active'
         ORDER BY cs.created_at DESC
         LIMIT 1
       ) cs_agg ON true
       ORDER BY c.created_at DESC
       LIMIT 50 OFFSET 0`);
    console.log('SUCCESS', res.rows.length);
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await pool.end();
  }
}
test();
