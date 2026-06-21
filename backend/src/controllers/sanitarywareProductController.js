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

    // 1. Fetch active sanitaryware products for the company from database
    const dbResult = await req.db.query(
      `SELECT id, product_code, item_ref, name, factory_name, factory_product_name 
       FROM sanitaryware_products 
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
      const fName = normalizeVal(p.factory_name);
      const fpName = normalizeVal(p.factory_product_name);
      const pName = normalizeVal(p.name);

      if (code) dbProductCodeMap.set(code, p);
      if (itemRef) dbProductCodeMap.set(itemRef, p);

      if (pName) {
        const comboKey = `${fName}|||${fpName}|||${pName}`;
        dbComboMap.set(comboKey, p);
      }
    });

    // 3. Keep track of seen keys within the uploaded file to detect duplicates inside the file
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
      const rawName = prod.name || prod['Product Name'] || '';
      const rawFactoryName = prod.factoryName || prod['Factory Name'] || prod.factory_name || '';
      const rawFactoryProductName = prod.factoryProductName || prod['Factory Product Name'] || prod.factory_product_name || '';
      const rawCategory = prod.category || prod['Category'] || '';

      const productCode = normalizeVal(rawProductCode);
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

      // Check numeric fields if provided
      const weightPerPiece = prod.weightPerPiece || prod['Weight Per Piece'] || prod.weight_per_piece || prod['Weight (kg)'] || prod.weight_per_piece;
      if (weightPerPiece !== undefined && weightPerPiece !== '' && weightPerPiece !== null && isNaN(parseFloat(weightPerPiece))) {
        rowErrors.push('Weight per piece must be a valid number');
      }

      const pcsPerBox = prod.pcsPerBox || prod['PCS Per Box'] || prod.pcs_per_box;
      if (pcsPerBox !== undefined && pcsPerBox !== '' && pcsPerBox !== null && isNaN(parseInt(pcsPerBox))) {
        rowErrors.push('PCS Per Box must be a valid number');
      }

      const boxPcs = prod.boxPcs || prod['Box PCS'] || prod.box_pcs;
      if (boxPcs !== undefined && boxPcs !== '' && boxPcs !== null && isNaN(parseInt(boxPcs))) {
        rowErrors.push('Box PCS must be a valid number');
      }

      const boxWeight = prod.boxWeight || prod['Box Weight'] || prod.box_weight;
      if (boxWeight !== undefined && boxWeight !== '' && boxWeight !== null && isNaN(parseFloat(boxWeight))) {
        rowErrors.push('Box Weight must be a valid number');
      }

      const factoryPrice = prod.factoryPrice || prod['Factory Price'] || prod.factory_price;
      if (factoryPrice !== undefined && factoryPrice !== '' && factoryPrice !== null && isNaN(parseFloat(factoryPrice))) {
        rowErrors.push('Factory Price must be a valid number');
      }

      const sellingPrice = prod.sellingPrice || prod['Selling Price'] || prod.selling_price;
      if (sellingPrice !== undefined && sellingPrice !== '' && sellingPrice !== null && isNaN(parseFloat(sellingPrice))) {
        rowErrors.push('Selling Price must be a valid number');
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
          } else if (dbComboMap.has(comboKey)) {
            dbDuplicate = true;
          }

          if (dbDuplicate) {
            status = 'DUPLICATE DATABASE';
            reason = 'Product already exists';
            duplicateCount++;
          } else {
            status = 'VALID';
            reason = `Debug: Incoming "${comboKey}"`;
            validCount++;
          }
        }

        // Add to seen maps so subsequent rows can point to this first occurrence
        if (productCode && !seenCodes.has(productCode)) seenCodes.set(productCode, rowNo);
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
    const BATCH_SIZE = 500;
    
    // First, generate IDs for all products sequentially if needed
    for (const prod of products) {
      if (!prod.productCode && !prod.product_code) {
         prod.finalProductCode = await generateSequentialId('SPROD', 'sanitaryware_products', 'product_code', companyId, req.db);
      } else {
         prod.finalProductCode = prod.productCode || prod.product_code;
      }
    }

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      
      const valueStrings = [];
      const queryParams = [];
      let paramCount = 1;

      for (const prod of batch) {
        valueStrings.push(`($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
        
        queryParams.push(
          companyId,
          prod.finalProductCode,
          normalizeEmptyToNull(prod.item_ref || prod.itemRef),
          cleanAndUppercase(prod.name || prod.productName),
          normalizeEmptyToNull(prod.description),
          cleanAndUppercase(prod.category),
          normalizeEmptyToNull(prod.brand),
          normalizeEmptyToNull(prod.collection),
          normalizeEmptyToNull(prod.color),
          normalizeEmptyToNull(prod.material_type || prod.materialType),
          normalizeEmptyToNull(prod.shape),
          normalizeEmptyToNull(prod.flush_type || prod.flushType),
          normalizeEmptyToNull(prod.trap_type || prod.trapType),
          normalizeEmptyToNull(prod.mount_type || prod.mountType),
          normalizeEmptyToNull(prod.seat_cover_type || prod.seatCoverType),
          normalizeEmptyToNull(prod.finish_type || prod.finishType),
          normalizeEmptyToNull(prod.dimension_standard || prod.dimensionStandard),
          normalizeEmptyToNull(prod.dimensions_l || prod.dimensionsL),
          normalizeEmptyToNull(prod.dimensions_w || prod.dimensionsW),
          normalizeEmptyToNull(prod.dimensions_h || prod.dimensionsH),
          normalizeEmptyToNull(prod.weight_per_piece || prod.weightPerPiece),
          normalizeEmptyToNull(prod.pcs_per_box || prod.pcsPerBox),
          normalizeEmptyToNull(prod.box_pcs || prod.boxPcs),
          normalizeEmptyToNull(prod.box_weight || prod.boxWeight),
          normalizeEmptyToNull(prod.factory_price || prod.factoryPrice),
          normalizeEmptyToNull(prod.selling_price || prod.sellingPrice || prod.price),
          normalizeEmptyToNull(prod.base_price || prod.basePrice),
          normalizeEmptyToNull(prod.margin),
          normalizeEmptyToNull(prod.hsn_code || prod.hsnCode || prod.hsCode || prod.hs_code),
          prod.status || 'Active',
          normalizeEmptyToNull(prod.factory_name || prod.factoryName),
          normalizeEmptyToNull(prod.factory_product_name || prod.factoryProductName),
          normalizeEmptyToNull(prod.factory_product_code || prod.factoryProductCode),
          normalizeEmptyToNull(prod.catalogue_name || prod.catalogueName),
          JSON.stringify(prod.images || []),
          JSON.stringify(prod.pdfs || []),
          req.user.id
        );
      }

      const query = `
         INSERT INTO sanitaryware_products 
         (company_id, product_code, item_ref, name, description, category, brand, collection,
          color, material_type, shape, flush_type, trap_type, mount_type,
          seat_cover_type, finish_type, dimension_standard, dimensions_l, dimensions_w, dimensions_h,
          weight_per_piece, pcs_per_box, box_pcs, box_weight,
          factory_price, selling_price, base_price, margin, hsn_code, status,
          factory_name, factory_product_name, factory_product_code, catalogue_name, images, pdfs, created_by, created_at, updated_at)
         VALUES ${valueStrings.join(', ')}
         ON CONFLICT (company_id, product_code) 
         DO UPDATE SET
            name = EXCLUDED.name,
            item_ref = COALESCE(EXCLUDED.item_ref, sanitaryware_products.item_ref),
            description = COALESCE(EXCLUDED.description, sanitaryware_products.description),
            category = COALESCE(EXCLUDED.category, sanitaryware_products.category),
            brand = COALESCE(EXCLUDED.brand, sanitaryware_products.brand),
            collection = COALESCE(EXCLUDED.collection, sanitaryware_products.collection),
            color = COALESCE(EXCLUDED.color, sanitaryware_products.color),
            material_type = COALESCE(EXCLUDED.material_type, sanitaryware_products.material_type),
            shape = COALESCE(EXCLUDED.shape, sanitaryware_products.shape),
            flush_type = COALESCE(EXCLUDED.flush_type, sanitaryware_products.flush_type),
            trap_type = COALESCE(EXCLUDED.trap_type, sanitaryware_products.trap_type),
            mount_type = COALESCE(EXCLUDED.mount_type, sanitaryware_products.mount_type),
            seat_cover_type = COALESCE(EXCLUDED.seat_cover_type, sanitaryware_products.seat_cover_type),
            finish_type = COALESCE(EXCLUDED.finish_type, sanitaryware_products.finish_type),
            dimension_standard = COALESCE(EXCLUDED.dimension_standard, sanitaryware_products.dimension_standard),
            dimensions_l = COALESCE(EXCLUDED.dimensions_l, sanitaryware_products.dimensions_l),
            dimensions_w = COALESCE(EXCLUDED.dimensions_w, sanitaryware_products.dimensions_w),
            dimensions_h = COALESCE(EXCLUDED.dimensions_h, sanitaryware_products.dimensions_h),
            weight_per_piece = COALESCE(EXCLUDED.weight_per_piece, sanitaryware_products.weight_per_piece),
            pcs_per_box = COALESCE(EXCLUDED.pcs_per_box, sanitaryware_products.pcs_per_box),
            box_pcs = COALESCE(EXCLUDED.box_pcs, sanitaryware_products.box_pcs),
            box_weight = COALESCE(EXCLUDED.box_weight, sanitaryware_products.box_weight),
            factory_price = COALESCE(EXCLUDED.factory_price, sanitaryware_products.factory_price),
            selling_price = COALESCE(EXCLUDED.selling_price, sanitaryware_products.selling_price),
            base_price = COALESCE(EXCLUDED.base_price, sanitaryware_products.base_price),
            margin = COALESCE(EXCLUDED.margin, sanitaryware_products.margin),
            hsn_code = COALESCE(EXCLUDED.hsn_code, sanitaryware_products.hsn_code),
            status = COALESCE(EXCLUDED.status, sanitaryware_products.status),
            factory_name = COALESCE(EXCLUDED.factory_name, sanitaryware_products.factory_name),
            factory_product_name = COALESCE(EXCLUDED.factory_product_name, sanitaryware_products.factory_product_name),
            factory_product_code = COALESCE(EXCLUDED.factory_product_code, sanitaryware_products.factory_product_code),
            catalogue_name = COALESCE(EXCLUDED.catalogue_name, sanitaryware_products.catalogue_name),
            images = COALESCE(EXCLUDED.images, sanitaryware_products.images),
            pdfs = COALESCE(EXCLUDED.pdfs, sanitaryware_products.pdfs),
            updated_at = CURRENT_TIMESTAMP
         RETURNING id, xmax
      `;
      
      const result = await client.query(query, queryParams);
      
      for (const row of result.rows) {
        if (row.xmax === 0 || row.xmax === '0') {
          insertedCount++;
        } else {
          updatedCount++;
        }
      }
    }

    await client.query('COMMIT');

    // Audit Log
    logAction({
      userId: req.user.id, companyId: req.companyFilter, action: 'BULK_UPSERT', entityType: 'sanitaryware_product',
      entityId: 'bulk', newValue: { inserted: insertedCount, updated: updatedCount },
      ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl
    }, req.db).catch(e => debugLogger.warn('Audit log failed:', e.message));

    return successResponse(
      res,
      { insertedCount, updatedCount },
      `Successfully processed ${products.length} sanitaryware products (${insertedCount} inserted, ${updatedCount} updated)`,
      200
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
