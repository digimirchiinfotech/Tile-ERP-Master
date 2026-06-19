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
import { logAction } from '../services/auditService.js';
import { 
  successResponse, 
  generateSequentialId, 
  getPagination, 
  paginationResponse,
  normalizeEmptyToNull 
} from '../utils/helpers.js';

const cleanAndUppercase = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return val;
  const cleaned = val.trim().replace(/\s+/g, ' ');
  return cleaned === '' ? null : cleaned.toUpperCase();
};

export const getAll = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      category, 
      status, 
      surface 
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        conditions.push(`company_id IS NULL`);
      } else {
        conditions.push(`company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR product_code ILIKE $${paramCount} OR item_ref ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (category) {
      conditions.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (surface) {
      conditions.push(`surface = $${paramCount}`);
      values.push(surface);
      paramCount++;
    }

    // Exclude soft-deleted records unless explicitly requesting deleted records
    if (status !== 'Deleted') {
      conditions.push(`status != 'Deleted'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Include images in list view for table display
    const columns = `id, company_id, product_code, item_ref, name, description, category, size, surface, thickness, 
                     sqm_per_box, boxes_per_pallet, box_weight, factory_price, selling_price, hs_code, status, 
                     factory_name, factory_product_name, company_product_name, catalogue_name, application, 
                     box_pcs, default_boxes_per_kathali, default_per_box_weight, default_per_pallet_weight, 
                     base_price, margin, images, created_at, updated_at`;
    
    const result = await req.db.query(
      `SELECT ${columns} FROM products 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Products retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    // Optimized query: Select specific columns instead of SELECT *
    const columns = `id, company_id, product_code, item_ref, name, description, category, size, surface, thickness, 
                     sqm_per_box, boxes_per_pallet, box_weight, factory_price, selling_price, hs_code, status, 
                     factory_name, factory_product_name, company_product_name, catalogue_name, application, 
                     box_pcs, default_boxes_per_kathali, default_per_box_weight, default_per_pallet_weight, 
                     base_price, margin, images, pdfs, created_at, updated_at`;
    
    const result = await req.db.query(
      `SELECT ${columns} FROM products ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Product not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Product retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const {
      product_code, item_ref, name, description, category, size, surface,
      thickness, sqm_per_box, boxes_per_pallet, box_weight, factory_price,
      selling_price, hs_code, images = [], status = 'Active',
      factory_name, factory_product_name, company_product_name, catalogue_name,
      application, box_pcs, default_boxes_per_kathali, default_per_box_weight,
      default_per_pallet_weight, base_price, margin, pdfs = []
    } = req.body;

    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      client.release();
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    await client.query('BEGIN');

    const finalProductCode = product_code || await generateSequentialId('PROD', 'products', 'product_code', companyId, req.db);

    const existingProduct = await client.query(
      'SELECT id FROM products WHERE product_code = $1 AND company_id = $2',
      [finalProductCode, companyId]
    );

    if (existingProduct.rows.length > 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Product with this code already exists', 400));
    }

    const result = await client.query(
      `INSERT INTO products 
       (company_id, product_code, item_ref, name, description, category, size, surface,
        thickness, sqm_per_box, boxes_per_pallet, box_weight, factory_price,
        selling_price, hs_code, images, status, factory_name, factory_product_name,
        company_product_name, catalogue_name, application, box_pcs, 
        default_boxes_per_kathali, default_per_box_weight, default_per_pallet_weight,
        base_price, margin, pdfs, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, finalProductCode, normalizeEmptyToNull(item_ref), cleanAndUppercase(name), normalizeEmptyToNull(description),
        cleanAndUppercase(category), normalizeEmptyToNull(size), cleanAndUppercase(surface), cleanAndUppercase(thickness),
        normalizeEmptyToNull(sqm_per_box), normalizeEmptyToNull(boxes_per_pallet), normalizeEmptyToNull(box_weight),
        normalizeEmptyToNull(factory_price), normalizeEmptyToNull(selling_price), normalizeEmptyToNull(hs_code),
        JSON.stringify(images || []), status || 'Active', cleanAndUppercase(factory_name), cleanAndUppercase(factory_product_name),
        cleanAndUppercase(company_product_name), cleanAndUppercase(catalogue_name), cleanAndUppercase(application),
        normalizeEmptyToNull(box_pcs), normalizeEmptyToNull(default_boxes_per_kathali), normalizeEmptyToNull(default_per_box_weight),
        normalizeEmptyToNull(default_per_pallet_weight), normalizeEmptyToNull(base_price), normalizeEmptyToNull(margin),
        JSON.stringify(pdfs || []), req.user.id
      ]
    );

    await client.query('COMMIT');

    // Audit Log
    logAction({
      userId: req.user.id, companyId: req.companyFilter, action: 'CREATE', entityType: 'product',
      entityId: result.rows[0].id, newValue: { product_code: result.rows[0].product_code, name: result.rows[0].name },
      ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
    }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

    return successResponse(
      res,
      result.rows[0],
      'Product created successfully',
      201
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const update = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const { id } = req.params;
    const {
      product_code, item_ref, name, description, category, size, surface,
      thickness, sqm_per_box, boxes_per_pallet, box_weight, factory_price,
      selling_price, hs_code, images, status,
      factory_name, factory_product_name, company_product_name, catalogue_name,
      application, box_pcs, default_boxes_per_kathali, default_per_box_weight,
      default_per_pallet_weight, base_price, margin, pdfs
    } = req.body;

    await client.query('BEGIN');

    let whereConditions = 'WHERE id = $1';
    let checkParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        checkParams.push(req.companyFilter);
      }
    }

    const existingProduct = await client.query(
      `SELECT id FROM products ${whereConditions}`,
      checkParams
    );

    if (existingProduct.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Product not found', 404));
    }

    if (product_code) {
      const codeCheck = await client.query(
        'SELECT id FROM products WHERE product_code = $1 AND id != $2',
        [product_code, id]
      );

      if (codeCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return next(new AppError('Product code already in use', 400));
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (product_code) {
      updates.push(`product_code = $${paramCount}`);
      values.push(product_code);
      paramCount++;
    }

    if (item_ref !== undefined) {
      updates.push(`item_ref = $${paramCount}`);
      values.push(normalizeEmptyToNull(item_ref));
      paramCount++;
    }

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(cleanAndUppercase(name));
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(normalizeEmptyToNull(description));
      paramCount++;
    }

    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(cleanAndUppercase(category));
      paramCount++;
    }

    if (size !== undefined) {
      updates.push(`size = $${paramCount}`);
      values.push(normalizeEmptyToNull(size));
      paramCount++;
    }

    if (surface !== undefined) {
      updates.push(`surface = $${paramCount}`);
      values.push(cleanAndUppercase(surface));
      paramCount++;
    }

    if (thickness !== undefined) {
      updates.push(`thickness = $${paramCount}`);
      values.push(cleanAndUppercase(thickness));
      paramCount++;
    }

    if (sqm_per_box !== undefined) {
      updates.push(`sqm_per_box = $${paramCount}`);
      values.push(normalizeEmptyToNull(sqm_per_box));
      paramCount++;
    }

    if (boxes_per_pallet !== undefined) {
      updates.push(`boxes_per_pallet = $${paramCount}`);
      values.push(normalizeEmptyToNull(boxes_per_pallet));
      paramCount++;
    }

    if (box_weight !== undefined) {
      updates.push(`box_weight = $${paramCount}`);
      values.push(normalizeEmptyToNull(box_weight));
      paramCount++;
    }

    if (factory_price !== undefined) {
      updates.push(`factory_price = $${paramCount}`);
      values.push(normalizeEmptyToNull(factory_price));
      paramCount++;
    }

    if (selling_price !== undefined) {
      updates.push(`selling_price = $${paramCount}`);
      values.push(normalizeEmptyToNull(selling_price));
      paramCount++;
    }

    if (hs_code !== undefined) {
      updates.push(`hs_code = $${paramCount}`);
      values.push(normalizeEmptyToNull(hs_code));
      paramCount++;
    }

    if (images) {
      updates.push(`images = $${paramCount}`);
      values.push(JSON.stringify(images));
      paramCount++;
    }

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (factory_name !== undefined) {
      updates.push(`factory_name = $${paramCount}`);
      values.push(cleanAndUppercase(factory_name));
      paramCount++;
    }

    if (factory_product_name !== undefined) {
      updates.push(`factory_product_name = $${paramCount}`);
      values.push(cleanAndUppercase(factory_product_name));
      paramCount++;
    }

    if (company_product_name !== undefined) {
      updates.push(`company_product_name = $${paramCount}`);
      values.push(cleanAndUppercase(company_product_name));
      paramCount++;
    }

    if (catalogue_name !== undefined) {
      updates.push(`catalogue_name = $${paramCount}`);
      values.push(cleanAndUppercase(catalogue_name));
      paramCount++;
    }

    if (application !== undefined) {
      updates.push(`application = $${paramCount}`);
      values.push(cleanAndUppercase(application));
      paramCount++;
    }

    if (box_pcs !== undefined) {
      updates.push(`box_pcs = $${paramCount}`);
      values.push(normalizeEmptyToNull(box_pcs));
      paramCount++;
    }

    if (default_boxes_per_kathali !== undefined) {
      updates.push(`default_boxes_per_kathali = $${paramCount}`);
      values.push(normalizeEmptyToNull(default_boxes_per_kathali));
      paramCount++;
    }

    if (default_per_box_weight !== undefined) {
      updates.push(`default_per_box_weight = $${paramCount}`);
      values.push(normalizeEmptyToNull(default_per_box_weight));
      paramCount++;
    }

    if (default_per_pallet_weight !== undefined) {
      updates.push(`default_per_pallet_weight = $${paramCount}`);
      values.push(normalizeEmptyToNull(default_per_pallet_weight));
      paramCount++;
    }

    if (base_price !== undefined) {
      updates.push(`base_price = $${paramCount}`);
      values.push(normalizeEmptyToNull(base_price));
      paramCount++;
    }

    if (margin !== undefined) {
      updates.push(`margin = $${paramCount}`);
      values.push(normalizeEmptyToNull(margin));
      paramCount++;
    }

    if (pdfs !== undefined) {
      updates.push(`pdfs = $${paramCount}`);
      values.push(JSON.stringify(pdfs));
      paramCount++;
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const companyId = req.companyFilter;
    const idParamPosition = paramCount;
    values.push(id);
    paramCount++;
    
    values.push(companyId);
    whereConditions = `WHERE id = $${idParamPosition} AND company_id = $${paramCount}`;

    const result = await client.query(
      `UPDATE products 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING *`,
      values
    );

    await client.query('COMMIT');

    // Audit Log
    logAction({
      userId: req.user.id, companyId: req.companyFilter, action: 'UPDATE', entityType: 'product',
      entityId: id, newValue: { product_code: result.rows[0].product_code, name: result.rows[0].name },
      ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
    }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

    return successResponse(
      res,
      result.rows[0],
      'Product updated successfully'
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingProduct = await req.db.query(
      `SELECT id, product_code, name FROM products ${whereConditions}`,
      queryParams
    );

    if (existingProduct.rows.length === 0) {
      return next(new AppError('Product not found', 404));
    }

    const productRecord = existingProduct.rows[0];
    const dependencies = [];

    try {
      const piResult = await req.db.query(
        `SELECT COUNT(l.*) as count FROM proforma_invoice_lines l JOIN proforma_invoices p ON l.proforma_invoice_id = p.id WHERE l.product_id = $1 AND p.status != 'Deleted'`,
        [id]
      );
      if (parseInt(piResult.rows[0].count) > 0) {
        dependencies.push({ type: 'Proforma Invoices', count: parseInt(piResult.rows[0].count) });
      }
      } catch (e) {
        debugLogger.warn('Optional dependency check (proforma_invoices) failed for product:', e.message);
      }

    try {
      const poResult = await req.db.query(
        `SELECT COUNT(l.*) as count FROM proforma_order_lines l JOIN proforma_orders p ON l.proforma_order_id = p.id WHERE l.product_id = $1 AND p.status != 'Deleted'`,
        [id]
      );
      if (parseInt(poResult.rows[0].count) > 0) {
        dependencies.push({ type: 'Proforma Orders', count: parseInt(poResult.rows[0].count) });
      }
      } catch (e) {
        debugLogger.warn('Optional dependency check (proforma_orders) failed for product:', e.message);
      }

    try {
      const eiResult = await req.db.query(
        `SELECT COUNT(*) as count FROM export_invoice_lines WHERE product_id = $1`,
        [id]
      );
      if (parseInt(eiResult.rows[0].count) > 0) {
        dependencies.push({ type: 'Export Invoices', count: parseInt(eiResult.rows[0].count) });
      }
      } catch (e) {
        debugLogger.warn('Optional dependency check (export_invoices) failed for product:', e.message);
      }

    if (dependencies.length > 0 && force !== 'true') {
      const depList = dependencies.map(d => `${d.count} ${d.type}`).join(', ');
      return res.status(409).json({
        success: false,
        message: `Cannot delete product "${productRecord.name}" (${productRecord.product_code}) because it is referenced by: ${depList}. Use force=true to override.`,
        dependencies,
        productCode: productRecord.product_code
      });
    }

    queryParams.push('Deleted');
    const result = await req.db.query(
      `UPDATE products 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING id, product_code`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      'Product deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingProduct = await req.db.query(
      `SELECT id, product_code FROM products ${whereConditions}`,
      queryParams
    );

    if (existingProduct.rows.length === 0) {
      return next(new AppError('Product not found', 404));
    }

    await req.db.query(
      `DELETE FROM products ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingProduct.rows[0].id, product_code: existingProduct.rows[0].product_code },
      'Product permanently deleted'
    );
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingProduct = await req.db.query(
      `SELECT id, status FROM products ${whereConditions}`,
      queryParams
    );

    if (existingProduct.rows.length === 0) {
      return next(new AppError('Product not found', 404));
    }

    const currentStatus = existingProduct.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await req.db.query(
      `UPDATE products 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      `Product status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};

export const uploadImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Generate file path
    const filePath = req.file.location || `/uploads/${req.file.filename}`;
    const imageData = {
      id: Date.now(),
      name: req.file.originalname,
      path: filePath,
      url: filePath,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    // If this is a temporary product (new form), just return the image data
    if (id === 'temp') {
      return successResponse(res, imageData, 'Image uploaded successfully');
    }

    // Get current product
    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const productResult = await req.db.query(
      `SELECT id, images FROM products ${whereConditions}`,
      queryParams
    );

    if (productResult.rows.length === 0) {
      return next(new AppError('Product not found', 404));
    }

    const currentImages = productResult.rows[0].images || [];
    const newImages = [...currentImages, imageData];

    // Update product with new image
    queryParams.push(JSON.stringify(newImages));
    const updateResult = await req.db.query(
      `UPDATE products 
       SET images = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    return successResponse(
      res,
      {
        id: imageData.id,
        path: filePath,
        url: filePath,
        name: req.file.originalname,
        size: req.file.size
      },
      'Image uploaded successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const bulkUpsert = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const { products } = req.body;
    const companyId = req.companyFilter;

    if (!companyId) {
      client.release();
      return next(new AppError('Company context is required for bulk operations.', 400));
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      client.release();
      return next(new AppError('No products provided for bulk import', 400));
    }

    await client.query('BEGIN');

    let insertedCount = 0;
    let updatedCount = 0;

    // Use synchronous batch inserts
    // Batch size of 100 to 500 is good for standard parameters limits
    for (const prod of products) {
      const finalProductCode = prod.productCode || prod.product_code || await generateSequentialId('PROD', 'products', 'product_code', companyId, req.db);
      
      const result = await client.query(
        `INSERT INTO products 
         (company_id, product_code, item_ref, name, description, category, size, surface,
          thickness, sqm_per_box, boxes_per_pallet, box_weight, factory_price,
          selling_price, hs_code, images, status, factory_name, factory_product_name,
          company_product_name, catalogue_name, application, box_pcs, 
          default_boxes_per_kathali, default_per_box_weight, default_per_pallet_weight,
          base_price, margin, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (company_id, product_code) 
         DO UPDATE SET
            name = EXCLUDED.name,
            item_ref = COALESCE(EXCLUDED.item_ref, products.item_ref),
            description = COALESCE(EXCLUDED.description, products.description),
            category = COALESCE(EXCLUDED.category, products.category),
            size = COALESCE(EXCLUDED.size, products.size),
            surface = COALESCE(EXCLUDED.surface, products.surface),
            thickness = COALESCE(EXCLUDED.thickness, products.thickness),
            sqm_per_box = COALESCE(EXCLUDED.sqm_per_box, products.sqm_per_box),
            boxes_per_pallet = COALESCE(EXCLUDED.boxes_per_pallet, products.boxes_per_pallet),
            box_weight = COALESCE(EXCLUDED.box_weight, products.box_weight),
            factory_price = COALESCE(EXCLUDED.factory_price, products.factory_price),
            selling_price = COALESCE(EXCLUDED.selling_price, products.selling_price),
            hs_code = COALESCE(EXCLUDED.hs_code, products.hs_code),
            images = COALESCE(EXCLUDED.images, products.images),
            factory_name = COALESCE(EXCLUDED.factory_name, products.factory_name),
            factory_product_name = COALESCE(EXCLUDED.factory_product_name, products.factory_product_name),
            catalogue_name = COALESCE(EXCLUDED.catalogue_name, products.catalogue_name),
            application = COALESCE(EXCLUDED.application, products.application),
            box_pcs = COALESCE(EXCLUDED.box_pcs, products.box_pcs),
            status = COALESCE(EXCLUDED.status, products.status),
            updated_at = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS inserted`,
        [
          companyId, finalProductCode, normalizeEmptyToNull(prod.itemRef || prod.item_ref), cleanAndUppercase(prod.name), normalizeEmptyToNull(prod.description),
          cleanAndUppercase(prod.category), normalizeEmptyToNull(prod.size), cleanAndUppercase(prod.surface), cleanAndUppercase(prod.thickness),
          normalizeEmptyToNull(prod.sqmPerBox || prod.sqm_per_box), normalizeEmptyToNull(prod.boxesPerPallet || prod.boxes_per_pallet), normalizeEmptyToNull(prod.boxWeight || prod.box_weight),
          normalizeEmptyToNull(prod.factoryPrice || prod.factory_price), normalizeEmptyToNull(prod.sellingPrice || prod.selling_price), normalizeEmptyToNull(prod.hsCode || prod.hs_code),
          JSON.stringify(prod.images || []), prod.status || 'Active', cleanAndUppercase(prod.factoryName || prod.factory_name), cleanAndUppercase(prod.factoryProductName || prod.factory_product_name),
          cleanAndUppercase(prod.companyProductName || prod.company_product_name), cleanAndUppercase(prod.catalogueName || prod.catalogue_name), cleanAndUppercase(prod.application),
          normalizeEmptyToNull(prod.boxPcs || prod.box_pcs), normalizeEmptyToNull(prod.defaultBoxesPerKathali || prod.default_boxes_per_kathali), normalizeEmptyToNull(prod.defaultPerBoxWeight || prod.default_per_box_weight),
          normalizeEmptyToNull(prod.defaultPerPalletWeight || prod.default_per_pallet_weight), normalizeEmptyToNull(prod.basePrice || prod.base_price), normalizeEmptyToNull(prod.margin),
          req.user.id
        ]
      );
      if (result.rows[0].inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    }

    await client.query('COMMIT');

    // Update Master Data automatically
    try {
      const masterDataUpdates = [
        { field: 'category', table: 'product_categories', column: 'category' },
        { field: 'size', table: 'product_sizes', column: 'size' },
        { field: 'surface', table: 'product_surfaces', column: 'surface', split: true },
        { field: 'application', table: 'product_applications', column: 'application', split: true },
        { field: 'thickness', table: 'product_thickness', column: 'thickness', split: true },
        { field: 'factoryName', fallback: 'factory_name', table: 'factory_names', column: 'name' }
      ];

      for (const md of masterDataUpdates) {
        let valuesToInsert = [];
        
        products.forEach(p => {
          const rawValue = p[md.field] || p[md.fallback];
          if (rawValue && typeof rawValue === 'string' && rawValue.trim().length > 0) {
            if (md.split) {
              rawValue.split(',').forEach(v => {
                if (v.trim()) valuesToInsert.push(v.trim());
              });
            } else {
              valuesToInsert.push(rawValue.trim());
            }
          }
        });

        const uniqueValues = [...new Set(valuesToInsert)];
        
        for (const val of uniqueValues) {
          await client.query(`
            INSERT INTO ${md.table} (company_id, ${md.column}, status, created_at, updated_at)
            SELECT $1, $2, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            WHERE NOT EXISTS (
              SELECT 1 FROM ${md.table} 
              WHERE company_id = $1 AND LOWER(${md.column}) = LOWER($2)
            )
          `, [companyId, val]);
        }
      }
    } catch (mdErr) {
      debugLogger.warn('Failed to update master data during bulk import:', mdErr.message);
    }

    // Audit Log
    logAction({
      userId: req.user.id, companyId: req.companyFilter, action: 'BULK_UPSERT', entityType: 'product',
      entityId: 'bulk', newValue: { inserted: insertedCount, updated: updatedCount },
      ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
    }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

    return successResponse(
      res,
      { insertedCount, updatedCount },
      `Successfully processed ${products.length} products (${insertedCount} inserted, ${updatedCount} updated)`,
      200
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const validateImport = async (req, res, next) => {
  try {
    const { products } = req.body;
    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required for validation.', 400));
    }

    if (!products || !Array.isArray(products)) {
      return next(new AppError('No products data provided for validation.', 400));
    }

    // 1. Fetch active products for the company from database
    const dbResult = await req.db.query(
      `SELECT id, product_code, item_ref, sku, name, company_product_name, factory_name, factory_product_name 
       FROM products 
       WHERE company_id = $1 AND status != 'Deleted'`,
      [companyId]
    );

    const dbProducts = dbResult.rows;

    // Helper to normalize values
    const normalizeVal = (val) => String(val || '').trim().replace(/\s+/g, ' ').toUpperCase();

    // 2. Build lookup maps for database products
    const dbProductCodeMap = new Map();
    const dbComboMap = new Map();

    dbProducts.forEach(p => {
      const code = normalizeVal(p.product_code);
      const itemRef = normalizeVal(p.item_ref);
      const sku = normalizeVal(p.sku);
      const fName = normalizeVal(p.factory_name);
      const fpName = normalizeVal(p.factory_product_name);
      const pName = normalizeVal(p.name);
      const cpName = normalizeVal(p.company_product_name);

      if (code) dbProductCodeMap.set(code, p);
      if (itemRef) dbProductCodeMap.set(itemRef, p);
      if (sku) dbProductCodeMap.set(sku, p);

      if (pName) {
        const comboKey = `${fName}|||${fpName}|||${pName}`;
        dbComboMap.set(comboKey, p);
      }
      if (cpName) {
        const comboKey = `${fName}|||${fpName}|||${cpName}`;
        dbComboMap.set(comboKey, p);
      }
    });

    // 3. Keep track of seen keys within the uploaded file to detect duplicates inside the file
    // Maps key string -> row number (1-indexed)
    const seenCodes = new Map();
    const seenCombos = new Map();

    const results = [];
    let validCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    products.forEach((prod, index) => {
      const rowNo = prod.rowIndex || (index + 1);

      // Extract and normalize fields
      const rawProductCode = prod.productCode || prod['Product Code'] || prod.product_code || prod.itemRef || prod.item_ref || '';
      const rawSku = prod.sku || prod.SKU || '';
      const rawName = prod.name || prod['Product Name'] || prod.companyProductName || prod['Company Product Name'] || '';
      const rawFactoryName = prod.factoryName || prod['Factory Name'] || prod.factory_name || '';
      const rawFactoryProductName = prod.factoryProductName || prod['Factory Product Name'] || prod.factory_product_name || '';
      const rawCategory = prod.category || prod['Category'] || '';

      const productCode = normalizeVal(rawProductCode);
      const sku = normalizeVal(rawSku);
      const name = normalizeVal(rawName);
      const factoryName = normalizeVal(rawFactoryName);
      const factoryProductName = normalizeVal(rawFactoryProductName);
      const category = normalizeVal(rawCategory);

      let status = 'VALID';
      let reason = '-';
      const rowErrors = [];

      // Check required fields (Product Name, Category)
      if (!name) {
        rowErrors.push('Product Name is required');
      }
      if (!category) {
        rowErrors.push('Category is required');
      }

      // Check if format is invalid (e.g. numeric fields should be valid numbers)
      const boxPcs = prod.boxPcs || prod['Box PCS'] || prod.box_pcs;
      if (boxPcs !== undefined && boxPcs !== '' && boxPcs !== null && isNaN(parseInt(boxPcs))) {
        rowErrors.push('Box PCS must be a valid number');
      }
      const boxWeight = prod.boxWeight || prod['Per Box Weight (KG)'] || prod.box_weight;
      if (boxWeight !== undefined && boxWeight !== '' && boxWeight !== null && isNaN(parseFloat(boxWeight))) {
        rowErrors.push('Box Weight must be a valid number');
      }
      const sqmPerBox = prod.sqmPerBox || prod['SQM Per Box'] || prod.sqm_per_box;
      if (sqmPerBox !== undefined && sqmPerBox !== '' && sqmPerBox !== null && isNaN(parseFloat(sqmPerBox))) {
        rowErrors.push('SQM Per Box must be a valid number');
      }
      const boxesPerPallet = prod.boxesPerPallet || prod['Boxes Per Big Pallet'] || prod.boxes_per_pallet;
      if (boxesPerPallet !== undefined && boxesPerPallet !== '' && boxesPerPallet !== null && isNaN(parseInt(boxesPerPallet))) {
        rowErrors.push('Boxes Per Pallet must be a valid number');
      }

      if (rowErrors.length > 0) {
        const isMissingField = rowErrors.some(err => err.toLowerCase().includes('required'));
        status = isMissingField ? 'MISSING REQUIRED FIELD' : 'INVALID DATA FORMAT';
        reason = rowErrors.join('; ');
        errorCount++;
      } else {
        // Run duplicate checks
        const comboKey = `${factoryName}|||${factoryProductName}|||${name}`;

        // A. Check duplicate inside the uploaded file first
        let fileDuplicateOfRow = null;

        if (productCode && seenCodes.has(productCode)) {
          fileDuplicateOfRow = seenCodes.get(productCode);
        } else if (sku && seenCodes.has(sku)) {
          fileDuplicateOfRow = seenCodes.get(sku);
        } else if (seenCombos.has(comboKey)) {
          fileDuplicateOfRow = seenCombos.get(comboKey);
        }

        if (fileDuplicateOfRow !== null) {
          status = 'DUPLICATE FILE RECORD';
          reason = `Duplicate found in Row ${fileDuplicateOfRow}`;
          duplicateCount++;
        } else {
          // B. Check duplicate against the database
          let dbDuplicate = false;
          if (productCode && dbProductCodeMap.has(productCode)) {
            dbDuplicate = true;
          } else if (sku && dbProductCodeMap.has(sku)) {
            dbDuplicate = true;
          } else if (dbComboMap.has(comboKey)) {
            dbDuplicate = true;
          }

          if (dbDuplicate) {
            status = 'DUPLICATE DATABASE';
            reason = 'Product already exists';
            duplicateCount++;
          } else {
            status = 'VALID';
            reason = `Debug: Incoming "${comboKey}" | DB Keys: [${Array.from(dbComboMap.keys()).join(', ')}]`;
            validCount++;
          }
        }

        // Add to seen maps so subsequent rows can point to this first occurrence
        if (productCode && !seenCodes.has(productCode)) seenCodes.set(productCode, rowNo);
        if (sku && !seenCodes.has(sku)) seenCodes.set(sku, rowNo);
        if (!seenCombos.has(comboKey)) seenCombos.set(comboKey, rowNo);
      }

      results.push({
        ...prod,
        rowIndex: rowNo,
        status,
        reason,
        factoryName: rawFactoryName,
        factoryProductName: rawFactoryProductName,
        productName: rawName,
        productCode: rawProductCode,
        category: rawCategory
      });
    });

    return successResponse(
      res,
      {
        summary: {
          total: products.length,
          validCount,
          duplicateCount,
          errorCount
        },
        results
      },
      'Import validation completed successfully'
    );
  } catch (error) {
    next(error);
  }
};

