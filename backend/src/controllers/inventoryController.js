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
e x p o r t   c o n s t   c r e a t e G R N   =   a s y n c   ( r e q ,   r e s ,   n e x t )   = >   {  
     c o n s t   c l i e n t   =   a w a i t   r e q . d b . g e t C l i e n t ( ) ;  
     t r y   {  
         a w a i t   e n s u r e I n v e n t o r y S c h e m a ( r e q . d b ) ;  
         c o n s t   c o m p a n y I d   =   r e q . c o m p a n y F i l t e r   | |   r e q . u s e r . c o m p a n y I d ;  
         c o n s t   u s e r I d   =   r e q . u s e r . i d ;  
         c o n s t   {  
             g r n _ n u m b e r ,  
             g r n _ d a t e ,  
             s u p p l i e r _ n a m e ,  
             v e h i c l e _ n u m b e r ,  
             i n s p e c t o r _ n a m e ,  
             w e i g h b r i d g e _ t i c k e t ,  
             n o t e s ,  
             i t e m s   / /   A r r a y   o f   {   p r o d u c t _ i d ,   w a r e h o u s e _ l o c a t i o n ,   q u a n t i t y _ b o x e s ,   q u a n t i t y _ s q m   }  
         }   =   r e q . b o d y ;  
  
         i f   ( ! g r n _ n u m b e r   | |   ! i t e m s   | |   i t e m s . l e n g t h   = = =   0 )   {  
             r e t u r n   n e x t ( n e w   A p p E r r o r ( ' g r n _ n u m b e r   a n d   i t e m s   a r e   r e q u i r e d ' ,   4 0 0 ) ) ;  
         }  
  
         a w a i t   c l i e n t . q u e r y ( ' B E G I N ' ) ;  
  
         / /   1 .   C r e a t e   G R N   d o c u m e n t  
         l e t   t o t a l B o x e s   =   0 ;  
         f o r   ( c o n s t   i t e m   o f   i t e m s )   {  
               t o t a l B o x e s   + =   p a r s e F l o a t ( i t e m . q u a n t i t y _ b o x e s   | |   0 ) ;  
         }  
  
         c o n s t   g r n R e s   =   a w a i t   c l i e n t . q u e r y (  
             ` I N S E R T   I N T O   g r n _ d o c u m e n t s   ( c o m p a n y _ i d ,   g r n _ n u m b e r ,   g r n _ d a t e ,   s u p p l i e r _ n a m e ,   v e h i c l e _ n u m b e r ,   i n s p e c t o r _ n a m e ,   w e i g h b r i d g e _ t i c k e t ,   n o t e s ,   t o t a l _ b o x e s ,   c r e a t e d _ b y )  
               V A L U E S   ( $ 1 ,   $ 2 ,   $ 3 ,   $ 4 ,   $ 5 ,   $ 6 ,   $ 7 ,   $ 8 ,   $ 9 ,   $ 1 0 )   R E T U R N I N G   * ` ,  
             [ c o m p a n y I d ,   g r n _ n u m b e r ,   g r n _ d a t e   | |   n e w   D a t e ( ) ,   s u p p l i e r _ n a m e ,   v e h i c l e _ n u m b e r ,   i n s p e c t o r _ n a m e ,   w e i g h b r i d g e _ t i c k e t ,   n o t e s ,   t o t a l B o x e s ,   u s e r I d ]  
         ) ;  
  
         c o n s t   g r n   =   g r n R e s . r o w s [ 0 ] ;  
  
         / /   2 .   P r o c e s s   i t e m s   ( s t o c k   r e g i s t e r   +   m o v e m e n t s )  
         f o r   ( c o n s t   i t e m   o f   i t e m s )   {  
               c o n s t   q t y   =   p a r s e F l o a t ( i t e m . q u a n t i t y _ b o x e s ) ;  
               c o n s t   s q m   =   p a r s e F l o a t ( i t e m . q u a n t i t y _ s q m   | |   0 ) ;  
               c o n s t   w a r e h o u s e   =   i t e m . w a r e h o u s e _ l o c a t i o n   | |   ' M a i n   W a r e h o u s e ' ;  
                
               l e t   s t o c k R e s   =   a w a i t   c l i e n t . q u e r y (  
                   ` S E L E C T   *   F R O M   s t o c k _ r e g i s t e r   W H E R E   c o m p a n y _ i d   =   $ 1   A N D   p r o d u c t _ i d   =   $ 2   A N D   w a r e h o u s e _ l o c a t i o n   =   $ 3   F O R   U P D A T E ` ,  
                   [ c o m p a n y I d ,   i t e m . p r o d u c t _ i d ,   w a r e h o u s e ]  
               ) ;  
  
               i f   ( s t o c k R e s . r o w s . l e n g t h   = = =   0 )   {  
                   s t o c k R e s   =   a w a i t   c l i e n t . q u e r y (  
                       ` I N S E R T   I N T O   s t o c k _ r e g i s t e r   ( c o m p a n y _ i d ,   p r o d u c t _ i d ,   w a r e h o u s e _ l o c a t i o n ,   q u a n t i t y _ b o x e s ,   q u a n t i t y _ s q m )  
                         V A L U E S   ( $ 1 ,   $ 2 ,   $ 3 ,   0 ,   0 )   R E T U R N I N G   * ` ,  
                       [ c o m p a n y I d ,   i t e m . p r o d u c t _ i d ,   w a r e h o u s e ]  
                   ) ;  
               }  
                
               c o n s t   s t o c k   =   s t o c k R e s . r o w s [ 0 ] ;  
                
               a w a i t   c l i e n t . q u e r y (  
                   ` U P D A T E   s t o c k _ r e g i s t e r   S E T   q u a n t i t y _ b o x e s   =   q u a n t i t y _ b o x e s   +   $ 1 ,   q u a n t i t y _ s q m   =   q u a n t i t y _ s q m   +   $ 2 ,   u p d a t e d _ a t   =   N O W ( )   W H E R E   i d   =   $ 3 ` ,  
                   [ q t y ,   s q m ,   s t o c k . i d ]  
               ) ;  
  
               a w a i t   c l i e n t . q u e r y (  
                   ` I N S E R T   I N T O   s t o c k _ m o v e m e n t s   ( c o m p a n y _ i d ,   s t o c k _ r e g i s t e r _ i d ,   p r o d u c t _ i d ,   w a r e h o u s e _ l o c a t i o n ,   m o v e m e n t _ t y p e ,   q u a n t i t y _ b o x e s ,   q u a n t i t y _ s q m ,   r e f e r e n c e _ t y p e ,   r e f e r e n c e _ i d ,   r e f e r e n c e _ n o ,   c r e a t e d _ b y )  
                     V A L U E S   ( $ 1 ,   $ 2 ,   $ 3 ,   $ 4 ,   ' I N ' ,   $ 5 ,   $ 6 ,   ' G R N ' ,   $ 7 ,   $ 8 ,   $ 9 ) ` ,  
                   [ c o m p a n y I d ,   s t o c k . i d ,   i t e m . p r o d u c t _ i d ,   w a r e h o u s e ,   q t y ,   s q m ,   ' g r n _ d o c u m e n t s ' ,   g r n . i d ,   g r n _ n u m b e r ,   u s e r I d ]  
               ) ;  
         }  
  
         a w a i t   c l i e n t . q u e r y ( ' C O M M I T ' ) ;  
         r e s . s t a t u s ( 2 0 1 ) . j s o n ( {   s u c c e s s :   t r u e ,   d a t a :   g r n ,   m e s s a g e :   ' G R N   c r e a t e d   s u c c e s s f u l l y '   } ) ;  
     }   c a t c h   ( e r r o r )   {  
         a w a i t   c l i e n t . q u e r y ( ' R O L L B A C K ' ) ;  
         n e x t ( e r r o r ) ;  
     }   f i n a l l y   {  
         c l i e n t . r e l e a s e ( ) ;  
     }  
 } ;  
  
 e x p o r t   c o n s t   g e t G R N s   =   a s y n c   ( r e q ,   r e s ,   n e x t )   = >   {  
     t r y   {  
         a w a i t   e n s u r e I n v e n t o r y S c h e m a ( r e q . d b ) ;  
         c o n s t   c o m p a n y I d   =   r e q . c o m p a n y F i l t e r   | |   r e q . u s e r . c o m p a n y I d ;  
         c o n s t   r e s u l t   =   a w a i t   r e q . d b . q u e r y (  
             ` S E L E C T   *   F R O M   g r n _ d o c u m e n t s   W H E R E   c o m p a n y _ i d   =   $ 1   O R D E R   B Y   c r e a t e d _ a t   D E S C   L I M I T   1 0 0 ` ,  
             [ c o m p a n y I d ]  
         ) ;  
         r e s . j s o n ( {   s u c c e s s :   t r u e ,   d a t a :   r e s u l t . r o w s   } ) ;  
     }   c a t c h   ( e r r o r )   {  
         n e x t ( e r r o r ) ;  
     }  
 } ;  
  
 e x p o r t   c o n s t   g e t S t o c k L e d g e r   =   a s y n c   ( r e q ,   r e s ,   n e x t )   = >   {  
     t r y   {  
         a w a i t   e n s u r e I n v e n t o r y S c h e m a ( r e q . d b ) ;  
         c o n s t   c o m p a n y I d   =   r e q . c o m p a n y F i l t e r   | |   r e q . u s e r . c o m p a n y I d ;  
         c o n s t   {   p r o d u c t _ i d ,   w a r e h o u s e _ l o c a t i o n   }   =   r e q . q u e r y ;  
  
         i f   ( ! p r o d u c t _ i d )   r e t u r n   n e x t ( n e w   A p p E r r o r ( ' p r o d u c t _ i d   i s   r e q u i r e d   f o r   l e d g e r ' ,   4 0 0 ) ) ;  
  
         l e t   s q l   =   \ `  
             S E L E C T   s m . * ,   p . n a m e   A S   p r o d u c t _ n a m e    
             F R O M   s t o c k _ m o v e m e n t s   s m  
             L E F T   J O I N   p r o d u c t s   p   O N   p . i d   =   s m . p r o d u c t _ i d  
             W H E R E   s m . c o m p a n y _ i d   =   $ 1   A N D   s m . p r o d u c t _ i d   =   $ 2  
         \ ` ;  
         c o n s t   p a r a m s   =   [ c o m p a n y I d ,   p r o d u c t _ i d ] ;  
  
         i f   ( w a r e h o u s e _ l o c a t i o n )   {  
             s q l   + =   '   A N D   s m . w a r e h o u s e _ l o c a t i o n   =   $ 3 ' ;  
             p a r a m s . p u s h ( w a r e h o u s e _ l o c a t i o n ) ;  
         }  
  
         s q l   + =   '   O R D E R   B Y   s m . c r e a t e d _ a t   A S C ' ;  
  
         c o n s t   r e s u l t   =   a w a i t   r e q . d b . q u e r y ( s q l ,   p a r a m s ) ;  
  
         l e t   r u n n i n g B a l a n c e   =   0 ;  
         c o n s t   l e d g e r   =   r e s u l t . r o w s . m a p ( r o w   = >   {  
             i f   ( [ ' I N ' ,   ' P R O D U C T I O N ' ,   ' A D J U S T M E N T ' ] . i n c l u d e s ( r o w . m o v e m e n t _ t y p e ) )   {  
                   r u n n i n g B a l a n c e   + =   p a r s e F l o a t ( r o w . q u a n t i t y _ b o x e s ) ;  
             }   e l s e   {  
                   r u n n i n g B a l a n c e   - =   p a r s e F l o a t ( r o w . q u a n t i t y _ b o x e s ) ;  
             }  
             r e t u r n   {   . . . r o w ,   b a l a n c e :   r u n n i n g B a l a n c e   } ;  
         } ) ;  
  
         r e s . j s o n ( {   s u c c e s s :   t r u e ,   d a t a :   l e d g e r . r e v e r s e ( )   } ) ;  
     }   c a t c h ( e r r o r )   {  
         n e x t ( e r r o r ) ;  
     }  
 } ;  
  
 e x p o r t   c o n s t   c r e a t e W a r e h o u s e   =   a s y n c   ( r e q ,   r e s ,   n e x t )   = >   {  
     t r y   {  
         c o n s t   c o m p a n y I d   =   r e q . c o m p a n y F i l t e r   | |   r e q . u s e r . c o m p a n y I d ;  
         c o n s t   {   n a m e ,   c o d e ,   a d d r e s s   }   =   r e q . b o d y ;  
         i f   ( ! n a m e )   r e t u r n   n e x t ( n e w   A p p E r r o r ( ' W a r e h o u s e   n a m e   i s   r e q u i r e d ' ,   4 0 0 ) ) ;  
          
         c o n s t   r e s u l t   =   a w a i t   r e q . d b . q u e r y (  
             ' I N S E R T   I N T O   w a r e h o u s e _ l o c a t i o n s   ( c o m p a n y _ i d ,   n a m e ,   c o d e ,   a d d r e s s ,   i s _ a c t i v e )   V A L U E S   ( $ 1 ,   $ 2 ,   $ 3 ,   $ 4 ,   t r u e )   R E T U R N I N G   * ' ,  
             [ c o m p a n y I d ,   n a m e ,   c o d e ,   a d d r e s s ]  
         ) ;  
         r e s . s t a t u s ( 2 0 1 ) . j s o n ( {   s u c c e s s :   t r u e ,   d a t a :   r e s u l t . r o w s [ 0 ]   } ) ;  
     }   c a t c h   ( e r r o r )   {  
         n e x t ( e r r o r ) ;  
     }  
 } ;  
  
 e x p o r t   c o n s t   u p d a t e W a r e h o u s e   =   a s y n c   ( r e q ,   r e s ,   n e x t )   = >   {  
     t r y   {  
         c o n s t   c o m p a n y I d   =   r e q . c o m p a n y F i l t e r   | |   r e q . u s e r . c o m p a n y I d ;  
         c o n s t   {   i d   }   =   r e q . p a r a m s ;  
         c o n s t   {   n a m e ,   c o d e ,   a d d r e s s ,   i s _ a c t i v e   }   =   r e q . b o d y ;  
          
         c o n s t   r e s u l t   =   a w a i t   r e q . d b . q u e r y (  
             ' U P D A T E   w a r e h o u s e _ l o c a t i o n s   S E T   n a m e = $ 1 ,   c o d e = $ 2 ,   a d d r e s s = $ 3 ,   i s _ a c t i v e = $ 4 ,   u p d a t e d _ a t = N O W ( )   W H E R E   i d = $ 5   A N D   c o m p a n y _ i d = $ 6   R E T U R N I N G   * ' ,  
             [ n a m e ,   c o d e ,   a d d r e s s ,   i s _ a c t i v e ,   i d ,   c o m p a n y I d ]  
         ) ;  
         r e s . j s o n ( {   s u c c e s s :   t r u e ,   d a t a :   r e s u l t . r o w s [ 0 ]   } ) ;  
     }   c a t c h   ( e r r o r )   {  
         n e x t ( e r r o r ) ;  
     }  
 } ;  
 