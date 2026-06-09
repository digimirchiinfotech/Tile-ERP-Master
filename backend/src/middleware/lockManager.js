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

import { AppError } from './errorHandler.js';

const TABLE_MAP = {
  PI: { table: 'proforma_invoices', lockColumn: 'is_locked', lockValue: true },
  PO: { table: 'proforma_orders', lockColumn: 'is_locked', lockValue: true },
  EXPORT_INVOICE: { table: 'export_invoices', lockColumn: 'is_locked', lockValue: true },
  PACKING_LIST: { table: 'packing_lists', lockColumn: 'is_locked', lockValue: true },
  ANNEXURE: { table: 'export_invoice_annexures', lockColumn: 'is_locked', lockValue: true },
  VGM: { table: 'vgm_documents', lockColumn: 'is_locked', lockValue: true },
  SHIPPING_INSTRUCTION: { table: 'shipping_instructions', lockColumn: 'is_locked', lockValue: true },
  INVOICE_BACKSIDE: { table: 'invoice_backside', lockColumn: 'is_locked', lockValue: true },
  IGST_INVOICE: { table: 'igst_invoices', lockColumn: 'is_locked', lockValue: true },
};

/**
 * Middleware to prevent modifications to locked documents
 * @param {string} documentType - The key from TABLE_MAP
 * @param {Object} options - Configuration options
 */
export const validateDocumentLock = (documentType, options = {}) => {
  const { idParam = 'id', idField = 'id' } = options;
  
  return async (req, res, next) => {
    try {
      const docId = req.params[idParam];
      const config = TABLE_MAP[documentType];

      if (!config) return next(new AppError(`Lock configuration not found for: ${documentType}`, 500));
      if (!docId) return next();

      const companyId = req.companyFilter || req.user?.companyId;
      let whereClause = `WHERE ${idField} = $1`;
      const params = [docId];

      if (companyId) {
        whereClause += ' AND company_id = $2';
        params.push(companyId);
      }

      // Use req.db.query which is context-aware
      const result = await req.db.query(
        `SELECT ${config.lockColumn} FROM ${config.table} ${whereClause} LIMIT 1`,
        params
      );

      if (result.rows.length === 0) return next();

      const isLocked = result.rows[0][config.lockColumn] === config.lockValue;

      if (isLocked) {
        return next(new AppError(
          `This ${documentType.replace('_', ' ')} is locked and cannot be modified.`,
          403
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const checkDocumentLock = validateDocumentLock;
export const preventLockedDocumentModification = validateDocumentLock;
