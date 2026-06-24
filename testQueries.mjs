import('pg').then(async pg => {
  const { Client } = pg.default;
  const client = new Client({ connectionString: 'postgres://postgres:442277@localhost:5432/tile_exporter_crm' });
  try {
    await client.connect();
    
    const queries = {
      customer_sales: 
        SELECT 
          c.client_name as "Customer Name",
          COALESCE(c.country, 'Unknown') as "Country",
          COALESCE(c.email, '-') as "Email",
          COALESCE(c.phone, '-') as "Phone",
          COUNT(DISTINCT pi.id) as "Total Orders",
          COALESCE(SUM(CAST(pi.total_amount AS DECIMAL)), 0) as "Total Revenue (INR)",
          COALESCE(ROUND(SUM(CAST(pi.total_amount AS DECIMAL)) / NULLIF(COUNT(DISTINCT pi.id), 0), 2), 0) as "Avg Order Value (INR)",
          MAX(pi.date) as "Last Order Date",
          SUM(CASE WHEN pi.status != 'Paid' THEN CAST(pi.total_amount AS DECIMAL) ELSE 0 END) as "Total Outstanding (INR)"
        FROM clients c
        LEFT JOIN proforma_invoices pi ON c.id = pi.client_id
        WHERE c.company_id IS NULL
        GROUP BY c.id, c.client_name, c.country, c.email, c.phone
        ORDER BY "Total Revenue (INR)" DESC
      ,
      container_utilization: 
        SELECT 
          pl.proforma_invoice_no as "Proforma No",
          pl.packing_list_no as "Packing List No",
          pi.invoice_no as "Invoice No",
          COALESCE(c.client_name, 'Unknown') as "Customer",
          COALESCE(pi.country, c.country, 'Unknown') as "Destination",
          pl.total_pallets as "Total Pallets",
          pl.total_boxes as "Total Boxes",
          pl.total_sqm as "Total SQM",
          pl.total_weight as "Net Weight (KG)",
          COALESCE(pl.gross_weight, pl.total_weight * 1.02) as "Gross Weight (KG)"
        FROM packing_lists pl
        JOIN proforma_invoices pi ON pl.proforma_invoice_no = pi.proforma_invoice_no OR pl.proforma_invoice_no = pi.invoice_no
        LEFT JOIN clients c ON pi.client_id = c.id
        WHERE pi.company_id IS NULL
        ORDER BY pl.created_at DESC
      ,
      outstanding_aging: 
        SELECT 
          c.client_name as "Customer Name",
          COALESCE(c.country, 'Unknown') as "Country",
          pi.invoice_no as "Invoice No",
          pi.proforma_invoice_no as "Proforma No",
          pi.date as "Invoice Date",
          pi.total_amount as "Invoice Amount",
          CURRENT_DATE - pi.date as "Aging (Days)",
          pi.status as "Payment Status"
        FROM proforma_invoices pi
        LEFT JOIN clients c ON pi.client_id = c.id
        WHERE pi.company_id IS NULL AND pi.status != 'Paid'
        ORDER BY "Aging (Days)" DESC
      
    };

    for (const [name, query] of Object.entries(queries)) {
      try {
        await client.query(query);
        console.log(name + ' SUCCESS');
      } catch (e) {
        console.log(name + ' ERROR: ' + e.message);
      }
    }
    
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
});
