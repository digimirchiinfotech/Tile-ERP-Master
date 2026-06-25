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
  paginationResponse 
} from '../utils/helpers.js';

/**
 * Self-healing helper: ensures catalogue tables exist and are migrated correctly.
 * Adds product_type column and removes the FK on product_id so both tile and
 * sanitaryware products can be referenced without a FK violation.
 */
const ensureCatalogueTablesExist = async (db) => {
  try {
    // Step 0: Ensure catalogue_products table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS catalogue_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        catalogue_id UUID NOT NULL REFERENCES catalogues(id) ON DELETE CASCADE,
        product_id UUID NOT NULL,
        product_type VARCHAR(20) NOT NULL DEFAULT 'tile',
        display_order INTEGER,
        custom_price NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Step 1: Add product_type column if missing (for legacy tables)
    await db.query(`
      ALTER TABLE catalogue_products
      ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) NOT NULL DEFAULT 'tile';
    `);

    // Step 2: Drop the FK constraint on product_id if it still exists
    // (so sanitaryware product IDs—stored in a separate table—don't violate it)
    const fkRes = await db.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'catalogue_products'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'catalogue_products_product_id_fkey';
    `);
    if (fkRes.rows.length > 0) {
      await db.query(`
        ALTER TABLE catalogue_products
        DROP CONSTRAINT catalogue_products_product_id_fkey;
      `);
    }
  } catch (err) {
    // Non-fatal: log and continue (table may not exist yet, or migration already applied)
    if (err.code !== '42P01') { // 42P01 = undefined_table
      debugLogger.warn('[Catalogue Schema] Migration warning:', err.message);
    }
  }
};

export const getAll = async (req, res, next) => {
  try {
    // Ensure tables exist before querying
    await ensureCatalogueTablesExist(req.db);

    const { 
      page = 1, 
      limit = 50, 
      search, 
      status 
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);


    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (req.companyFilter) {
      conditions.push(`c.company_id = $${paramCount}`);
      values.push(req.companyFilter);
      paramCount++;
    }

    if (search) {
      conditions.push(`(c.name ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`c.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM catalogues c ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM catalogue_products cp WHERE cp.catalogue_id = c.id) as product_count,
              (SELECT COALESCE(array_agg(product_id), '{}') FROM catalogue_products cp WHERE cp.catalogue_id = c.id) as product_ids
       FROM catalogues c
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Catalogues retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    // Ensure tables exist before querying
    await ensureCatalogueTablesExist(req.db);

    const { id } = req.params;
    const { includeProducts = 'true' } = req.query;

    let whereConditions = 'WHERE c.id = $1';
    let queryParams = [id];

    if (req.companyFilter) {
      whereConditions += ' AND c.company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const result = await req.db.query(
      `SELECT c.* FROM catalogues c ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Catalogue not found', 404));
    }

    const catalogue = result.rows[0];

    if (includeProducts === 'true') {
      // Fetch products using UNION so both tile and sanitaryware items are returned
      const productsResult = await req.db.query(
        `SELECT 
          cp.id as catalogue_product_id,
          cp.display_order,
          cp.custom_price,
          cp.product_type,
          p.id,
          p.name,
          p.product_code,
          p.size,
          p.surface,
          p.factory_product_name,
          NULL::text as category,
          NULL::text as brand
         FROM catalogue_products cp
         JOIN products p ON cp.product_id = p.id
         WHERE cp.catalogue_id = $1 AND (cp.product_type IS NULL OR cp.product_type = 'tile')
         UNION ALL
         SELECT 
          cp.id as catalogue_product_id,
          cp.display_order,
          cp.custom_price,
          cp.product_type,
          sp.id,
          sp.name,
          sp.product_code,
          NULL::text as size,
          NULL::text as surface,
          NULL::text as factory_product_name,
          sp.category,
          sp.brand
         FROM catalogue_products cp
         JOIN sanitaryware_products sp ON cp.product_id = sp.id
         WHERE cp.catalogue_id = $1 AND cp.product_type = 'sanitaryware'
         ORDER BY display_order ASC NULLS LAST, name ASC`,
        [id]
      );

      catalogue.products = productsResult.rows;
      catalogue.product_count = productsResult.rows.length;
    }

    return successResponse(
      res,
      catalogue,
      'Catalogue retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    // Ensure tables exist before creation
    await ensureCatalogueTablesExist(req.db);

    const {
      name, description, status = 'Draft', product_ids
    } = req.body;

    // Use req.companyFilter if available (context-aware), otherwise fallback to user's companyId
    const companyId = (req.user.role === 'super_admin' && req.companyFilter)
      ? req.companyFilter 
      : (req.user.companyId || req.companyFilter);

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }


    const catalogueId = await generateSequentialId('CAT', 'catalogues', 'catalogue_id', companyId, req.db);
    
    // Convert product_ids to array if it's a string (from FormData)
    const selectedProductIds = Array.isArray(product_ids) ? product_ids : 
                              (typeof product_ids === 'string' ? JSON.parse(product_ids || '[]') : []);

    // Get file paths if files were uploaded
    let coverImagePath = null;
    let pdfFilePath = null;

    if (req.files) {
      if (req.files.coverImage && req.files.coverImage[0]) {
        // Store relative path (e.g. uploads/catalogues/file.jpg)
        coverImagePath = req.files.coverImage[0].path.replace(/\\/g, '/');
        if (coverImagePath.includes('uploads/')) {
          coverImagePath = coverImagePath.substring(coverImagePath.indexOf('uploads/'));
        }
      }
      if (req.files.pdfFile && req.files.pdfFile[0]) {
        // Store relative path (e.g. uploads/catalogues/file.pdf)
        pdfFilePath = req.files.pdfFile[0].path.replace(/\\/g, '/');
        if (pdfFilePath.includes('uploads/')) {
          pdfFilePath = pdfFilePath.substring(pdfFilePath.indexOf('uploads/'));
        }
      }
    }

    const result = await req.db.query(
      `INSERT INTO catalogues 
       (company_id, catalogue_id, name, description, status, cover_image_path, pdf_file_path, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, catalogueId, name, description || null, status,
        coverImagePath, pdfFilePath, req.user.id
      ]
    );

    const newCatalogue = result.rows[0];

    // Handle initial products if provided
    // product_ids may be plain UUIDs (tile) or objects with { id, productType }
    if (selectedProductIds.length > 0) {
      const insertPromises = selectedProductIds.map((item, i) => {
        const productId = typeof item === 'object' ? (item.id || item) : item;
        const productType = typeof item === 'object' && item.productType ? item.productType : 'tile';
        if (productId) {
          return req.db.query(
            'INSERT INTO catalogue_products (catalogue_id, product_id, product_type, display_order) VALUES ($1, $2, $3, $4)',
            [newCatalogue.id, productId, productType, i + 1]
          );
        }
      });
      await Promise.all(insertPromises.filter(Boolean));
    }


    return successResponse(
      res,
      newCatalogue,
      'Catalogue created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, description, status, product_ids
    } = req.body;

    // Convert product_ids to array if it's a string (from FormData)
    const selectedProductIds = Array.isArray(product_ids) ? product_ids : 
                              (typeof product_ids === 'string' ? JSON.parse(product_ids || '[]') : []);

    let whereConditions = 'WHERE id = $1';
    let checkParams = [id];

    if (req.companyFilter) {
      whereConditions += ' AND company_id = $2';
      checkParams.push(req.companyFilter);
    }

    const checkResult = await req.db.query(
      `SELECT * FROM catalogues ${whereConditions}`,
      checkParams
    );

    if (checkResult.rows.length === 0) {
      return next(new AppError('Catalogue not found', 404));
    }

    const currentCatalogue = checkResult.rows[0];

    // Get file paths if files were uploaded
    let coverImagePath = currentCatalogue.cover_image_path;
    let pdfFilePath = currentCatalogue.pdf_file_path;

    if (req.files) {
      if (req.files.coverImage && req.files.coverImage[0]) {
        coverImagePath = req.files.coverImage[0].path.replace(/\\/g, '/');
        if (coverImagePath.includes('uploads/')) {
          coverImagePath = coverImagePath.substring(coverImagePath.indexOf('uploads/'));
        }
      }
      if (req.files.pdfFile && req.files.pdfFile[0]) {
        pdfFilePath = req.files.pdfFile[0].path.replace(/\\/g, '/');
        if (pdfFilePath.includes('uploads/')) {
          pdfFilePath = pdfFilePath.substring(pdfFilePath.indexOf('uploads/'));
        }
      }
    }

    const result = await req.db.query(
      `UPDATE catalogues 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description), 
           status = COALESCE($3, status),
           cover_image_path = $4,
           pdf_file_path = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, description, status, coverImagePath, pdfFilePath, id]
    );

    const updatedCatalogue = result.rows[0];

    // Handle product updates if provided
    if (product_ids !== undefined) {
      // Remove existing products
      await req.db.query('DELETE FROM catalogue_products WHERE catalogue_id = $1', [id]);
      
      // product_ids may be plain UUIDs (tile) or objects with { id, productType }
      if (selectedProductIds.length > 0) {
        const insertPromises = selectedProductIds.map((item, i) => {
          const productId = typeof item === 'object' ? (item.id || item) : item;
          const productType = typeof item === 'object' && item.productType ? item.productType : 'tile';
          if (productId) {
            return req.db.query(
              'INSERT INTO catalogue_products (catalogue_id, product_id, product_type, display_order) VALUES ($1, $2, $3, $4)',
              [id, productId, productType, i + 1]
            );
          }
        });
        await Promise.all(insertPromises.filter(Boolean));
      }
    }

    return successResponse(
      res,
      updatedCatalogue,
      'Catalogue updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (req.companyFilter) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const result = await req.db.query(
      `DELETE FROM catalogues ${whereConditions} RETURNING *`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Catalogue not found', 404));
    }

    return successResponse(
      res,
      { id },
      'Catalogue deleted successfully'
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

    if (req.companyFilter) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingCatalogue = await req.db.query(
      `SELECT id, catalogue_id FROM catalogues ${whereConditions}`,
      queryParams
    );

    if (existingCatalogue.rows.length === 0) {
      return next(new AppError('Catalogue not found', 404));
    }

    await req.db.query(
      `DELETE FROM catalogues ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingCatalogue.rows[0].id, catalogue_id: existingCatalogue.rows[0].catalogue_id },
      'Catalogue permanently deleted'
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

    if (req.companyFilter) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const existingCatalogue = await req.db.query(
      `SELECT id, status FROM catalogues ${whereConditions}`,
      queryParams
    );

    if (existingCatalogue.rows.length === 0) {
      return next(new AppError('Catalogue not found', 404));
    }

    const currentStatus = existingCatalogue.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    const result = await req.db.query(
      `UPDATE catalogues 
       SET status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, newStatus]
    );

    return successResponse(
      res,
      result.rows[0],
      `Catalogue status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};

export const createProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return next(new AppError('Products array is required and must not be empty', 400));
    }

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const catalogueCheck = await req.db.query(
      `SELECT id FROM catalogues ${whereConditions}`,
      queryParams
    );

    if (catalogueCheck.rows.length === 0) {
      return next(new AppError('Catalogue not found', 404));
    }

    const insertedProducts = [];
    for (const product of products) {
      const { product_id, display_order, custom_price } = product;

      if (!product_id) {
        return next(new AppError('product_id is required for each product', 400));
      }

      const result = await req.db.query(
        `INSERT INTO catalogue_products 
         (catalogue_id, product_id, display_order, custom_price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (catalogue_id, product_id) DO UPDATE 
         SET display_order = EXCLUDED.display_order, custom_price = EXCLUDED.custom_price
         RETURNING *`,
        [id, product_id, display_order || null, custom_price || null]
      );

      insertedProducts.push(result.rows[0]);
    }

    return successResponse(
      res,
      { 
        catalogue_id: id,
        added_count: insertedProducts.length,
        products: insertedProducts
      },
      `${insertedProducts.length} product(s) added to catalogue successfully`,
      201
    );
  } catch (error) {
    next(error);
  }
};

export const removeProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { product_ids } = req.body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return next(new AppError('product_ids array is required and must not be empty', 400));
    }

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const catalogueCheck = await req.db.query(
      `SELECT id FROM catalogues ${whereConditions}`,
      queryParams
    );

    if (catalogueCheck.rows.length === 0) {
      return next(new AppError('Catalogue not found', 404));
    }

    const placeholders = product_ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await req.db.query(
      `DELETE FROM catalogue_products 
       WHERE catalogue_id = $1 AND product_id IN (${placeholders})
       RETURNING *`,
      [id, ...product_ids]
    );

    return successResponse(
      res,
      { 
        catalogue_id: id,
        removed_count: result.rows.length,
        removed_products: result.rows
      },
      `${result.rows.length} product(s) removed from catalogue successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const updateProductInCatalogue = async (req, res, next) => {
  try {
    const { id, productId } = req.params;
    const { display_order, custom_price } = req.body;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter') && req.companyFilter !== null) {
      whereConditions += ' AND company_id = $2';
      queryParams.push(req.companyFilter);
    }

    const catalogueCheck = await req.db.query(
      `SELECT id FROM catalogues ${whereConditions}`,
      queryParams
    );

    if (catalogueCheck.rows.length === 0) {
      return next(new AppError('Catalogue not found', 404));
    }

    const result = await req.db.query(
      `UPDATE catalogue_products 
       SET display_order = COALESCE($3, display_order),
           custom_price = COALESCE($4, custom_price)
       WHERE catalogue_id = $1 AND product_id = $2
       RETURNING *`,
      [id, productId, display_order, custom_price]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Product not found in this catalogue', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Product settings updated in catalogue successfully'
    );
  } catch (error) {
    next(error);
  }
};
