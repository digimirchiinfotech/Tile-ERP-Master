const pg = require('pg');

const masterConfig = { connectionString: 'postgres://postgres:442277@localhost:5432/tile_exporter_crm' };

async function migrateData() {
  const masterPool = new pg.Pool(masterConfig);
  let companies = [];
  try {
    const cRes = await masterPool.query("SELECT id, db_name FROM companies WHERE db_name IS NOT NULL");
    companies = cRes.rows;
  } catch (e) {
    console.error("Master DB error:", e);
    process.exit(1);
  } finally {
    await masterPool.end();
  }

  for (const c of companies) {
    const p = new pg.Pool({ connectionString: `postgres://postgres:442277@localhost:5432/${c.db_name}` });
    try {
      console.log(`Checking ${c.db_name}...`);
      
      // Ensure master_order_sheets exists
      await p.query(`
        CREATE TABLE IF NOT EXISTS master_order_sheets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          proforma_order_id UUID REFERENCES proforma_orders(id) ON DELETE CASCADE,
          po_no VARCHAR(100),
          client_name VARCHAR(255),
          supplier_name VARCHAR(255),
          port_of_loading VARCHAR(255),
          port_of_discharge VARCHAR(255),
          pi_reference VARCHAR(100),
          booking_number VARCHAR(100),
          loading_status VARCHAR(50) DEFAULT 'Pending',
          priority VARCHAR(50) DEFAULT 'Medium',
          shipment_date DATE,
          shipment_month VARCHAR(50),
          etd DATE,
          container_no VARCHAR(100),
          production_sheet_no VARCHAR(100),
          status VARCHAR(50) DEFAULT 'Pending',
          internal_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await p.query(`
        CREATE TABLE IF NOT EXISTS master_order_sheet_lines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          master_order_sheet_id UUID REFERENCES master_order_sheets(id) ON DELETE CASCADE,
          proforma_order_line_id UUID REFERENCES proforma_order_lines(id) ON DELETE CASCADE,
          product_category VARCHAR(255),
          design VARCHAR(255),
          size VARCHAR(100),
          surface VARCHAR(100),
          thickness VARCHAR(50),
          required_sqm NUMERIC(15,4) DEFAULT 0,
          produced_sqm NUMERIC(15,4) DEFAULT 0,
          factory_id UUID,
          production_start_date DATE,
          production_complete_date DATE,
          status VARCHAR(50) DEFAULT 'Pending',
          qc_status VARCHAR(50) DEFAULT 'Pending',
          shade VARCHAR(100),
          caliber VARCHAR(100),
          grade VARCHAR(100),
          boxes_required INTEGER DEFAULT 0,
          boxes_produced INTEGER DEFAULT 0,
          pallets_required INTEGER DEFAULT 0,
          pallets_produced INTEGER DEFAULT 0,
          total_production_boxes NUMERIC(12,2) DEFAULT 0,
          factory_allocated_boxes NUMERIC(12,2) DEFAULT 0,
          production_completed_boxes NUMERIC(12,2) DEFAULT 0,
          qc_approved_boxes NUMERIC(12,2) DEFAULT 0,
          ready_for_packing_boxes NUMERIC(12,2) DEFAULT 0,
          packed_boxes NUMERIC(12,2) DEFAULT 0,
          loaded_boxes NUMERIC(12,2) DEFAULT 0,
          production_progress_percent NUMERIC(5,2) DEFAULT 0,
          production_status VARCHAR(50) DEFAULT 'Not Started',
          factory_notes TEXT,
          delay_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Copy from order_sheets to master_order_sheets
      const sheetsQuery = await p.query("SELECT * FROM order_sheets");
      const sheets = sheetsQuery.rows;
      if (sheets.length === 0) continue;

      console.log(`Migrating ${sheets.length} sheets in ${c.db_name}`);

      for (const sheet of sheets) {
        // Skip if already migrated
        const check = await p.query("SELECT id FROM master_order_sheets WHERE id = $1", [sheet.id]);
        if (check.rows.length > 0) continue;

        await p.query(`
          INSERT INTO master_order_sheets (
            id, company_id, proforma_order_id, po_no, client_name, supplier_name, port_of_loading, 
            port_of_discharge, pi_reference, booking_number, priority, shipment_date, 
            shipment_month, etd, container_no, production_sheet_no, status, internal_notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `, [
          sheet.id, sheet.company_id, sheet.proforma_order_id, sheet.po_no, sheet.client_name, sheet.supplier_name,
          sheet.port_of_loading, sheet.port_of_discharge, sheet.pi_reference, sheet.booking_number, sheet.priority,
          sheet.shipment_date, sheet.shipment_month, sheet.etd, sheet.container_no, sheet.production_sheet_no,
          sheet.status, sheet.internal_notes, sheet.created_at, sheet.updated_at
        ]);

        const linesQuery = await p.query("SELECT * FROM order_sheet_lines WHERE order_sheet_id = $1", [sheet.id]);
        for (const line of linesQuery.rows) {
          await p.query(`
            INSERT INTO master_order_sheet_lines (
              id, company_id, master_order_sheet_id, proforma_order_line_id, product_category, design, size,
              surface, thickness, required_sqm, produced_sqm, factory_id, production_start_date, production_complete_date,
              status, qc_status, shade, caliber, grade, boxes_required, boxes_produced, pallets_required, pallets_produced,
              total_production_boxes, factory_allocated_boxes, production_completed_boxes, qc_approved_boxes,
              ready_for_packing_boxes, packed_boxes, loaded_boxes, production_progress_percent, production_status,
              factory_notes, delay_reason, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)
          `, [
            line.id, line.company_id, sheet.id, line.proforma_order_line_id, line.product_category, line.design, line.size,
            line.surface, line.thickness, line.required_sqm, line.produced_sqm, line.factory_id, line.production_start_date,
            line.production_complete_date, line.status, line.qc_status, line.shade, line.caliber, line.grade, line.boxes_required,
            line.boxes_produced, line.pallets_required, line.pallets_produced, line.total_production_boxes, line.factory_allocated_boxes,
            line.production_completed_boxes, line.qc_approved_boxes, line.ready_for_packing_boxes, line.packed_boxes, line.loaded_boxes,
            line.production_progress_percent, line.production_status, line.factory_notes, line.delay_reason, line.created_at, line.updated_at
          ]);
        }
      }
      console.log(`Migrated successfully in ${c.db_name}`);
    } catch(e) {
      if (e.code === '42P01') {
        // relation does not exist - safe to ignore if order_sheets wasn't there
      } else {
        console.error(`DB ${c.db_name} error:`, e.message);
      }
    } finally {
      await p.end();
    }
  }
}

migrateData();
