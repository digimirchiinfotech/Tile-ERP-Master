/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

import { debugLogger } from '../utils/debugLogger.js';
import { AppError } from '../middleware/errorHandler.js';
import { successResponse, paginationResponse, getPagination, generateSequentialId, normalizeEmptyToNull } from '../utils/helpers.js';
import { generateFactoryAssignmentSheet, generateMasterOrderSheetExcel } from '../utils/excelExportService.js';
import { ensureInventorySchema } from '../utils/inventorySchema.js';

// Removed ensureMasterOrderSheetSchemaExists to prevent production ALTER TABLE locks
export const getOrderSheets = async (req, res, next) => {
  try {
    const { 
      page = 1, limit = 50, search, status, priority, 
      date_from, date_to, client_name, po_no
    } = req.query;
    
    const { limit: pageLimit, offset } = getPagination(page, limit);
    const companyId = req.companyFilter;

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (companyId) {
      conditions.push(`os.company_id = $${paramCount}`);
      values.push(companyId);
      paramCount++;
    } else {
      conditions.push(`os.company_id IS NULL`);
    }

    if (search) {
      conditions.push(`(os.po_no ILIKE $${paramCount} OR os.production_sheet_no ILIKE $${paramCount} OR os.client_name ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`os.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (client_name) {
      conditions.push(`os.client_name ILIKE $${paramCount}`);
      values.push(`%${client_name}%`);
      paramCount++;
    }

    if (po_no) {
      conditions.push(`os.po_no ILIKE $${paramCount}`);
      values.push(`%${po_no}%`);
      paramCount++;
    }

    if (priority) {
      conditions.push(`os.priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`os.created_at >= $${paramCount}`);
      values.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`os.created_at <= $${paramCount}`);
      values.push(date_to);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) 
      FROM master_order_sheets os
      ${whereClause}
    `;

    let total = 0;
    try {
      const countRes = await req.db.query(countQuery, values);
      total = parseInt(countRes.rows[0].count, 10);
    } catch (err) {
      if (err.code === '42P01') {
        return successResponse(res, paginationResponse([], 0, page, limit), 'Order sheets table not initialized');
      }
      throw err;
    }

    const dataQuery = `
      SELECT 
        os.*,
        (SELECT po.box_type FROM proforma_orders po WHERE po.id = os.proforma_order_id) as box_type,
        (
          SELECT COALESCE(SUM(osl.total_production_boxes), 0) FROM master_order_sheet_lines osl WHERE osl.master_order_sheet_id = os.id
        ) as total_required_boxes,
        (
          SELECT COALESCE(SUM(osl.factory_allocated_boxes), 0) FROM master_order_sheet_lines osl WHERE osl.master_order_sheet_id = os.id
        ) as total_allocated_boxes,
        (
          SELECT COALESCE(SUM(osl.production_completed_boxes), 0) FROM master_order_sheet_lines osl WHERE osl.master_order_sheet_id = os.id
        ) as total_produced_boxes,
        (
          SELECT COALESCE(SUM(osl.qc_approved_boxes), 0) FROM master_order_sheet_lines osl WHERE osl.master_order_sheet_id = os.id
        ) as total_qc_approved_boxes,
        (
          SELECT COALESCE(SUM(osl.packed_boxes), 0) FROM master_order_sheet_lines osl WHERE osl.master_order_sheet_id = os.id
        ) as total_packed_boxes,
        (
          SELECT COALESCE(SUM(osl.loaded_boxes), 0) FROM master_order_sheet_lines osl WHERE osl.master_order_sheet_id = os.id
        ) as total_loaded_boxes,
        (
          SELECT json_agg(json_build_object(
            'id', osl.id,
            'proforma_order_line_id', osl.proforma_order_line_id,
            'product_category', osl.product_category,
            'design', osl.design,
            'tile_category', osl.tile_category,
            'category', osl.tile_category,
            'size', osl.size,
            'surface', osl.surface,
            'thickness', osl.thickness,
            'required_sqm', osl.required_sqm,
            'produced_sqm', osl.produced_sqm,
            'factory_id', osl.factory_id,
            'factory_name', (SELECT name FROM factory_names WHERE id = osl.factory_id),
            'status', osl.status,
            'qc_status', osl.qc_status,
            'shade', osl.shade,
            'caliber', osl.caliber,
            'grade', osl.grade,
            'boxes_required', osl.boxes_required,
            'boxes_produced', osl.boxes_produced,
            'pallets_required', osl.pallets_required,
            'pallets_produced', osl.pallets_produced,
            'total_production_boxes', osl.total_production_boxes,
            'factory_allocated_boxes', osl.factory_allocated_boxes,
            'production_completed_boxes', osl.production_completed_boxes,
            'qc_approved_boxes', osl.qc_approved_boxes,
            'ready_for_packing_boxes', osl.ready_for_packing_boxes,
            'packed_boxes', osl.packed_boxes,
            'loaded_boxes', osl.loaded_boxes,
            'production_progress_percent', osl.production_progress_percent,
            'production_status', osl.production_status,
            'factory_notes', osl.factory_notes,
            'delay_reason', osl.delay_reason
          ) ORDER BY osl.created_at ASC)
          FROM master_order_sheet_lines osl
          WHERE osl.master_order_sheet_id = os.id
        ) as lines
      FROM master_order_sheets os
      ${whereClause}
      ORDER BY os.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const dataRes = await req.db.query(dataQuery, [...values, pageLimit, offset]);

    return successResponse(
      res,
      paginationResponse(dataRes.rows, total, page, limit),
      'Order sheets retrieved successfully'
    );
  } catch (error) {
    debugLogger.error('Error fetching order sheets:', error);
    next(error);
  }
};

export const createOrderSheet = async (req, res, next) => {
  try {

    const companyId = req.companyFilter;
    const data = req.body;
    const effectiveCompanyId = companyId || data.company_id || (req.user ? req.user.company_id : null);
    
    if (!data.proforma_order_id) {
      return next(new AppError('Proforma Order ID is required', 400));
    }

    const poQuery = `
      SELECT po.*, pi.client_name as pi_client, s.name as supplier_name_ref 
      FROM proforma_orders po 
      LEFT JOIN proforma_invoices pi ON po.invoice_ref = pi.invoice_no AND po.company_id = pi.company_id AND pi.status != 'Revised'
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = $1 AND (po.company_id = $2 OR $2 IS NULL)
    `;
    const poRes = await req.db.query(poQuery, [data.proforma_order_id, effectiveCompanyId]);
    if (poRes.rows.length === 0) return next(new AppError('Proforma Order not found', 404));
    const po = poRes.rows[0];

    let clientName = po.pi_client || po.supplier_name_ref || po.supplier_name || po.client_name;
    if (!clientName && po.snapshot_data) {
      try {
        const snap = typeof po.snapshot_data === 'string' ? JSON.parse(po.snapshot_data) : po.snapshot_data;
        clientName = snap.client_details?.client_name || snap.client_details?.name || snap.client_name || snap.company_details?.name || snap.company_name;
      } catch(e) {}
    }
    clientName = clientName || 'Unknown Client';

    let poLines = [];
    const linesQuery = `SELECT * FROM proforma_order_lines WHERE proforma_order_id = $1`;
    const linesRes = await req.db.query(linesQuery, [po.id]);
    
    if (linesRes.rows.length > 0) {
      poLines = linesRes.rows;
    } else {
      // Fallback 1: try snapshot_data
      if (po.snapshot_data) {
        try {
          const snap = typeof po.snapshot_data === 'string' ? JSON.parse(po.snapshot_data) : po.snapshot_data;
          poLines = snap.lines || snap.product_lines || snap.products || [];
        } catch (e) {
          debugLogger.error('Failed to parse snapshot_data', e);
        }
      }
      // Fallback 2: try product_lines JSON column on PO (legacy storage)
      if (poLines.length === 0 && po.product_lines) {
        try {
          const parsed = typeof po.product_lines === 'string' ? JSON.parse(po.product_lines) : po.product_lines;
          if (Array.isArray(parsed) && parsed.length > 0) {
            poLines = parsed;
          }
        } catch (e) {
          debugLogger.error('Failed to parse product_lines JSON column', e);
        }
      }
    }

    if (poLines.length === 0) {
      return next(new AppError('No products found in the selected Proforma Order. Please add product lines to the PO first.', 400));
    }

    const generatePsDoc = async () => {
       try {
         return await generateSequentialId('OS', 'master_order_sheets', 'production_sheet_no', effectiveCompanyId, req.db);
       } catch(e) {
         return 'OS-' + Date.now();
       }
    };
    
    let psDocNumber = 'OS-' + Date.now();
    try {
      psDocNumber = await generatePsDoc();
    } catch(e) {}
    
    let autoFactoryId = null;
    const poSupplierName = po.supplier_name || po.supplier_name_ref;
    if (poSupplierName) {
      const factoryRes = await req.db.query(`SELECT id FROM factory_names WHERE name ILIKE $1 AND (company_id = $2 OR company_id IS NULL) LIMIT 1`, [poSupplierName, effectiveCompanyId]);
      if (factoryRes.rows.length > 0) {
        autoFactoryId = factoryRes.rows[0].id;
      }
    }
    
    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      const insertOsQuery = `
        INSERT INTO master_order_sheets (
          company_id, proforma_order_id, po_no, client_name, supplier_name, port_of_loading, 
          port_of_discharge, pi_reference, booking_number, priority, shipment_date, 
          production_sheet_no, internal_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const osValues = [
        effectiveCompanyId, 
        po.id, 
        po.order_no, 
        clientName, 
        po.supplier_name || po.supplier_name_ref, 
        po.port_of_loading, 
        po.port_of_discharge, 
        po.invoice_ref, 
        data.booking_number || null, 
        data.priority || 'Medium', 
        data.shipment_date || null, 
        psDocNumber, 
        data.internal_notes || null
      ];
      
      const osResult = await client.query(insertOsQuery, osValues);
      const newOs = osResult.rows[0];

      if (poLines.length > 0) {
        const lineValueStrings = [];
        const lineParams = [];
        let lpc = 1;

        for (const line of poLines) {
          lineValueStrings.push(`($${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, 'Not Started', $${lpc++})`);
          // Resolve product name: DB rows use product_name, JSON payload may use product/name/productName
          const productCategory = line.product_name || line.productName ||
            (typeof line.product === 'string' && line.product.trim() ? line.product : null) ||
            line.product?.name || line.name || line.product_category || 'Unknown Product';
          // Design / color from multiple possible fields
          const design = line.design || line.color || line.design_name || line.description || '';
          const tileCategory = line.tile_category || line.tileCategory || line.category || '';
          // Boxes: DB rows use total_boxes; JSON payloads may use totalBoxes/boxes
          const totalBoxes = parseInt(line.total_boxes || line.totalBoxes || line.boxes || 0) || 0;
          const totalPallets = parseInt(line.total_pallets || line.totalPallets || line.pallets || 0) || 0;
          const totalSqm = parseFloat(line.total_sqm || line.totalSqm || line.sqm_auto || line.sqmAuto || line.sqm || 0) || 0;
          lineParams.push(
            effectiveCompanyId,
            newOs.id,
            line.id || null,
            productCategory,
            design,
            tileCategory,
            line.size || '',
            line.surface || '',
            line.thickness || '',
            totalSqm,
            totalBoxes,
            totalPallets,
            totalBoxes,   // total_production_boxes = same as boxes_required initially
            autoFactoryId
          );
        }

        await client.query(`
          INSERT INTO master_order_sheet_lines (
            company_id, master_order_sheet_id, proforma_order_line_id, product_category, design, tile_category,
            size, surface, thickness, required_sqm, boxes_required, pallets_required,
            total_production_boxes, production_status, factory_id
          ) VALUES ${lineValueStrings.join(', ')}
        `, lineParams);
      }

      await client.query('COMMIT');
      return successResponse(res, newOs, 'Master Order Sheet created successfully', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    debugLogger.error('Error creating order sheet:', error);
    next(error);
  }
};

/**
 * POST /:id/sync-lines
 * Re-populates master_order_sheet_lines from the linked Proforma Order.
 * Useful when an order sheet was created before PO lines existed (stored in product_lines JSON).
 * Only inserts lines if none currently exist (safe to call multiple times).
 */
export const syncOrderSheetLines = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;    // Fetch the master order sheet
    const osRes = await req.db.query(
      `SELECT os.*, po.product_lines as po_product_lines, po.snapshot_data as po_snapshot_data
       FROM master_order_sheets os
       LEFT JOIN proforma_orders po ON os.proforma_order_id = po.id
       WHERE os.id = $1 AND (os.company_id = $2 OR $2 IS NULL)`,
      [id, companyId]
    );

    if (osRes.rows.length === 0) {
      return next(new AppError('Order sheet not found', 404));
    }
    const os = osRes.rows[0];

    // Check existing lines count
    const existingLinesRes = await req.db.query(
      `SELECT COUNT(*) as cnt FROM master_order_sheet_lines WHERE master_order_sheet_id = $1`,
      [id]
    );
    const existingCount = parseInt(existingLinesRes.rows[0].cnt, 10);

    if (existingCount > 0) {
      return successResponse(res, { lines_count: existingCount }, `Order sheet already has ${existingCount} line(s). No sync needed.`);
    }

    if (!os.proforma_order_id) {
      return next(new AppError('This order sheet has no linked Proforma Order to sync from', 400));
    }

    // Fetch lines from proforma_order_lines table first
    let poLines = [];
    const linesRes = await req.db.query(
      `SELECT * FROM proforma_order_lines WHERE proforma_order_id = $1 ORDER BY created_at ASC`,
      [os.proforma_order_id]
    );

    if (linesRes.rows.length > 0) {
      poLines = linesRes.rows;
    } else {
      // Fallback 1: snapshot_data
      if (os.po_snapshot_data) {
        try {
          const snap = typeof os.po_snapshot_data === 'string' ? JSON.parse(os.po_snapshot_data) : os.po_snapshot_data;
          poLines = snap.lines || snap.product_lines || snap.products || [];
        } catch (e) { /* ignore */ }
      }
      // Fallback 2: product_lines JSON column on PO
      if (poLines.length === 0 && os.po_product_lines) {
        try {
          const parsed = typeof os.po_product_lines === 'string' ? JSON.parse(os.po_product_lines) : os.po_product_lines;
          if (Array.isArray(parsed) && parsed.length > 0) poLines = parsed;
        } catch (e) { /* ignore */ }
      }
    }

    if (poLines.length === 0) {
      return next(new AppError('No product lines found in the linked Proforma Order. Please add products to the PO first.', 400));
    }

    // Auto-detect factory from supplier
    let autoFactoryId = null;
    if (os.supplier_name) {
      const factoryRes = await req.db.query(
        `SELECT id FROM factory_names WHERE name ILIKE $1 AND (company_id = $2 OR company_id IS NULL) LIMIT 1`,
        [os.supplier_name, companyId]
      );
      if (factoryRes.rows.length > 0) autoFactoryId = factoryRes.rows[0].id;
    }

    // Insert lines
    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      const lineValueStrings = [];
      const lineParams = [];
      let lpc = 1;

      for (const line of poLines) {
        lineValueStrings.push(`($${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, $${lpc++}, 'Not Started', $${lpc++})`);
        const productCategory = line.product_name || line.productName ||
          (typeof line.product === 'string' && line.product.trim() ? line.product : null) ||
          line.product?.name || line.name || line.product_category || 'Unknown Product';
        const design = line.design || line.color || line.design_name || line.description || '';
        const tileCategory = line.tile_category || line.tileCategory || line.category || '';
        const totalBoxes = parseInt(line.total_boxes || line.totalBoxes || line.boxes || 0) || 0;
        const totalPallets = parseInt(line.total_pallets || line.totalPallets || line.pallets || 0) || 0;
        const totalSqm = parseFloat(line.total_sqm || line.totalSqm || line.sqm_auto || line.sqmAuto || line.sqm || 0) || 0;

        lineParams.push(
          companyId, id, line.id || null,
          productCategory, design, tileCategory,
          line.size || '', line.surface || '', line.thickness || '',
          totalSqm, totalBoxes, totalPallets,
          totalBoxes,   // total_production_boxes
          autoFactoryId
        );
      }

      await client.query(`
        INSERT INTO master_order_sheet_lines (
          company_id, master_order_sheet_id, proforma_order_line_id, product_category, design, tile_category,
          size, surface, thickness, required_sqm, boxes_required, pallets_required,
          total_production_boxes, production_status, factory_id
        ) VALUES ${lineValueStrings.join(', ')}
      `, lineParams);

      await client.query('COMMIT');
      return successResponse(res, { lines_synced: poLines.length }, `Successfully synced ${poLines.length} product line(s) from Proforma Order`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    debugLogger.error('Error syncing order sheet lines:', error);
    next(error);
  }
};

export const getOrderSheetSummary = async (req, res, next) => {
  try {

    const companyId = req.companyFilter;
    // SECURITY: Use parameterized queries — no string interpolation of companyId
    const wherePrefix = companyId ? 'WHERE os.company_id = $1' : 'WHERE os.company_id IS NULL';
    const queryParams = companyId ? [companyId] : [];

    const summaryQuery = `
      SELECT
        COUNT(DISTINCT os.id) as total_orders,
        COALESCE(SUM(osl.total_production_boxes), 0) as total_required_boxes,
        COALESCE(SUM(osl.factory_allocated_boxes), 0) as total_allocated_boxes,
        COALESCE(SUM(osl.production_completed_boxes), 0) as total_produced_boxes,
        COALESCE(SUM(osl.qc_approved_boxes), 0) as total_qc_approved_boxes,
        COALESCE(SUM(osl.packed_boxes), 0) as total_packed_boxes,
        COALESCE(SUM(osl.loaded_boxes), 0) as total_loaded_boxes,
        COALESCE(SUM(osl.total_production_boxes) - SUM(osl.production_completed_boxes), 0) as total_pending_boxes,
        COUNT(DISTINCT CASE WHEN osl.production_status = 'Pending' OR osl.production_status = 'Not Started' THEN os.id END) as pending_orders,
        COUNT(DISTINCT CASE WHEN osl.production_status = 'In Production' THEN os.id END) as in_production_orders,
        COUNT(DISTINCT CASE WHEN osl.production_status = 'Production Completed' THEN os.id END) as completed_orders,
        COUNT(DISTINCT os.container_no) as loaded_containers
      FROM master_order_sheets os
      LEFT JOIN master_order_sheet_lines osl ON os.id = osl.master_order_sheet_id
      ${wherePrefix}
    `;

    const result = await req.db.query(summaryQuery, queryParams);
    const stats = result.rows[0];
    
    Object.keys(stats).forEach(key => {
      stats[key] = Number(stats[key] || 0);
    });

    stats.completion_percentage = stats.total_required_sqm > 0 
      ? Math.round((stats.total_produced_sqm / stats.total_required_sqm) * 100) 
      : 0;

    return successResponse(res, stats, 'Summary retrieved successfully');
  } catch (error) {
    if (error.code === '42P01') {
      return successResponse(res, {}, 'Order sheets table not initialized');
    }
    next(error);
  }
};

export const updateOrderSheet = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.companyFilter;
    const { lines, ...osUpdates } = req.body;
    
    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      // Update Order Sheet Header
      const allowedOsFields = ['priority', 'status', 'shipment_date', 'etd', 'container_no', 'booking_number', 'loading_status', 'internal_notes'];
      const osSetClauses = [];
      const osValues = [];
      let paramCount = 1;

      allowedOsFields.forEach(field => {
        if (osUpdates[field] !== undefined) {
          osSetClauses.push(`${field} = $${paramCount}`);
          osValues.push(normalizeEmptyToNull(osUpdates[field]));
          paramCount++;
        }
      });

      if (osSetClauses.length > 0) {
        osSetClauses.push(`updated_at = CURRENT_TIMESTAMP`);
        const whereClause = companyId ? `WHERE id = $${paramCount} AND company_id = $${paramCount + 1}` : `WHERE id = $${paramCount} AND company_id IS NULL`;
        osValues.push(id);
        if (companyId) osValues.push(companyId);

        await client.query(`
          UPDATE master_order_sheets 
          SET ${osSetClauses.join(', ')} 
          ${whereClause}
        `, osValues);
      }

      // Update Lines
      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          if (!line.id) continue;
          
          const allowedLineFields = [
            'produced_sqm', 'factory_id', 'status', 'qc_status', 'shade', 'caliber', 'grade',
            'boxes_produced', 'pallets_produced', 'factory_notes', 'delay_reason'
          ];
          
          const lineSetClauses = [];
          const lineValues = [];
          let lineParamCount = 1;

          allowedLineFields.forEach(field => {
            if (line[field] !== undefined) {
              lineSetClauses.push(`${field} = $${lineParamCount}`);
              lineValues.push(normalizeEmptyToNull(line[field]));
              lineParamCount++;
            }
          });

          if (lineSetClauses.length > 0) {
            lineSetClauses.push(`updated_at = CURRENT_TIMESTAMP`);
            lineValues.push(line.id);
            lineValues.push(id);
            
            await client.query(`
              UPDATE master_order_sheet_lines
              SET ${lineSetClauses.join(', ')}
              WHERE id = $${lineParamCount} AND master_order_sheet_id = $${lineParamCount + 1}
            `, lineValues);
          }
        }
        
        // Auto-update Master Order Sheet status based on lines
        const linesCheck = await client.query(`SELECT production_status, status, qc_status, total_production_boxes, production_completed_boxes FROM master_order_sheet_lines WHERE master_order_sheet_id = $1`, [id]);
        if (linesCheck.rows.length > 0) {
           const allCompleted = linesCheck.rows.every(l => {
              const pStatus = l.production_status || l.status;
              const completedBoxes = parseFloat(l.production_completed_boxes || 0);
              const reqBoxes = parseFloat(l.total_production_boxes || 0);
              return pStatus === 'Complete' || pStatus === 'Production Completed' || pStatus === 'Completed' || (reqBoxes > 0 && completedBoxes >= reqBoxes);
           });
           
           if (allCompleted) {
              await client.query(`UPDATE master_order_sheets SET status = 'Complete' WHERE id = $1`, [id]);
           } else {
              const someInProgress = linesCheck.rows.some(l => {
                 const pStatus = l.production_status || l.status;
                 return pStatus === 'In Production' || pStatus === 'Complete' || pStatus === 'Production Completed';
              });
              if (someInProgress) {
                 await client.query(`UPDATE master_order_sheets SET status = 'In Production' WHERE id = $1 AND status = 'Pending'`, [id]);
              }
           }
        }
      }

      await client.query('COMMIT');
      return successResponse(res, { message: 'Updated' }, 'Order sheet updated successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const exportFactoryAssignment = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    // SECURITY: Parameterized query — no string interpolation of companyId
    const wherePrefix = companyId ? 'WHERE os.company_id = $1' : 'WHERE os.company_id IS NULL';
    const queryParams = companyId ? [companyId] : [];

    const dataQuery = `
      SELECT 
        os.production_sheet_no,
        os.po_no,
        os.client_name,
        osl.product_category,
        osl.design,
        osl.size,
        osl.required_sqm,
        osl.produced_sqm,
        f.name as factory_name
      FROM master_order_sheets os
      JOIN master_order_sheet_lines osl ON os.id = osl.master_order_sheet_id
      LEFT JOIN factory_names f ON osl.factory_id = f.id
      ${wherePrefix}
      ORDER BY os.created_at DESC
    `;

    const dataRes = await req.db.query(dataQuery, queryParams);
    
    // Fallback if the excel export service expects the old format, we just pass the joined flat list
    const buffer = await generateFactoryAssignmentSheet(dataRes.rows);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + `Factory_Assignment_${new Date().getTime()}.xlsx`);
    
    return res.send(buffer);
  } catch (error) {
    debugLogger.error('Error exporting factory assignment:', error);
    next(error);
  }
};

export const bulkUpdateOrderSheets = async (req, res, next) => {
  return next(new AppError('Bulk update not supported in master sheet flow yet', 400));
};

export const getFactoryCapacity = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    // SECURITY: Use parameterized queries — no string interpolation of companyId
    const wherePrefix = companyId ? 'WHERE osl.company_id = $1' : 'WHERE osl.company_id IS NULL';
    const joinCondition = companyId ? 'osl.company_id = $1' : 'osl.company_id IS NULL';
    const queryParams = companyId ? [companyId] : [];

    const capacityQuery = `
      SELECT 
        f.id as factory_id,
        f.name as factory_name,
        COALESCE(SUM(osl.required_sqm), 0) as total_allocated,
        COALESCE(SUM(osl.produced_sqm), 0) as total_produced,
        (COALESCE(SUM(osl.required_sqm), 0) - COALESCE(SUM(osl.produced_sqm), 0)) as total_pending
      FROM factory_names f
      LEFT JOIN master_order_sheet_lines osl ON f.id = osl.factory_id AND (${joinCondition})
      GROUP BY f.id, f.name
      ORDER BY total_pending DESC, f.name ASC
    `;

    const result = await req.db.query(capacityQuery, queryParams);
    
    const data = result.rows.map(row => ({
      ...row,
      total_allocated: Number(row.total_allocated || 0),
      total_produced: Number(row.total_produced || 0),
      total_pending: Number(row.total_pending || 0)
    }));

    return successResponse(res, data, 'Factory capacity retrieved successfully');
  } catch (error) {
    debugLogger.error('Error fetching factory capacity:', error);
    next(error);
  }
};

export const addProductionLog = async (req, res, next) => {
  try {
    const { id, lineId } = req.params;
    const { update_date, boxes_produced, remarks, factory_id } = req.body;
    const companyId = req.companyFilter;

    if (!update_date || !boxes_produced) {
      return next(new AppError('Date and boxes_produced are required', 400));
    }

    const boxesProducedNum = parseFloat(boxes_produced);
    if (isNaN(boxesProducedNum) || boxesProducedNum <= 0) {
      return next(new AppError('boxes_produced must be a positive number', 400));
    }

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');

      // Lock the row for update
      const lineRes = await client.query(`
        SELECT osl.id, osl.total_production_boxes, osl.production_completed_boxes, os.company_id,
               osl.product_category, osl.design, osl.size, osl.surface, osl.thickness, os.po_no
        FROM master_order_sheet_lines osl
        JOIN master_order_sheets os ON osl.master_order_sheet_id = os.id
        WHERE osl.id = $1 AND os.id = $2 AND (os.company_id = $3 OR $3 IS NULL)
        FOR UPDATE
      `, [lineId, id, companyId]);

      if (lineRes.rows.length === 0) {
        throw new AppError('Order sheet line not found', 404);
      }

      const line = lineRes.rows[0];
      const newTotalCompleted = parseFloat(line.production_completed_boxes || 0) + boxesProducedNum;
      const totalProduction = parseFloat(line.total_production_boxes || 0);

      if (newTotalCompleted > totalProduction) {
        throw new AppError(`Production Completed (${newTotalCompleted}) cannot exceed Total Production (${totalProduction})`, 400);
      }

      let newStatus = 'In Production';
      let newQcStatus = line.qc_status || 'Pending';
      if (newTotalCompleted >= totalProduction && totalProduction > 0) {
        newStatus = 'Complete';
        newQcStatus = 'Complete';
      }

      const progressPercent = totalProduction > 0 ? ((newTotalCompleted / totalProduction) * 100).toFixed(2) : 0;

      await client.query(`
        INSERT INTO master_production_updates_history (
          master_order_sheet_id, master_order_sheet_line_id, factory_id, update_date, 
          boxes_produced, remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        id, lineId, factory_id || null, update_date, boxesProducedNum, remarks || null, req.user ? req.user.id : null
      ]);

      // --- Inventory Sync Integration ---
      try {
        await ensureInventorySchema({ query: async (q, v) => client.query(q, v) }); // passing a mock db object for client
        
        // 1. Try to find the matching product in the master products table
        const productMatchRes = await client.query(`
          SELECT id, sqm_per_box FROM products
          WHERE company_id = $1
            AND (name ILIKE $2 OR name ILIKE $3)
            AND size = $4
            AND surface = $5
            AND thickness = $6
          LIMIT 1
        `, [
          companyId, 
          line.product_category || '', 
          line.design || '', 
          line.size || '', 
          line.surface || '', 
          line.thickness || ''
        ]);

        let productId = null;
        let sqmPerBox = 0;
        
        if (productMatchRes.rows.length > 0) {
          productId = productMatchRes.rows[0].id;
          sqmPerBox = parseFloat(productMatchRes.rows[0].sqm_per_box || 0);
        } else {
          // Fallback: search by just name/category and size
          const fallbackRes = await client.query(`
            SELECT id, sqm_per_box FROM products
            WHERE company_id = $1
              AND (name ILIKE $2 OR name ILIKE $3)
              AND size = $4
            LIMIT 1
          `, [
            companyId, 
            line.product_category || '', 
            line.design || '', 
            line.size || ''
          ]);
          if (fallbackRes.rows.length > 0) {
            productId = fallbackRes.rows[0].id;
            sqmPerBox = parseFloat(fallbackRes.rows[0].sqm_per_box || 0);
          }
        }

        if (productId) {
          const sqmDelta = boxesProducedNum * sqmPerBox;
          const warehouseLocation = 'Main Warehouse'; // default location for auto-production

          let stockRes = await client.query(
            `SELECT * FROM stock_register WHERE company_id = $1 AND product_id = $2 AND warehouse_location = $3 FOR UPDATE`,
            [companyId, productId, warehouseLocation]
          );

          let stockId;
          if (stockRes.rows.length === 0) {
            const newStock = await client.query(
              `INSERT INTO stock_register (company_id, product_id, warehouse_location, quantity_boxes, quantity_sqm)
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [companyId, productId, warehouseLocation, boxesProducedNum, sqmDelta]
            );
            stockId = newStock.rows[0].id;
          } else {
            stockId = stockRes.rows[0].id;
            await client.query(
              `UPDATE stock_register 
               SET quantity_boxes = quantity_boxes + $1, 
                   quantity_sqm = quantity_sqm + $2, 
                   last_movement_at = NOW(), 
                   updated_at = NOW()
               WHERE id = $3`,
              [boxesProducedNum, sqmDelta, stockId]
            );
          }

          await client.query(
            `INSERT INTO stock_movements
             (company_id, stock_register_id, product_id, warehouse_location, movement_type, quantity_boxes, quantity_sqm, reference_type, reference_id, reference_no, notes, created_by)
             VALUES ($1, $2, $3, $4, 'PRODUCTION', $5, $6, 'ORDER_SHEET', $7, $8, $9, $10)`,
            [
              companyId, stockId, productId, warehouseLocation, 
              boxesProducedNum, sqmDelta, 
              id, line.po_no || 'OS', 
              remarks || 'Auto-synced from Production Log',
              req.user ? req.user.id : null
            ]
          );
        }
      } catch (invErr) {
        debugLogger.error('Error syncing production to inventory:', invErr);
        // Do not fail the transaction if inventory sync fails, just log it
      }
      // --- End Inventory Sync ---

      await client.query(`
        UPDATE master_order_sheet_lines
        SET production_completed_boxes = $1,
            production_progress_percent = $2,
            production_status = $3,
            qc_status = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [newTotalCompleted, progressPercent, newStatus, newQcStatus, lineId]);

      // Check if all lines are complete to update the overall order sheet status
      const allLinesRes = await client.query(`
        SELECT production_status, status FROM master_order_sheet_lines
        WHERE master_order_sheet_id = $1
      `, [id]);

      let allComplete = true;
      for (const l of allLinesRes.rows) {
        const s = l.production_status || l.status;
        if (s !== 'Complete' && s !== 'Production Completed' && s !== 'Completed') {
          allComplete = false;
        }
      }

      if (allComplete) {
        await client.query(`
          UPDATE master_order_sheets
          SET status = 'Complete', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [id]);
      } else {
        await client.query(`
          UPDATE master_order_sheets
          SET status = 'In Production', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status = 'Pending'
        `, [id]);
      }

      await client.query('COMMIT');

      return successResponse(res, null, 'Production log added successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    debugLogger.error('Error adding production log:', error);
    next(error);
  }
};

export const getProductionLogs = async (req, res, next) => {
  try {
    const { id, lineId } = req.params;
    const companyId = req.companyFilter;

    const query = `
      SELECT h.*, 
             u.name as user_name, 
             f.name as factory_name
      FROM master_production_updates_history h
      JOIN master_order_sheet_lines osl ON h.master_order_sheet_line_id = osl.id
      JOIN master_order_sheets os ON osl.master_order_sheet_id = os.id
      LEFT JOIN users u ON h.created_by = u.id
      LEFT JOIN factory_names f ON h.factory_id = f.id
      WHERE h.master_order_sheet_line_id = $1 
        AND os.id = $2 
        AND (os.company_id = $3 OR $3 IS NULL)
      ORDER BY h.update_date DESC, h.created_at DESC
    `;
    
    const result = await req.db.query(query, [lineId, id, companyId]);
    return successResponse(res, result.rows, 'Production logs retrieved successfully');
  } catch (error) {
    debugLogger.error('Error fetching production logs:', error);
    next(error);
  }
};

export const exportExcel = async (req, res, next) => {
  try {
    const { status, po_no, supplier_name, search, page, limit, factory_name, product, size, surface } = req.query;
    const companyId = req.companyFilter;

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (companyId) {
      conditions.push(`os.company_id = $${paramCount}`);
      values.push(companyId);
      paramCount++;
    } else {
      conditions.push(`os.company_id IS NULL`);
    }

    if (search) {
      conditions.push(`(os.po_no ILIKE $${paramCount} OR os.production_sheet_no ILIKE $${paramCount} OR os.supplier_name ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`os.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (supplier_name) {
      conditions.push(`os.supplier_name ILIKE $${paramCount}`);
      values.push(`%${supplier_name}%`);
      paramCount++;
    }

    if (po_no) {
      conditions.push(`os.po_no ILIKE $${paramCount}`);
      values.push(`%${po_no}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataQuery = `
      SELECT 
        os.*,
        (
          SELECT json_agg(json_build_object(
            'id', osl.id,
            'proforma_order_line_id', osl.proforma_order_line_id,
            'product_category', osl.product_category,
            'design', osl.design,
            'tile_category', osl.tile_category,
            'category', osl.tile_category,
            'size', osl.size,
            'surface', osl.surface,
            'thickness', osl.thickness,
            'required_sqm', osl.required_sqm,
            'produced_sqm', osl.produced_sqm,
            'factory_id', osl.factory_id,
            'factory_name', (SELECT name FROM factory_names WHERE id = osl.factory_id),
            'status', osl.status,
            'qc_status', osl.qc_status,
            'boxes_required', osl.boxes_required,
            'boxes_produced', osl.boxes_produced,
            'pallets_required', osl.pallets_required,
            'pallets_produced', osl.pallets_produced,
            'total_production_boxes', osl.total_production_boxes,
            'factory_allocated_boxes', osl.factory_allocated_boxes,
            'production_completed_boxes', osl.production_completed_boxes,
            'qc_approved_boxes', osl.qc_approved_boxes,
            'ready_for_packing_boxes', osl.ready_for_packing_boxes,
            'packed_boxes', osl.packed_boxes,
            'loaded_boxes', osl.loaded_boxes,
            'production_progress_percent', osl.production_progress_percent,
            'production_status', osl.production_status,
            'factory_notes', osl.factory_notes,
            'delay_reason', osl.delay_reason
          ) ORDER BY osl.created_at ASC)
          FROM master_order_sheet_lines osl
          WHERE osl.master_order_sheet_id = os.id
        ) as lines
      FROM master_order_sheets os
      ${whereClause}
      ORDER BY os.created_at DESC
    `;

    const dataRes = await req.db.query(dataQuery, values);
    let orderSheets = dataRes.rows;

    // Apply line-level filtering in JavaScript (server-side filtering of JSON lines)
    orderSheets = orderSheets.map(sheet => {
      if (!sheet.lines) return sheet;
      
      let lines = sheet.lines;
      
      if (factory_name) {
        lines = lines.filter(l => factory_name === 'unassigned' ? !l.factory_name : l.factory_name === factory_name);
      }
      if (product) {
        lines = lines.filter(l => {
          const pCat = l.product_category || 'Unknown Product';
          const des = l.design || '';
          const name = des ? `${pCat} - ${des}` : pCat;
          return name === product;
        });
      }
      if (size) {
        lines = lines.filter(l => l.size === size);
      }
      if (surface) {
        lines = lines.filter(l => (l.surface || l.finish) === surface);
      }
      
      return { ...sheet, lines };
    }).filter(sheet => {
      // After line-level filtering, we must hide order sheets that have NO lines matching the filter
      // (only if a line-level filter was ACTUALLY applied)
      const hasLineFilter = factory_name || product || size || surface;
      if (hasLineFilter && (!sheet.lines || sheet.lines.length === 0)) {
        return false;
      }
      return true;
    });

    const buffer = await generateMasterOrderSheetExcel(orderSheets);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Master_Order_Sheet_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    res.send(buffer);
  } catch (error) {
    debugLogger.error('Export Error:', error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.companyFilter;

    if (!status) {
      return next(new AppError('Status is required', 400));
    }

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');
      
      const updateQuery = `
        UPDATE master_order_sheets 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND (company_id = $3 OR company_id IS NULL)
        RETURNING *
      `;
      const result = await client.query(updateQuery, [status, id, companyId]);
      
      if (result.rows.length === 0) {
        throw new AppError('Order sheet not found or access denied', 404);
      }

      await client.query('COMMIT');
      return successResponse(res, result.rows[0], 'Status updated successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getFilterOptions = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;

    // Use parameterized queries to prevent SQL injection
    // companyId is from the verified JWT claim, but must still never be interpolated directly
    let osWhereSQL, linesWhereSQL, queryParams;

    if (companyId) {
      osWhereSQL    = 'WHERE os.company_id = $1';
      linesWhereSQL = 'WHERE company_id = $1';
      queryParams   = [companyId];
    } else {
      osWhereSQL    = 'WHERE os.company_id IS NULL';
      linesWhereSQL = 'WHERE company_id IS NULL';
      queryParams   = [];
    }

    const suppliersRes = await req.db.query(`SELECT DISTINCT supplier_name FROM master_order_sheets os ${osWhereSQL} AND supplier_name IS NOT NULL`, queryParams);
    const poNoRes      = await req.db.query(`SELECT DISTINCT po_no FROM master_order_sheets os ${osWhereSQL} AND po_no IS NOT NULL`, queryParams);

    const productsRes  = await req.db.query(`SELECT DISTINCT product_category, design FROM master_order_sheet_lines ${linesWhereSQL} AND product_category IS NOT NULL`, queryParams);
    const sizesRes     = await req.db.query(`SELECT DISTINCT size FROM master_order_sheet_lines ${linesWhereSQL} AND size IS NOT NULL`, queryParams);
    const surfacesRes  = await req.db.query(`SELECT DISTINCT surface FROM master_order_sheet_lines ${linesWhereSQL} AND surface IS NOT NULL`, queryParams);

    const suppliers = suppliersRes.rows.map(r => r.supplier_name).sort();
    const pis = poNoRes.rows.map(r => r.po_no).sort();
    const products = productsRes.rows.map(r => r.design ? `${r.product_category} - ${r.design}` : r.product_category).sort();
    const sizes = sizesRes.rows.map(r => r.size).sort();
    const surfaces = surfacesRes.rows.map(r => r.surface).sort();

    return successResponse(res, { suppliers, pis, products, sizes, surfaces }, 'Filter options retrieved');
  } catch (err) {
    if (err.code === '42P01') {
      return successResponse(res, { suppliers: [], pis: [], products: [], sizes: [], surfaces: [] }, 'Order sheets table not initialized');
    }
    next(err);
  }
};

