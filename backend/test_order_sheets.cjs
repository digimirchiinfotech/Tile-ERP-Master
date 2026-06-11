const pg = require('pg');
const pool = new pg.Pool({ 
  host: 'localhost',
  port: 5432,
  database: 'tile_exporter_crm',
  user: 'postgres',
  password: '442277'
});

async function run() {
  try {
    const client = await pool.connect();
    
    // Check POs
    try {
      console.log('Testing /proforma-orders?status=Approved...');
      const { rows } = await client.query(`
       SELECT po.*, 
              s.name as supplier_name_ref, s.email_id as supplier_email, s.contact_number as supplier_phone,
              pi.invoice_no as pi_reference, pi.total_amount as pi_amount, pi.status as pi_status,
              pi.client_name as pi_client
       FROM proforma_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN proforma_invoices pi ON po.invoice_ref = pi.invoice_no
       LIMIT 1
      `);
      console.log('PO Query SUCCESS:', rows.length);
    } catch(e) {
      console.error('PO Query ERROR:', e.message);
    }

    // Check Order Sheets
    try {
      console.log('Testing /order-sheets?limit=1000...');
      const { rows } = await client.query(`
      SELECT 
        os.*,
        (SELECT po.box_type FROM proforma_orders po WHERE po.id = os.proforma_order_id) as box_type,
        (
          SELECT json_agg(json_build_object(
            'id', osl.id,
            'proforma_order_line_id', osl.proforma_order_line_id,
            'product_category', osl.product_category,
            'design', osl.design,
            'tile_category', osl.tile_category
          ))
          FROM master_order_sheet_lines osl
          WHERE osl.master_order_sheet_id = os.id
        ) as lines
      FROM master_order_sheets os
      LIMIT 1
      `);
      console.log('Order Sheets Query SUCCESS:', rows.length);
    } catch(e) {
      console.error('Order Sheets Query ERROR:', e.message);
    }

    client.release();
  } catch(e) {
    console.error('Connection Error:', e.message);
  } finally {
    await pool.end();
  }
}
run();
