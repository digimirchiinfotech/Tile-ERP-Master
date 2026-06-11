const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres:ferZHunAuPdVDTvQiJJNAIfmtZpWZFFg@acela.proxy.rlwy.net:16183/railway'
}); 

async function migrate() {
  try {
    await client.connect();
    console.log("Connected to remote DB.");
    
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS territory VARCHAR(255);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_target NUMERIC(15,2);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS commission NUMERIC(5,2);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);');
    
    console.log("Migration successful!");
  } catch(e) {
    console.error("Migration error: ", e.message);
  } finally {
    client.end();
  }
}

migrate();
