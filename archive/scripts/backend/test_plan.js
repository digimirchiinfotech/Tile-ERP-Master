import { masterQuery } from './src/config/masterDatabase.js';

async function test() {
  try {
    const result = await masterQuery(
      `INSERT INTO subscription_plans (id, name, code, price, duration, duration_type, features, max_users, max_companies, status, created_at) VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM subscription_plans), 'Test Plan', 'TEST_PLAN', 100, 30, 'days', '[]', 10, 1, 'Active', CURRENT_TIMESTAMP) RETURNING *`
    );
    console.log("Success:", result.rows[0]);
  } catch (err) {
    console.error("Database Error:", err.message);
  } finally {
    process.exit(0);
  }
}
test();
