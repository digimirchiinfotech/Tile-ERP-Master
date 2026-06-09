import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

async function testApi() {
  const pool = new Pool({ connectionString: 'postgres://postgres:442277@localhost:5432/tile_exporter_crm' });
  
  // get a user
  const userRes = await pool.query('SELECT * FROM users LIMIT 1');
  if (userRes.rows.length === 0) { console.log('No users found'); process.exit(0); }
  const user = userRes.rows[0];

  const JWT_SECRET = '9a9ca4445bcffe2f2bd8c5ce2a9a14951ad5749db7dbe45ced6c37a3d8bc90e951fe1a17f990679f7b3c7c44b1b6ba1107fbe6ced1a35444ffff02485f47093f';
  
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, company_id: user.company_id },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const res = await fetch('http://localhost:8000/api/order-sheets?limit=50&sort=created_at&order=desc', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('RESPONSE:', text);
  process.exit(0);
}
testApi();
