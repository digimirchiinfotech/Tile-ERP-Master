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

import { info, error as logError } from '../utils/debugLogger.js';

// Configuration mapping for bulk operations
export const resourceConfig = {
  invoices: {
    table: 'proforma_invoices',
    idColumn: 'id',
    dependencies: [
      { table: 'packing_lists', fk: 'proforma_invoice_id', message: 'Linked to a Packing List' },
      { table: 'proforma_orders', fk: 'proforma_invoice_id', message: 'Linked to an Order' },
      { table: 'export_invoices', fk: 'proforma_invoice_id', message: 'Linked to an Export Invoice' }
    ],
    allowedUpdates: ['status', 'payment_status', 'priority'],
    permission: 'proforma_invoice'
  },
  orders: {
    table: 'proforma_orders',
    idColumn: 'id',
    dependencies: [
      { table: 'proforma_invoices', fk: 'order_id', message: 'Linked to a Proforma Invoice' }
    ],
    allowedUpdates: ['status', 'priority'],
    permission: 'proforma_order'
  },
  leads: {
    table: 'leads',
    idColumn: 'id',
    dependencies: [], // Leads can usually be safely deleted or updated
    allowedUpdates: ['status', 'priority', 'assigned_to'],
    permission: 'lead_management'
  },
  products: {
    table: 'products',
    idColumn: 'id',
    dependencies: [
      { table: 'proforma_invoice_items', fk: 'product_id', message: 'Used in a Proforma Invoice' },
      { table: 'proforma_order_items', fk: 'product_id', message: 'Used in an Order' },
      { table: 'packing_list_items', fk: 'product_id', message: 'Used in a Packing List' }
    ],
    allowedUpdates: ['status', 'category'],
    permission: 'product_management'
  },
  clients: {
    table: 'clients',
    idColumn: 'id',
    dependencies: [
      { table: 'proforma_invoices', fk: 'client_id', message: 'Has active Invoices' },
      { table: 'proforma_orders', fk: 'client_id', message: 'Has active Orders' },
      { table: 'export_invoices', fk: 'client_id', message: 'Has active Export Invoices' }
    ],
    allowedUpdates: ['status', 'assigned_to'],
    permission: 'client_management'
  },
  suppliers: {
    table: 'suppliers',
    idColumn: 'id',
    dependencies: [
      { table: 'products', fk: 'supplier_id', message: 'Supplies active products' }
    ],
    allowedUpdates: ['status'],
    permission: 'supplier_management'
  },
  catalogues: {
    table: 'catalogues',
    idColumn: 'id',
    dependencies: [],
    allowedUpdates: ['status'],
    permission: 'catalogue_management'
  },
  'qc-records': {
    table: 'qc_records',
    idColumn: 'id',
    dependencies: [],
    allowedUpdates: ['qc_status'],
    permission: 'qc_management',
    softDeleteColumn: 'deleted_at'
  },
  'export-invoices': {
    table: 'export_invoices',
    idColumn: 'id',
    dependencies: [
      { table: 'packing_lists', fk: 'export_invoice_id', message: 'Linked to a Packing List' },
      { table: 'vgm_documents', fk: 'export_invoice_id', message: 'Linked to a VGM Document' },
      { table: 'shipping_instructions', fk: 'export_invoice_id', message: 'Linked to Shipping Instructions' },
      { table: 'export_invoice_annexures', fk: 'export_invoice_id', message: 'Linked to an Annexure' },
      { table: 'invoice_backside', fk: 'export_invoice_id', message: 'Linked to a Backside' }
    ],
    allowedUpdates: ['status'],
    permission: 'export_management',
    softDeleteColumn: 'deleted_at'
  },
  'packing-lists': {
    table: 'packing_lists',
    idColumn: 'id',
    dependencies: [],
    allowedUpdates: ['status'],
    permission: 'export_management',
    softDeleteColumn: 'deleted_at'
  },
  'vgm-documents': {
    table: 'vgm_documents',
    idColumn: 'id',
    dependencies: [],
    allowedUpdates: ['status'],
    permission: 'export_management',
    softDeleteColumn: 'deleted_at'
  },
  'shipping-instructions': {
    table: 'shipping_instructions',
    idColumn: 'id',
    dependencies: [],
    allowedUpdates: ['status'],
    permission: 'export_management',
    softDeleteColumn: 'deleted_at'
  },
  'annexures': {
    table: 'export_invoice_annexures',
    idColumn: 'id',
    dependencies: [],
    allowedUpdates: ['status'],
    permission: 'export_management',
    softDeleteColumn: 'deleted_at'
  },
  'backsides': {
    table: 'invoice_backside',
    idColumn: 'id',
    dependencies: [],
    allowedUpdates: ['status'],
    permission: 'export_management',
    softDeleteColumn: 'deleted_at'
  }
};

/**
 * Safely updates multiple records using a transaction and partial failure tracking.
 */
export const processBulkUpdate = async (db, companyId, userId, resource, ids, data) => {
  const config = resourceConfig[resource];
  if (!config) throw new Error(`Resource ${resource} is not supported for bulk updates`);

  const updateFields = Object.keys(data).filter(key => config.allowedUpdates.includes(key));
  if (updateFields.length === 0) throw new Error('No valid fields provided for update or action is not permitted.');

  let processed = 0;
  const failed = [];
  const errors = [];

  try {
    await db.query('BEGIN');
    
    let companyCondition = '';
    const values = [ids];
    
    if (companyId === null) {
      companyCondition = 'AND company_id IS NULL';
    } else {
      companyCondition = `AND company_id = $2`;
      values.push(companyId);
    }
    
    // Filter out locked documents for tables that support locking
    const documentTables = ['proforma_invoices', 'proforma_orders', 'export_invoices', 'packing_lists', 'vgm_documents', 'shipping_instructions', 'export_invoice_annexures', 'invoice_backside', 'igst_invoices'];
    let safeUpdateIds = [...ids];
    
    if (documentTables.includes(config.table)) {
      let lockCheckSql = `SELECT id FROM ${config.table} WHERE id = ANY($1) AND is_locked = true`;
      let lockParams = [ids];
      if (companyId) {
        lockCheckSql += ` AND company_id = $2`;
        lockParams.push(companyId);
      }
      const lockedRes = await db.query(lockCheckSql, lockParams);
      const lockedIds = lockedRes.rows.map(r => r.id);
      
      if (lockedIds.length > 0) {
        safeUpdateIds = safeUpdateIds.filter(id => !lockedIds.includes(id));
        for (const id of lockedIds) {
          failed.push(id);
          errors.push({ id, reason: 'Document is locked and cannot be modified' });
        }
      }
    }
    
    if (safeUpdateIds.length === 0) {
      await db.query('ROLLBACK');
      return { success: true, processed: 0, failed: failed.length, errors };
    }
    
    values[0] = safeUpdateIds;
    
    // Add update field values
    const startingParam = values.length + 1;
    const setClause = updateFields.map((field, idx) => `${field} = $${startingParam + idx}`).join(', ');
    values.push(...updateFields.map(f => data[f]));

    const sql = `
      UPDATE ${config.table} 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE ${config.idColumn} = ANY($1) ${companyCondition}
      RETURNING ${config.idColumn}
    `;
    
    const result = await db.query(sql, values);
    processed = result.rowCount;
    
    // Track exactly which IDs failed (not found, soft deleted, or access denied)
    const updatedIds = result.rows.map(r => r[config.idColumn]);
    for (const id of ids) {
      if (!updatedIds.includes(id)) {
        failed.push(id);
        errors.push({ id, reason: 'Record not found or access denied' });
      }
    }

    await db.query('COMMIT');
    
    info('BulkService', `User ${userId} bulk updated ${processed} ${resource}`, { resource, updateFields, processed, failed: failed.length });
  } catch (err) {
    await db.query('ROLLBACK');
    logError('BulkService', `Bulk update failed for ${resource}`, err);
    throw new Error('Database transaction failed during bulk update');
  }

  return { success: true, processed, failed: failed.length, errors };
};

/**
 * Safely soft-deletes multiple records after pre-checking foreign key dependencies.
 */
export const processBulkDelete = async (db, companyId, userId, resource, ids) => {
  const config = resourceConfig[resource];
  if (!config) throw new Error(`Resource ${resource} is not supported for bulk deletions`);

  let processed = 0;
  const failed = [];
  const errors = [];
  const safeIds = [];

  // Pre-check dependencies before beginning the transaction
  if (config.dependencies && config.dependencies.length > 0) {
    for (const id of ids) {
      let isSafe = true;
      for (const dep of config.dependencies) {
        try {
          const checkSql = `SELECT 1 FROM ${dep.table} WHERE ${dep.fk} = $1 AND company_id = $2 LIMIT 1`;
          const checkRes = await db.query(checkSql, [id, companyId]);
          if (checkRes.rowCount > 0) {
            isSafe = false;
            failed.push(id);
            errors.push({ id, reason: dep.message });
            break; // Skip further checks if one dependency is already violated
          }
        } catch (checkErr) {
          // If the table doesn't exist or isn't enabled for this tenant, ignore the check
          if (checkErr.code === '42P01') {
            continue;
          }
          throw checkErr;
        }
      }
      if (isSafe) safeIds.push(id);
    }
  } else {
    safeIds.push(...ids);
  }

  // Check locks
  const documentTables = ['proforma_invoices', 'proforma_orders', 'export_invoices', 'packing_lists', 'vgm_documents', 'shipping_instructions', 'export_invoice_annexures', 'invoice_backside', 'igst_invoices'];
  if (documentTables.includes(config.table) && safeIds.length > 0) {
    try {
      let lockCheckSql = `SELECT id FROM ${config.table} WHERE id = ANY($1) AND is_locked = true`;
      let lockParams = [safeIds];
      if (companyId) {
        lockCheckSql += ` AND company_id = $2`;
        lockParams.push(companyId);
      }
      const lockedRes = await db.query(lockCheckSql, lockParams);
      const lockedIds = lockedRes.rows.map(r => r.id);
      
      if (lockedIds.length > 0) {
        // Remove locked from safeIds
        for (let i = safeIds.length - 1; i >= 0; i--) {
          if (lockedIds.includes(safeIds[i])) {
            failed.push(safeIds[i]);
            errors.push({ id: safeIds[i], reason: 'Document is locked and cannot be deleted' });
            safeIds.splice(i, 1);
          }
        }
      }
    } catch (lockErr) {
       console.error('Lock check failed', lockErr);
    }
  }

  if (safeIds.length > 0) {
    try {
      await db.query('BEGIN');
      const deleteClause = config.softDeleteColumn 
        ? `${config.softDeleteColumn} = CURRENT_TIMESTAMP` 
        : `status = 'Deleted'`;
      const condition = config.softDeleteColumn 
        ? `${config.softDeleteColumn} IS NULL` 
        : `status != 'Deleted'`;

      let companyCondition = '';
      const deleteParams = [safeIds];
      
      if (companyId === null) {
        companyCondition = 'AND company_id IS NULL';
      } else {
        companyCondition = 'AND company_id = $2';
        deleteParams.push(companyId);
      }

      const sql = `
        UPDATE ${config.table} 
        SET ${deleteClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE ${config.idColumn} = ANY($1) ${companyCondition} AND ${condition}
        RETURNING ${config.idColumn}
      `;
      const result = await db.query(sql, deleteParams);
      processed = result.rowCount;
      
      // Find IDs that were considered safe but still didn't update (e.g. already deleted or missing)
      const updatedIds = result.rows.map(r => r[config.idColumn]);
      for (const id of safeIds) {
        if (!updatedIds.includes(id)) {
          failed.push(id);
          errors.push({ id, reason: 'Record not found, already deleted, or access denied' });
        }
      }
      
      await db.query('COMMIT');
      info('BulkService', `User ${userId} bulk soft-deleted ${processed} ${resource}`, { resource, processed, failed: failed.length });
    } catch (err) {
      await db.query('ROLLBACK');
      logError('BulkService', `Bulk delete failed for ${resource}`, err);
      throw new Error('Database transaction failed during bulk delete');
    }
  }

  return { success: true, processed, failed: failed.length, errors };
};
