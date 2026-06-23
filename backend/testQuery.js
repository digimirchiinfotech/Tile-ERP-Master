import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const query = `
    (SELECT inv.id, inv.invoice_no, CAST(inv.invoice_date AS TEXT) as date, CAST(inv.total_amount AS NUMERIC) as total_amount, 'Export' as type 
     FROM export_invoices inv
     LEFT JOIN clients c ON inv.client_id = c.id
     WHERE (c.name ILIKE $1 OR c.client_name ILIKE $1 OR inv.client_name ILIKE $1)
    )
    UNION ALL
    (SELECT inv.id, inv.invoice_no, CAST(inv.date AS TEXT) as date, CAST(inv.total_amount AS NUMERIC) as total_amount, 'Proforma' as type 
     FROM proforma_invoices inv
     LEFT JOIN clients c ON inv.client_id = c.id
     WHERE (c.name ILIKE $1 OR c.client_name ILIKE $1 OR inv.client_name ILIKE $1)
    )
    ORDER BY date DESC
  `;
  try {
    const result = await pool.query(query, ['%MGL%']);
    console.log("RESULT:", result.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    pool.end();
  }
}
run();
