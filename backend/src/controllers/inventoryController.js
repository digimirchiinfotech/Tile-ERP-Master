/**
 * Inventory controller â€” stock register, movements, reservations.
 */

import { AppError } from '../middleware/errorHandler.js';
import { ensureInventorySchema } from '../utils/inventorySchema.js';

const getAvailableBoxes = (row) => Math.max(0, parseFloat(row.quantity_boxes || 0) - parseFloat(row.reserved_boxes || 0));

export const getStockRegister = async (req, res, next) => {
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const { warehouse, product_id, search, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    let sql = `
      SELECT sr.*, p.name AS product_name, p.product_code, p.size, p.surface, p.thickness, p.sku
      FROM stock_register sr
      LEFT JOIN products p ON p.id = sr.product_id AND p.company_id = sr.company_id
      WHERE sr.company_id = $1
    `;
    const params = [companyId];
    let idx = 2;

    if (warehouse) {
      sql += ` AND sr.warehouse_location = $${idx++}`;
      params.push(warehouse);
    }
    if (product_id) {
      sql += ` AND sr.product_id = $${idx++}`;
      params.push(product_id);
    }
    if (search) {
      sql += ` AND (p.name ILIKE $${idx} OR p.product_code ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.size ILIKE $${idx} OR p.surface ILIKE $${idx} OR p.thickness ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` ORDER BY sr.updated_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(parseInt(limit, 10), offset);

    const result = await req.db.query(sql, params);
    const items = result.rows.map((row) => ({
      ...row,
      available_boxes: getAvailableBoxes(row),
    }));

    res.json({ success: true, data: { items, page: parseInt(page, 10), limit: parseInt(limit, 10) } });
  } catch (error) {
    next(error);
  }
};

export const getStockSummary = async (req, res, next) => {
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;

    const result = await req.db.query(
      `SELECT
         COUNT(*) AS total_skus,
         COALESCE(SUM(quantity_boxes), 0) AS total_boxes,
         COALESCE(SUM(quantity_sqm), 0) AS total_sqm,
         COALESCE(SUM(reserved_boxes), 0) AS total_reserved,
         COALESCE(SUM(quantity_boxes - reserved_boxes), 0) AS total_available
       FROM stock_register WHERE company_id = $1`,
      [companyId]
    );

    const summary = result.rows[0] || {};
    res.json({ 
      success: true, 
      data: {
        total_skus: parseInt(summary.total_skus || 0, 10),
        total_boxes: parseFloat(summary.total_boxes || 0),
        total_sqm: parseFloat(summary.total_sqm || 0),
        total_reserved: parseFloat(summary.total_reserved || 0),
        total_available: parseFloat(summary.total_available || 0)
      } 
    });
  } catch (error) {
    next(error);
  }
};

export const recordStockMovement = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const userId = req.user.id;
    const {
      product_id,
      warehouse_location = 'Main Warehouse',
      movement_type,
      quantity_boxes,
      quantity_sqm = 0,
      reference_type,
      reference_id,
      reference_no,
      notes,
    } = req.body;

    if (!product_id || !movement_type || quantity_boxes == null) {
      return next(new AppError('product_id, movement_type, and quantity_boxes are required', 400));
    }

    const qty = parseFloat(quantity_boxes);
    if (isNaN(qty) || qty <= 0) {
      return next(new AppError('quantity_boxes must be a positive number', 400));
    }

    const allowedTypes = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'PRODUCTION', 'DISPATCH'];
    if (!allowedTypes.includes(movement_type)) {
      return next(new AppError(`Invalid movement_type. Allowed: ${allowedTypes.join(', ')}`, 400));
    }

    await client.query('BEGIN');

    // Phase 7: Validate Warehouse Location exists
    const warehouseCheck = await client.query(
      `SELECT id FROM warehouse_locations WHERE name = $1 AND company_id = $2 AND is_active = true`,
      [warehouse_location, companyId]
    );
    if (warehouseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError(`Invalid or inactive warehouse location: ${warehouse_location}`, 400));
    }

    const productRes = await client.query(
      `SELECT sqm_per_box FROM products WHERE id = $1 AND company_id = $2`,
      [product_id, companyId]
    );
    const productSqm = parseFloat(productRes.rows[0]?.sqm_per_box || 0);
    const actualQuantitySqm = quantity_sqm ? parseFloat(quantity_sqm) : (qty * productSqm);

    let stockRes = await client.query(
      `SELECT * FROM stock_register WHERE company_id = $1 AND product_id = $2 AND warehouse_location = $3 FOR UPDATE`,
      [companyId, product_id, warehouse_location]
    );

    if (stockRes.rows.length === 0 && ['OUT', 'DISPATCH', 'TRANSFER'].includes(movement_type)) {
      await client.query('ROLLBACK');
      return next(new AppError('Insufficient stock â€” no stock record exists for this product/warehouse', 400));
    }

    if (stockRes.rows.length === 0) {
      stockRes = await client.query(
        `INSERT INTO stock_register (company_id, product_id, warehouse_location, quantity_boxes, quantity_sqm)
         VALUES ($1, $2, $3, 0, 0) RETURNING *`,
        [companyId, product_id, warehouse_location]
      );
    }

    const stock = stockRes.rows[0];
    const currentQty = parseFloat(stock.quantity_boxes || 0);
    const currentSqm = parseFloat(stock.quantity_sqm || 0);
    const sqmDelta = actualQuantitySqm;

    let newQty = currentQty;
    if (['IN', 'PRODUCTION', 'ADJUSTMENT'].includes(movement_type)) {
      newQty = currentQty + qty;
    } else {
      newQty = currentQty - qty;
    }

    if (newQty < 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Negative stock not allowed', 400));
    }

    const available = currentQty - parseFloat(stock.reserved_boxes || 0);
    if (['OUT', 'DISPATCH', 'TRANSFER'].includes(movement_type) && qty > available) {
      await client.query('ROLLBACK');
      return next(new AppError(`Insufficient available stock. Available: ${available} boxes`, 400));
    }

    const newSqm = movement_type === 'IN' || movement_type === 'PRODUCTION'
      ? currentSqm + sqmDelta
      : Math.max(0, currentSqm - sqmDelta);

    await client.query(
      `UPDATE stock_register SET quantity_boxes = $1, quantity_sqm = $2, last_movement_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [newQty, newSqm, stock.id]
    );

    const movementRes = await client.query(
      `INSERT INTO stock_movements
       (company_id, stock_register_id, product_id, warehouse_location, movement_type, quantity_boxes, quantity_sqm,
        reference_type, reference_id, reference_no, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [companyId, stock.id, product_id, warehouse_location, movement_type, qty, sqmDelta,
        reference_type || null, reference_id || null, reference_no || null, notes || null, userId]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: movementRes.rows[0], message: 'Stock movement recorded' });
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));
    next(error);
  } finally {
    client.release();
  }
};

export const createReservation = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const userId = req.user.id;
    const {
      product_id,
      warehouse_location = 'Main Warehouse',
      reserved_boxes,
      reserved_sqm = 0,
      reference_type,
      reference_id,
      reference_no,
    } = req.body;

    if (!product_id || !reserved_boxes || !reference_type) {
      return next(new AppError('product_id, reserved_boxes, and reference_type are required', 400));
    }

    const qty = parseFloat(reserved_boxes);
    if (isNaN(qty) || qty <= 0) {
      return next(new AppError('reserved_boxes must be positive', 400));
    }

    await client.query('BEGIN');

    const stockRes = await client.query(
      `SELECT * FROM stock_register WHERE company_id = $1 AND product_id = $2 AND warehouse_location = $3 FOR UPDATE`,
      [companyId, product_id, warehouse_location]
    );

    if (stockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('No stock available to reserve', 400));
    }

    const stock = stockRes.rows[0];
    const available = getAvailableBoxes(stock);
    if (qty > available) {
      await client.query('ROLLBACK');
      return next(new AppError(`Cannot reserve ${qty} boxes. Only ${available} available.`, 400));
    }

    await client.query(
      `UPDATE stock_register SET reserved_boxes = reserved_boxes + $1, updated_at = NOW() WHERE id = $2`,
      [qty, stock.id]
    );

    const resv = await client.query(
      `INSERT INTO stock_reservations
       (company_id, stock_register_id, product_id, reserved_boxes, reserved_sqm, reference_type, reference_id, reference_no, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [companyId, stock.id, product_id, qty, reserved_sqm, reference_type, reference_id || null, reference_no || null, userId]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: resv.rows[0], message: 'Stock reserved' });
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));
    next(error);
  } finally {
    client.release();
  }
};

export const releaseReservation = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const { id } = req.params;

    await client.query('BEGIN');

    const resvRes = await client.query(
      `SELECT * FROM stock_reservations WHERE id = $1 AND company_id = $2 AND status = 'Active' FOR UPDATE`,
      [id, companyId]
    );

    if (resvRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Active reservation not found', 404));
    }

    const resv = resvRes.rows[0];

    await client.query(
      `UPDATE stock_register SET reserved_boxes = GREATEST(0, reserved_boxes - $1), updated_at = NOW() WHERE id = $2`,
      [resv.reserved_boxes, resv.stock_register_id]
    );

    await client.query(
      `UPDATE stock_reservations SET status = 'Released', released_at = NOW() WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Reservation released' });
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));
    next(error);
  } finally {
    client.release();
  }
};

export const getMovements = async (req, res, next) => {
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const { product_id, limit = 50 } = req.query;

    let sql = `SELECT sm.*, p.name AS product_name FROM stock_movements sm
               LEFT JOIN products p ON p.id = sm.product_id
               WHERE sm.company_id = $1`;
    const params = [companyId];

    if (product_id) {
      sql += ' AND sm.product_id = $2';
      params.push(product_id);
    }
    sql += ' ORDER BY sm.created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit, 10));

    const result = await req.db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getReservations = async (req, res, next) => {
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const result = await req.db.query(
      `SELECT sr.*, p.name AS product_name FROM stock_reservations sr
       LEFT JOIN products p ON p.id = sr.product_id
       WHERE sr.company_id = $1 AND sr.status = 'Active'
       ORDER BY sr.created_at DESC`,
      [companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getWarehouses = async (req, res, next) => {
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const result = await req.db.query(
      'SELECT * FROM warehouse_locations WHERE company_id = $1 ORDER BY name ASC',
      [companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getStockBalance = async (req, res, next) => {
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const result = await req.db.query(
      'SELECT sr.*, p.name AS product_name, p.sku FROM stock_register sr LEFT JOIN products p ON p.id = sr.product_id WHERE sr.company_id = $1 ORDER BY p.name ASC',
      [companyId]
    );
    const items = result.rows.map(r => ({ ...r, boxes_available: getAvailableBoxes(r) }));
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const createGRN = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const userId = req.user.id;
    const {
      grn_number,
      grn_date,
      supplier_name,
      vehicle_number,
      inspector_name,
      weighbridge_ticket,
      notes,
      items // Array of { product_id, warehouse_location, quantity_boxes, quantity_sqm }
    } = req.body;

    if (!grn_number || !items || items.length === 0) {
      return next(new AppError('grn_number and items are required', 400));
    }

    await client.query('BEGIN');

    // 1. Create GRN document
    let totalBoxes = 0;
    for (const item of items) {
       totalBoxes += parseFloat(item.quantity_boxes || 0);
    }

    const grnRes = await client.query(
      `INSERT INTO grn_documents (company_id, grn_number, grn_date, supplier_name, vehicle_number, inspector_name, weighbridge_ticket, notes, total_boxes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [companyId, grn_number, grn_date || new Date(), supplier_name, vehicle_number, inspector_name, weighbridge_ticket, notes, totalBoxes, userId]
    );

    const grn = grnRes.rows[0];

    // 2. Process items (stock register + movements)
    for (const item of items) {
       const qty = parseFloat(item.quantity_boxes);
       const sqm = parseFloat(item.quantity_sqm || 0);
       const warehouse = item.warehouse_location || 'Main Warehouse';
       
       let stockRes = await client.query(
         `SELECT * FROM stock_register WHERE company_id = $1 AND product_id = $2 AND warehouse_location = $3 FOR UPDATE`,
         [companyId, item.product_id, warehouse]
       );

       if (stockRes.rows.length === 0) {
         stockRes = await client.query(
           `INSERT INTO stock_register (company_id, product_id, warehouse_location, quantity_boxes, quantity_sqm)
            VALUES ($1, $2, $3, 0, 0) RETURNING *`,
           [companyId, item.product_id, warehouse]
         );
       }
       
       const stock = stockRes.rows[0];
       
       await client.query(
         `UPDATE stock_register SET quantity_boxes = quantity_boxes + $1, quantity_sqm = quantity_sqm + $2, updated_at = NOW() WHERE id = $3`,
         [qty, sqm, stock.id]
       );

       await client.query(
         `INSERT INTO stock_movements (company_id, stock_register_id, product_id, warehouse_location, movement_type, quantity_boxes, quantity_sqm, reference_type, reference_id, reference_no, created_by)
          VALUES ($1, $2, $3, $4, 'IN', $5, $6, 'GRN', $7, $8, $9)`,
         [companyId, stock.id, item.product_id, warehouse, qty, sqm, 'grn_documents', grn.id, grn_number, userId]
       );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: grn, message: 'GRN created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getGRNs = async (req, res, next) => {
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const result = await req.db.query(
      `SELECT * FROM grn_documents WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getStockLedger = async (req, res, next) => {
  try {
    await ensureInventorySchema(req.db);
    const companyId = req.companyFilter || req.user.companyId;
    const { product_id, warehouse_location } = req.query;

    if (!product_id) return next(new AppError('product_id is required for ledger', 400));

    let sql = \`
      SELECT sm.*, p.name AS product_name 
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      WHERE sm.company_id = $1 AND sm.product_id = $2
    \`;
    const params = [companyId, product_id];

    if (warehouse_location) {
      sql += ' AND sm.warehouse_location = $3';
      params.push(warehouse_location);
    }

    sql += ' ORDER BY sm.created_at ASC';

    const result = await req.db.query(sql, params);

    let runningBalance = 0;
    const ledger = result.rows.map(row => {
      if (['IN', 'PRODUCTION', 'ADJUSTMENT'].includes(row.movement_type)) {
         runningBalance += parseFloat(row.quantity_boxes);
      } else {
         runningBalance -= parseFloat(row.quantity_boxes);
      }
      return { ...row, balance: runningBalance };
    });

    res.json({ success: true, data: ledger.reverse() });
  } catch(error) {
    next(error);
  }
};

export const createWarehouse = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user.companyId;
    const { name, code, address } = req.body;
    if (!name) return next(new AppError('Warehouse name is required', 400));
    
    const result = await req.db.query(
      'INSERT INTO warehouse_locations (company_id, name, code, address, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
      [companyId, name, code, address]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateWarehouse = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user.companyId;
    const { id } = req.params;
    const { name, code, address, is_active } = req.body;
    
    const result = await req.db.query(
      'UPDATE warehouse_locations SET name=$1, code=$2, address=$3, is_active=$4, updated_at=NOW() WHERE id=$5 AND company_id=$6 RETURNING *',
      [name, code, address, is_active, id, companyId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
