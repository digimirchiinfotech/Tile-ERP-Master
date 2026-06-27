const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:442277@localhost:5432/tile_exporter_crm' });
async function run() {
  try {
    const res = await pool.query(`INSERT INTO clients 
       (company_id, client_id, name, contact_person_name, email, contact_number, address, 
        city, country, business_type, credit_limit, credit_days,
        assigned_salesperson, status, notes, consignee_details, buyer_details, port_of_loading, port_of_discharge, final_destination, currency, created_by,
        created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`, [
      '66e68258-a6fc-4ad2-b014-22e086e1cff2', 'CLI-001', 'Test Name', 'Person', 'a@a.com', '123', 'addr', 'city', 'country', 'bt', 0, 0, null, 'Active', 'notes', 'consignee', 'buyer', 'MUNDRA PORT', 'pod', 'fd', 'INR', null
    ]);
    console.log('SUCCESS:', res.rows[0].id);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}
run();
