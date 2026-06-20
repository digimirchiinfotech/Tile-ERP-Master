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
import { 
  successResponse, 
  generateSequentialId, 
  getPagination, 
  paginationResponse,
  normalizeEmptyToNull 
} from '../utils/helpers.js';

/**
 * Self-healing helper: ensures the sanitaryware_products table exists in the current tenant database.
 * Dynamic database creation is fully isolated and automatic!
 */
const ensureTableExists = async (queryFn) => {
  // Moved to databaseProvisioning.js to prevent runtime ALTER TABLE locks
};

export const getAll = async (req, res, next) => {
  try {
    await ensureTableExists(req.db.query);
    
    const { 
      page = 1, 
      limit = 50, 
      search, 
      category, 
      status, 
      brand 
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
      conditions.push(`(name ILIKE $${paramCount} OR product_code ILIKE $${paramCount} OR item_ref ILIKE $${paramCount} OR category ILIKE $${paramCount} OR hsn_code ILIKE $${paramCount})`);
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

    if (brand) {
      conditions.push(`brand = $${paramCount}`);
      values.push(brand);
      paramCount++;
    }

    // Exclude soft-deleted records unless explicitly requesting deleted records
    if (status !== 'Deleted') {
      conditions.push(`status != 'Deleted'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM sanitaryware_products ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const columns = `*`;
    
    const result = await req.db.query(
      `SELECT ${columns} FROM sanitaryware_products 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Sanitaryware products retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    await ensureTableExists(req.db.query);
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

    const result = await req.db.query(
      `SELECT * FROM sanitaryware_products ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Sanitaryware Product not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Sanitaryware Product retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    await ensureTableExists(req.db.query);
    const {
      product_code, item_ref, name, description, category, brand, collection,
      color, material_type, shape, flush_type, trap_type, mount_type,
      seat_cover_type, finish_type, dimension_standard, dimensions_l, dimensions_w, dimensions_h,
      weight_per_piece, pcs_per_box, box_pcs, box_weight,
      factory_price, selling_price, base_price, margin, hsn_code, status = 'Active',
      factory_name, factory_product_name, factory_product_code, catalogue_name, images = [], pdfs = []
    } = req.body;

    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    const finalProductCode = product_code || await generateSequentialId('SPROD', 'sanitaryware_products', 'product_code', companyId, req.db);

    const existingProduct = await req.db.query(
      'SELECT id FROM sanitaryware_products WHERE product_code = $1 AND company_id = $2',
      [finalProductCode, companyId]
    );

    if (existingProduct.rows.length > 0) {
      return next(new AppError('Sanitaryware Product with this code already exists', 400));
    }

    const result = await req.db.query(
      `INSERT INTO sanitaryware_products 
       (company_id, product_code, item_ref, name, description, category, brand, collection,
        color, material_type, shape, flush_type, trap_type, mount_type,
        seat_cover_type, finish_type, dimension_standard, dimensions_l, dimensions_w, dimensions_h,
        weight_per_piece, pcs_per_box, box_pcs, box_weight,
        factory_price, selling_price, base_price, margin, hsn_code, status,
        factory_name, factory_product_name, factory_product_code, catalogue_name, images, pdfs, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, finalProductCode, normalizeEmptyToNull(item_ref), name, normalizeEmptyToNull(description),
        normalizeEmptyToNull(category), normalizeEmptyToNull(brand), normalizeEmptyToNull(collection),
        normalizeEmptyToNull(color), normalizeEmptyToNull(material_type), normalizeEmptyToNull(shape),
        normalizeEmptyToNull(flush_type), normalizeEmptyToNull(trap_type), normalizeEmptyToNull(mount_type),
        normalizeEmptyToNull(seat_cover_type), normalizeEmptyToNull(finish_type), normalizeEmptyToNull(dimension_standard),
        normalizeEmptyToNull(dimensions_l), normalizeEmptyToNull(dimensions_w), normalizeEmptyToNull(dimensions_h),
        normalizeEmptyToNull(weight_per_piece), normalizeEmptyToNull(pcs_per_box),
        normalizeEmptyToNull(box_pcs), normalizeEmptyToNull(box_weight),
        normalizeEmptyToNull(factory_price), normalizeEmptyToNull(selling_price), normalizeEmptyToNull(base_price),
        normalizeEmptyToNull(margin), normalizeEmptyToNull(hsn_code), status || 'Active',
        normalizeEmptyToNull(factory_name), normalizeEmptyToNull(factory_product_name), normalizeEmptyToNull(factory_product_code),
        normalizeEmptyToNull(catalogue_name), JSON.stringify(images || []), JSON.stringify(pdfs || []), req.user?.id
      ]
    );

    return successResponse(
      res,
      result.rows[0],
      'Sanitaryware Product created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    await ensureTableExists(req.db.query);
    const { id } = req.params;
    const {
      product_code, item_ref, name, description, category, brand, collection,
      color, material_type, shape, flush_type, trap_type, mount_type,
      seat_cover_type, finish_type, dimension_standard, dimensions_l, dimensions_w, dimensions_h,
      weight_per_piece, pcs_per_box, box_pcs, box_weight,
      factory_price, selling_price, base_price, margin, hsn_code, status,
      factory_name, factory_product_name, factory_product_code, catalogue_name, images, pdfs
    } = req.body;

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

    const existingProduct = await req.db.query(
      `SELECT id FROM sanitaryware_products ${whereConditions}`,
      checkParams
    );

    if (existingProduct.rows.length === 0) {
      return next(new AppError('Sanitaryware Product not found', 404));
    }

    if (product_code) {
      const codeCheck = await req.db.query(
        'SELECT id FROM sanitaryware_products WHERE product_code = $1 AND id != $2',
        [product_code, id]
      );

      if (codeCheck.rows.length > 0) {
        return next(new AppError('Product code already in use', 400));
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = [
      { name: 'product_code', raw: product_code },
      { name: 'item_ref', raw: item_ref, normalize: true },
      { name: 'name', raw: name },
      { name: 'description', raw: description, normalize: true },
      { name: 'category', raw: category, normalize: true },
      { name: 'brand', raw: brand, normalize: true },
      { name: 'collection', raw: collection, normalize: true },
      { name: 'color', raw: color, normalize: true },
      { name: 'material_type', raw: material_type, normalize: true },
      { name: 'shape', raw: shape, normalize: true },
      { name: 'flush_type', raw: flush_type, normalize: true },
      { name: 'trap_type', raw: trap_type, normalize: true },
      { name: 'mount_type', raw: mount_type, normalize: true },
      { name: 'seat_cover_type', raw: seat_cover_type, normalize: true },
      { name: 'finish_type', raw: finish_type, normalize: true },
      { name: 'dimension_standard', raw: dimension_standard, normalize: true },
      { name: 'dimensions_l', raw: dimensions_l, normalize: true },
      { name: 'dimensions_w', raw: dimensions_w, normalize: true },
      { name: 'dimensions_h', raw: dimensions_h, normalize: true },
      { name: 'weight_per_piece', raw: weight_per_piece, normalize: true },
      { name: 'pcs_per_box', raw: pcs_per_box, normalize: true },
      { name: 'box_pcs', raw: box_pcs, normalize: true },
      { name: 'box_weight', raw: box_weight, normalize: true },
      { name: 'factory_price', raw: factory_price, normalize: true },
      { name: 'selling_price', raw: selling_price, normalize: true },
      { name: 'base_price', raw: base_price, normalize: true },
      { name: 'margin', raw: margin, normalize: true },
      { name: 'hsn_code', raw: hsn_code, normalize: true },
      { name: 'status', raw: status },
      { name: 'factory_name', raw: factory_name, normalize: true },
      { name: 'factory_product_name', raw: factory_product_name, normalize: true },
      { name: 'factory_product_code', raw: factory_product_code, normalize: true },
      { name: 'catalogue_name', raw: catalogue_name, normalize: true },
      { name: 'images', raw: images, json: true },
      { name: 'pdfs', raw: pdfs, json: true }
    ];

    for (const field of fields) {
      if (field.raw !== undefined) {
        updates.push(`${field.name} = $${paramCount}`);
        if (field.json) {
          values.push(JSON.stringify(field.raw));
        } else if (field.normalize) {
          values.push(normalizeEmptyToNull(field.raw));
        } else {
          values.push(field.raw);
        }
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const companyId = req.companyFilter;
    const idParamPosition = paramCount;
    values.push(id);
    paramCount++;
    
    values.push(companyId);
    whereConditions = `WHERE id = $${idParamPosition} AND company_id = $${paramCount}`;

    const result = await req.db.query(
      `UPDATE sanitaryware_products 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING *`,
      values
    );

    return successResponse(
      res,
      result.rows[0],
      'Sanitaryware Product updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await ensureTableExists(req.db.query);
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingProduct = await req.db.query(
      `SELECT id, product_code, name FROM sanitaryware_products ${whereConditions}`,
      queryParams
    );

    if (existingProduct.rows.length === 0) {
      return next(new AppError('Sanitaryware Product not found', 404));
    }

    queryParams.push('Deleted');
    const result = await req.db.query(
      `UPDATE sanitaryware_products 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING id, product_code`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      'Sanitaryware Product deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const hardDelete = async (req, res, next) => {
  try {
    await ensureTableExists(req.db.query);
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingProduct = await req.db.query(
      `SELECT id, product_code FROM sanitaryware_products ${whereConditions}`,
      queryParams
    );

    if (existingProduct.rows.length === 0) {
      return next(new AppError('Sanitaryware Product not found', 404));
    }

    await req.db.query(
      `DELETE FROM sanitaryware_products ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingProduct.rows[0].id, product_code: existingProduct.rows[0].product_code },
      'Sanitaryware Product permanently deleted'
    );
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    await ensureTableExists(req.db.query);
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingProduct = await req.db.query(
      `SELECT id, status FROM sanitaryware_products ${whereConditions}`,
      queryParams
    );

    if (existingProduct.rows.length === 0) {
      return next(new AppError('Sanitaryware Product not found', 404));
    }

    const currentStatus = existingProduct.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await req.db.query(
      `UPDATE sanitaryware_products 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      `Sanitaryware Product status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};

export const uploadImage = async (req, res, next) => {
  try {
    await ensureTableExists(req.db.query);
    const { id } = req.params;

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const filePath = req.file.location || `/uploads/${req.file.filename}`;
    const imageData = {
      id: Date.now(),
      name: req.file.originalname,
      path: filePath,
      url: filePath,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    if (id === 'temp') {
      return successResponse(res, imageData, 'Image uploaded successfully');
    }

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const productResult = await req.db.query(
      `SELECT id, images FROM sanitaryware_products ${whereConditions}`,
      queryParams
    );

    if (productResult.rows.length === 0) {
      return next(new AppError('Sanitaryware Product not found', 404));
    }

    const currentImages = productResult.rows[0].images || [];
    const newImages = [...currentImages, imageData];

    queryParams.push(JSON.stringify(newImages));
    await req.db.query(
      `UPDATE sanitaryware_products 
       SET images = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      imageData,
      'Image uploaded successfully'
    );
  } catch (error) {
    next(error);
  }
};
