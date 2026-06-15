const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:16183/railway', 
  ssl: { rejectUnauthorized: false } 
}); 
client.connect().then(() => 
  client.query('SELECT u.id, u.company_id, u.name, u.email_id, u.contact_number, u.role, u.department, u.designation, u.avatar_url, u.status, u.permissions, u.settings, u.last_login, u.created_at, u.updated_at, u.employee_id, u.territory, u.sales_target, u.commission, u.country, u.city FROM users u LIMIT 1')
).then(res => { 
  console.log("SUCCESS: Found " + res.rows.length + " rows"); 
  client.end(); 
}).catch(e => { 
  console.error("ERROR: " + e.message); 
  client.end(); 
});
