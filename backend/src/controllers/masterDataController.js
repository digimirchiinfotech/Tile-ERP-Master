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

const TABLE_MAPPING = {
  countries: { table: 'master_countries', column: 'country_name', global: true },
  cities: { table: 'master_cities', column: 'city_name', global: true },
  ports: { table: 'ports', column: 'name', global: true },
  catalogueNames: { table: 'catalogues', column: 'name', global: false },
  palletTypes: { table: 'pallet_types', column: 'type', global: false },
  palletCategories: { table: 'pallet_categories', column: 'category', global: false },
  countries: { table: 'master_countries', column: 'country_name', global: false },
  warehouseLocations: { table: 'warehouse_locations', column: 'location', global: false },
  tilesBack: { table: 'tiles_back', column: 'type', global: false },
  boxesMarking: { table: 'boxes_marking', column: 'marking', global: false },
  boxTypes: { table: 'box_types', column: 'type', global: false },
  products: { table: 'products', column: 'name', global: false },
  categories: { table: 'product_categories', column: 'category', global: false },
  sizes: { table: 'product_sizes', column: 'size', global: false },
  surfaces: { table: 'product_surfaces', column: 'surface', global: false },
  applications: { table: 'product_applications', column: 'application', global: false },
  thickness: { table: 'product_thickness', column: 'thickness', global: false },   // table: product_thickness (no s)
  shippingLines: { table: 'shipping_lines', column: 'name', global: false },
  currencies: { table: 'currencies', column: 'code', global: false },               // tenant-scoped per databaseProvisioning.js
  portsOfLoading: { table: 'ports_of_loading', column: 'name', global: false },
  portsOfDischarge: { table: 'ports_of_discharge', column: 'name', global: false },
  finalDestinations: { table: 'final_destinations', column: 'destination', global: false }, // column is 'destination', not 'name'
  businessTerms: { table: 'business_terms', column: 'term', global: false },
  factoryNames: { table: 'factory_names', column: 'name', global: false },             // real table is factory_names
  deliveryTerms: { table: 'delivery_terms', column: 'term', global: false },
  paymentTerms: { table: 'payment_terms', column: 'term', global: false },
  tariffCodes: { table: 'tariff_codes', column: 'code', global: false },
  authorizedSignatories: { table: 'authorized_signatories', column: 'name', global: false },
  contactDetails: { table: 'contact_details', column: 'name', global: false },
  maxPermissibleWeights: { table: 'max_permissible_weights', column: 'weight', global: false }
};

const toCamelCase = (str) => str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
const transformRowsToCamelCase = (rows) => rows.map(row => {
  const camelCaseRow = {};
  for (const [key, value] of Object.entries(row)) camelCaseRow[toCamelCase(key)] = value;
  return camelCaseRow;
});

const ensureTableExists = async (queryFn, config) => {
  if (config.global) return;
  try {
    const checkQuery = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${config.table}')`;
    const { rows } = await queryFn(checkQuery);
    if (!rows[0].exists) {
      let createQuery = `
        CREATE TABLE IF NOT EXISTS public.${config.table} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID,
          ${config.column} TEXT NOT NULL,
          ${config.table === 'box_types' ? 'image_url TEXT NULL,' : ''}
          status VARCHAR(20) DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID
        );
      `;
      await queryFn(createQuery);
      debugLogger.info(`[MasterData] Created table ${config.table}`);
    } else {
      // Table exists — run idempotent column migration to heal schemas from older deployments
      // that may have been created without the correct column name.
      try {
        await queryFn(`ALTER TABLE public.${config.table} ADD COLUMN IF NOT EXISTS ${config.column} TEXT`);
      } catch (colErr) {
        debugLogger.warn(`[MasterData] Could not add column ${config.column} to ${config.table}: ${colErr.message}`);
      }
      if (config.table === 'box_types') {
        try {
          await queryFn(`ALTER TABLE public.${config.table} ADD COLUMN IF NOT EXISTS image_url TEXT`);
        } catch (colErr) { /* ignore */ }
      }
    }
  } catch (err) {
    debugLogger.error(`[MasterData] Error ensuring table ${config.table} exists:`, err.message);
  }
};

export const getAllMasterData = async (req, res, next) => {
  try {
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const results = {};
    for (const [key, config] of Object.entries(TABLE_MAPPING)) {
      let query;
      let params;
      if (key === 'catalogueNames') {
        if (companyId) {
          query = `SELECT DISTINCT id, name as value, status FROM catalogues WHERE company_id = $1 AND status = 'Active' ORDER BY name ASC`;
          params = [companyId];
        } else {
          query = `SELECT DISTINCT id, name as value, status FROM catalogues WHERE company_id IS NULL AND status = 'Active' ORDER BY name ASC`;
          params = [];
        }
      } else if (config.global) {
        query = `SELECT DISTINCT id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''} FROM ${config.table} WHERE (status = 'Active' OR status IS NULL) ORDER BY value ASC`;
        params = [];
      } else if (companyId) {
        query = `SELECT DISTINCT id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''} FROM ${config.table} WHERE company_id = $1 AND (status = 'Active' OR status IS NULL) ORDER BY value ASC`;
        params = [companyId];
      } else {
        query = `SELECT DISTINCT id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''} FROM ${config.table} WHERE company_id IS NULL AND (status = 'Active' OR status IS NULL) ORDER BY value ASC`;
        params = [];
      }
      try {
        const queryExecutor = config.global ? (req.db.globalQuery || req.db.query) : req.db.query;
        await ensureTableExists(queryExecutor, config);
        const { rows } = await queryExecutor(query, params);
        results[key] = transformRowsToCamelCase(rows);
      } catch (err) {
        results[key] = [];
      }
    }
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

export const getMasterDataByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id);
    const lookupType = TABLE_MAPPING[type] ? type : (type.endsWith('s') ? type.slice(0, -1) : type + 's');
    const config = TABLE_MAPPING[lookupType] || TABLE_MAPPING[type];
    if (!config) return res.status(400).json({ success: false, message: `Invalid type` });

    let query, params;
    if (type === 'catalogueNames') {
      if (companyId) {
        query = `SELECT DISTINCT id, name as value, status FROM catalogues WHERE company_id = $1 AND status = 'Active' ORDER BY name ASC`;
        params = [companyId];
      } else {
        query = `SELECT DISTINCT id, name as value, status FROM catalogues WHERE company_id IS NULL AND status = 'Active' ORDER BY name ASC`;
        params = [];
      }
    } else if (config.global) {
      if (type === 'currencies') {
        query = `SELECT DISTINCT id, ${config.column} as value FROM ${config.table} ORDER BY value ASC`;
      } else {
        query = `SELECT DISTINCT id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''} FROM ${config.table} WHERE (status = 'Active' OR status IS NULL) ORDER BY value ASC`;
      }
      params = [];
    } else if (companyId) {
      query = `SELECT DISTINCT id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''} FROM ${config.table} WHERE company_id = $1 AND (status = 'Active' OR status IS NULL) ORDER BY value ASC`;
      params = [companyId];
    } else {
      query = `SELECT DISTINCT id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''} FROM ${config.table} WHERE company_id IS NULL AND (status = 'Active' OR status IS NULL) ORDER BY value ASC`;
      params = [];
    }

    const queryExecutor = config.global ? (req.db.globalQuery || req.db.query) : req.db.query;
    await ensureTableExists(queryExecutor, config);
    const { rows } = await queryExecutor(query, params);
    res.json({ success: true, data: transformRowsToCamelCase(rows) });
  } catch (error) {
    next(error);
  }
};

export const getMasterDataById = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const config = TABLE_MAPPING[type];
    if (!config) return res.status(404).json({ success: false, message: `Not found` });
    const queryExecutor = config.global ? (req.db.globalQuery || req.db.query) : req.db.query;
    await ensureTableExists(queryExecutor, config);
    const { rows } = await queryExecutor(`SELECT *, ${config.column} as value FROM ${config.table} WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: transformRowsToCamelCase(rows)[0] });
  } catch (error) {
    next(error);
  }
};

export const createMasterData = async (req, res, next) => {
  try {
    const { type } = req.params;
    const body = req.body;
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const config = TABLE_MAPPING[type];
    if (!config) return res.status(400).json({ success: false, message: `Invalid type` });

    const clientGetter = config.global ? (req.db.getGlobalClient || req.db.getClient) : req.db.getClient;
    const client = await clientGetter();
    try {
      await client.query('BEGIN');
      const rawValue = body.value || body.name || body.cityName || body.countryName || body.portName || body.term || body.type || body.marking || body.destination || body[config.column];
      let trimmedValue = rawValue ? String(rawValue).trim() : undefined;
      if (trimmedValue && (config.table === 'master_cities' || config.table === 'master_countries')) {
        trimmedValue = trimmedValue.toUpperCase();
      }
      if (!trimmedValue) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Value is required' });
      }

      let checkQuery, checkParams;
      if (config.global) {
        checkQuery = `SELECT id FROM ${config.table} WHERE LOWER(${config.column}) = LOWER($1)`;
        checkParams = [trimmedValue];
      } else {
        checkQuery = `SELECT id FROM ${config.table} WHERE company_id = $1 AND LOWER(${config.column}) = LOWER($2)`;
        checkParams = [companyId, trimmedValue];
      }
      const checkResult = await client.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: `${trimmedValue} already exists` });
      }

      const columns = [config.column];
      const values = [trimmedValue];
      let paramCount = 2;
      let placeholders = '$1';

      const imgUrl = body.image_url !== undefined ? body.image_url : body.imageUrl;
      if (config.table === 'box_types' && imgUrl !== undefined) {
        columns.push('image_url');
        values.push(imgUrl === '' ? null : imgUrl);
        placeholders += `, $${paramCount++}`;
      }

      if (config.table === 'master_cities' && body.countryCode !== undefined) {
        columns.push('country_code');
        values.push(body.countryCode === '' ? null : body.countryCode);
        placeholders += `, $${paramCount++}`;
      }

      if (config.table === 'master_countries') {
        if (body.countryCode !== undefined) {
          columns.push('country_code');
          values.push(body.countryCode === '' ? null : body.countryCode);
          placeholders += `, $${paramCount++}`;
        }
        if (body.isoAlpha2 !== undefined) {
          columns.push('iso_alpha_2');
          values.push(body.isoAlpha2 === '' ? null : body.isoAlpha2);
          placeholders += `, $${paramCount++}`;
        }
        if (body.isoAlpha3 !== undefined) {
          columns.push('iso_alpha_3');
          values.push(body.isoAlpha3 === '' ? null : body.isoAlpha3);
          placeholders += `, $${paramCount++}`;
        }
      }

      let insertQuery;
      if (config.global) {
        insertQuery = `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''}`;
      } else {
        columns.push('company_id');
        values.push(companyId);
        placeholders += `, $${paramCount++}`;
        insertQuery = `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''}`;
      }

      const { rows } = await client.query(insertQuery, values);
      await client.query('COMMIT');
      res.status(201).json({ success: true, message: `Added successfully`, data: transformRowsToCamelCase([rows[0]])[0] });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const updateMasterData = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const body = req.body;
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const config = TABLE_MAPPING[type];
    if (!config) return res.status(400).json({ success: false, message: `Invalid type` });

    const clientGetter = config.global ? (req.db.getGlobalClient || req.db.getClient) : req.db.getClient;
    const client = await clientGetter();
    try {
      await client.query('BEGIN');
      const updates = [];
      const values = [];
      let paramCount = 1;

      const rawValue = body.value || body.name || body.cityName || body.countryName || body.portName || body.term || body.type || body.marking || body.destination || body[config.column];
      let value = rawValue !== undefined ? String(rawValue).trim() : undefined;
      if (value && (config.table === 'master_cities' || config.table === 'master_countries')) {
        value = value.toUpperCase();
      }

      if (value !== undefined && value) {
        let checkQuery, checkParams;
        if (config.global) {
          checkQuery = `SELECT id FROM ${config.table} WHERE LOWER(${config.column}) = LOWER($1) AND id != $2`;
          checkParams = [value.trim(), id];
        } else {
          checkQuery = `SELECT id FROM ${config.table} WHERE company_id = $1 AND LOWER(${config.column}) = LOWER($2) AND id != $3`;
          checkParams = [companyId, value.trim(), id];
        }
        const checkResult = await client.query(checkQuery, checkParams);
        if (checkResult.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ success: false, message: `${value.trim()} already exists` });
        }
        updates.push(`${config.column} = $${paramCount++}`);
        values.push(value.trim());
      }

      if (body.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(body.status);
      }

      const updateImgUrl = body.image_url !== undefined ? body.image_url : body.imageUrl;
      if (config.table === 'box_types' && updateImgUrl !== undefined) {
        updates.push(`image_url = $${paramCount++}`);
        values.push(updateImgUrl === '' ? null : updateImgUrl);
      }

      if (config.table === 'master_cities' && body.countryCode !== undefined) {
        updates.push(`country_code = $${paramCount++}`);
        values.push(body.countryCode === '' ? null : body.countryCode);
      }

      if (config.table === 'master_countries') {
        if (body.countryCode !== undefined) {
          updates.push(`country_code = $${paramCount++}`);
          values.push(body.countryCode === '' ? null : body.countryCode);
        }
        if (body.isoAlpha2 !== undefined) {
          updates.push(`iso_alpha_2 = $${paramCount++}`);
          values.push(body.isoAlpha2 === '' ? null : body.isoAlpha2);
        }
        if (body.isoAlpha3 !== undefined) {
          updates.push(`iso_alpha_3 = $${paramCount++}`);
          values.push(body.isoAlpha3 === '' ? null : body.isoAlpha3);
        }
      }

      if (updates.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      let updateQuery;
      if (config.global) {
        updateQuery = `UPDATE ${config.table} SET ${updates.join(', ')} WHERE id = $${paramCount++} RETURNING id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''}`;
      } else {
        values.push(companyId);
        updateQuery = `UPDATE ${config.table} SET ${updates.join(', ')} WHERE id = $${paramCount++} AND company_id = $${paramCount} RETURNING id, ${config.column} as value, status${config.table === 'box_types' ? ', image_url' : ''}`;
      }

      const { rows } = await client.query(updateQuery, values);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
      await client.query('COMMIT');
      res.json({ success: true, message: 'Updated successfully', data: transformRowsToCamelCase([rows[0]])[0] });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const deleteMasterData = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const config = TABLE_MAPPING[type];
    if (!config) return res.status(400).json({ success: false, message: `Invalid type` });
    const queryExecutor = config.global ? (req.db.globalQuery || req.db.query) : req.db.query;
    let deleteQuery, deleteParams;
    if (config.global) {
      deleteQuery = `DELETE FROM ${config.table} WHERE id = $1 RETURNING ${config.column} as value`;
      deleteParams = [id];
    } else {
      deleteQuery = `DELETE FROM ${config.table} WHERE id = $1 AND company_id = $2 RETURNING ${config.column} as value`;
      deleteParams = [id, companyId];
    }
    const { rows } = await queryExecutor(deleteQuery, deleteParams);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: `Deleted successfully` });
  } catch (error) {
    next(error);
  }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const config = TABLE_MAPPING[type];
    if (!config) return res.status(400).json({ success: false, message: `Invalid type` });
    const queryExecutor = config.global ? (req.db.globalQuery || req.db.query) : req.db.query;
    let hardDeleteQuery, hardDeleteParams;
    if (config.global) {
      hardDeleteQuery = `DELETE FROM ${config.table} WHERE id = $1 RETURNING id, ${config.column} as value`;
      hardDeleteParams = [id];
    } else {
      hardDeleteQuery = `DELETE FROM ${config.table} WHERE id = $1 AND company_id = $2 RETURNING id, ${config.column} as value`;
      hardDeleteParams = [id, companyId];
    }
    const { rows } = await queryExecutor(hardDeleteQuery, hardDeleteParams);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: `Permanently deleted`, data: { id: rows[0].id } });
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const config = TABLE_MAPPING[type];
    if (!config) return res.status(400).json({ success: false, message: `Invalid type` });
    const clientGetter = config.global ? (req.db.getGlobalClient || req.db.getClient) : req.db.getClient;
    const client = await clientGetter();
    try {
      await client.query('BEGIN');
      let selectQuery, selectParams;
      if (config.global) {
        selectQuery = `SELECT id, status FROM ${config.table} WHERE id = $1`;
        selectParams = [id];
      } else {
        selectQuery = `SELECT id, status FROM ${config.table} WHERE id = $1 AND company_id = $2`;
        selectParams = [id, companyId];
      }
      const selectResult = await client.query(selectQuery, selectParams);
      if (selectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Not found' });
      }
      const newStatus = selectResult.rows[0].status === 'Active' ? 'Inactive' : 'Active';
      await client.query(`UPDATE ${config.table} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newStatus, id]);
      await client.query('COMMIT');
      res.json({ success: true, message: `Status updated`, data: { id, status: newStatus } });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getAllCountries = async (req, res, next) => {
  try {
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const config = TABLE_MAPPING.countries;
    let query = `SELECT id, country_code, country_name, region, iso_alpha_2, iso_alpha_3 FROM master_countries WHERE (status = 'Active' OR status IS NULL)`;
    let params = [];
    if (config && config.global) {
    } else if (companyId) {
      query += ` AND (company_id = $1 OR company_id IS NULL)`;
      params = [companyId];
    } else {
      query += ` AND company_id IS NULL`;
    }
    query += ` ORDER BY country_name`;
    const result = await req.db.globalQuery(query, params);
    res.json({ success: true, data: transformRowsToCamelCase(result.rows) });
  } catch (error) {
    next(error);
  }
};

export const getCitiesByCountry = async (req, res, next) => {
  try {
    const { countryCode } = req.params;
    let query = `
      SELECT mc.id, mc.city_name, mc.state_province, mc.status,
             mcn.country_name, mcn.country_code, mcn.id as country_id
      FROM master_cities mc
      LEFT JOIN (
        SELECT DISTINCT ON (country_code) country_name, country_code, id, iso_alpha_2
        FROM master_countries 
        WHERE country_code IS NOT NULL OR iso_alpha_2 IS NOT NULL
      ) mcn ON mc.country_code = mcn.country_code
      WHERE (mcn.country_code = $1 OR mcn.iso_alpha_2 = $1)
      ORDER BY mc.city_name
    `;
    const result = await req.db.globalQuery(query, [countryCode.toUpperCase()]);
    res.json({ success: true, data: transformRowsToCamelCase(result.rows) });
  } catch (error) {
    next(error);
  }
};

export const getAllCities = async (req, res, next) => {
  try {
    let query = `
      SELECT mc.id, mc.city_name, mc.state_province, mc.status,
             mcn.country_name, mcn.country_code, mcn.id as country_id
      FROM master_cities mc
      LEFT JOIN (
        SELECT DISTINCT ON (country_code) country_name, country_code, id 
        FROM master_countries 
        WHERE country_code IS NOT NULL
      ) mcn ON mc.country_code = mcn.country_code
      ORDER BY mcn.country_name, mc.city_name
    `;
    const result = await req.db.globalQuery(query, []);
    res.json({ success: true, data: transformRowsToCamelCase(result.rows) });
  } catch (error) {
    next(error);
  }
};

export const searchCities = async (req, res, next) => {
  try {
    const { query: searchQuery } = req.query;
    let sql = `
      SELECT mc.id, mc.city_name, mc.state_province, mc.status,
             mcn.country_name, mcn.country_code, mcn.id as country_id
      FROM master_cities mc
      LEFT JOIN (
        SELECT DISTINCT ON (country_code) country_name, country_code, id 
        FROM master_countries 
        WHERE country_code IS NOT NULL
      ) mcn ON mc.country_code = mcn.country_code
      WHERE (LOWER(mc.city_name) LIKE LOWER($1) OR LOWER(COALESCE(mc.state_province,'')) LIKE LOWER($1))
      ORDER BY mcn.country_name, mc.city_name
      LIMIT 50
    `;
    const result = await req.db.globalQuery(sql, [`%${searchQuery}%`]);
    res.json({ success: true, data: transformRowsToCamelCase(result.rows) });
  } catch (error) {
    next(error);
  }
};

export const getAllPorts = async (req, res, next) => {
  try {
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const config = TABLE_MAPPING.ports;
    let query = `SELECT id, name as port_name, country as country_code, status FROM ports WHERE (status = 'Active' OR status IS NULL)`;
    let params = [];
    if (config && config.global) {
    } else if (companyId) {
      query += ` AND company_id = $1`;
      params = [companyId];
    } else {
      query += ` AND company_id IS NULL`;
    }
    query += ` ORDER BY name`;
    const result = await req.db.globalQuery(query, params);
    res.json({ success: true, data: transformRowsToCamelCase(result.rows) });
  } catch (error) {
    next(error);
  }
};

export const getPortsByCountry = async (req, res, next) => {
  try {
    const { countryCode } = req.params;
    const companyId = req.hasOwnProperty('companyFilter') ? req.companyFilter : (req.user?.companyId || req.user?.company_id || null);
    const config = TABLE_MAPPING.ports;
    let query = `SELECT id, name as port_name, country as country_code, status FROM ports WHERE country = $1 AND (status = 'Active' OR status IS NULL)`;
    let params = [countryCode];
    if (config && config.global) {
    } else if (companyId) {
      query += ` AND company_id = $2`;
      params.push(companyId);
    } else {
      query += ` AND company_id IS NULL`;
    }
    query += ` ORDER BY name`;
    const result = await req.db.globalQuery(query, params);
    res.json({ success: true, data: transformRowsToCamelCase(result.rows) });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllMasterData,
  getMasterDataByType,
  getMasterDataById,
  createMasterData,
  updateMasterData,
  deleteMasterData,
  toggleStatus,
  getAllCountries,
  getCitiesByCountry,
  getAllCities,
  searchCities,
  getAllPorts,
  getPortsByCountry,
  hardDelete
};
