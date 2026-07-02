const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5432, database: 'tile_exporter_crm', user: 'postgres', password: '442277' });
client.connect().then(async () => {
  const res = await client.query("SELECT conname, contype FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'u'");
  console.log('Unique constraints on users:', res.rows);
  
  // Also check column structure
  const cols = await client.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('email_id', 'username', 'name')");
  console.log('Columns:', cols.rows);
  
  // Check if username column exists
  const userSample = await client.query("SELECT id, email_id, username, name, role, company_id FROM users WHERE role = 'company_admin' LIMIT 5");
  console.log('Company admin sample:', userSample.rows);
  client.end();
}).catch(e => { console.error(e.message); client.end(); });
