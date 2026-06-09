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

const STANDARD_TRANSITIONS = {
  Draft: ['Pending', 'Prepared', 'Processing', 'Approved', 'Cancelled', 'REVISION_REQUIRED', 'REJECTED'],
  Pending: ['Prepared', 'Processing', 'Approved', 'Cancelled', 'Draft', 'REVISION_REQUIRED', 'REJECTED'],
  Prepared: ['Processing', 'Approved', 'Cancelled', 'Pending', 'REVISION_REQUIRED', 'REJECTED'],
  Processing: ['Approved', 'Cancelled', 'Prepared', 'REVISION_REQUIRED', 'REJECTED'],
  Approved: ['Locked', 'Revised', 'Cancelled', 'Draft', 'REVISION_REQUIRED'],
  Cancelled: ['Draft'],
  Revised: ['Approved', 'Draft'],
  Locked: [],
  Converted: ['Prepared', 'Draft', 'Pending', 'Processing', 'Approved', 'Cancelled'],
  Active: ['Draft', 'Pending', 'Prepared', 'Processing', 'Approved', 'Cancelled'],
  Inactive: ['Draft', 'Pending', 'Prepared', 'Processing', 'Approved', 'Cancelled'],
  REVISION_REQUIRED: ['Draft', 'Pending', 'Prepared', 'Processing', 'Approved', 'Cancelled', 'REJECTED'],
  REJECTED: ['Draft', 'Cancelled']
};

const ALLOWED_TRANSITIONS = {
  PI: STANDARD_TRANSITIONS,
  PO: STANDARD_TRANSITIONS,
  EXPORT_INVOICE: STANDARD_TRANSITIONS,
  PACKING_LIST: STANDARD_TRANSITIONS,
  ANNEXURE: STANDARD_TRANSITIONS,
  VGM: STANDARD_TRANSITIONS,
  SHIPPING_INSTRUCTION: STANDARD_TRANSITIONS,
  INVOICE_BACKSIDE: STANDARD_TRANSITIONS,
  IGST_INVOICE: STANDARD_TRANSITIONS
};

const TABLE_MAP = {
  PI: 'proforma_invoices',
  PO: 'proforma_orders',
  EXPORT_INVOICE: 'export_invoices',
  PACKING_LIST: 'packing_lists',
  ANNEXURE: 'export_invoice_annexures',
  VGM: 'vgm_documents',
  SHIPPING_INSTRUCTION: 'shipping_instructions',
  INVOICE_BACKSIDE: 'invoice_backside',
  IGST_INVOICE: 'igst_invoices'
};

export const validateStatusTransition = (documentType) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status: newStatus } = req.body;

      if (!newStatus) return next(new AppError('New status is required', 400));

      const table = TABLE_MAP[documentType];
      if (!table) return next(new AppError(`Unknown document type: ${documentType}`, 400));

      const transitions = ALLOWED_TRANSITIONS[documentType];
      if (!transitions) return next(new AppError(`No transitions defined for document type: ${documentType}`, 400));

      let whereClause = 'WHERE id = $1';
      const params = [id];

      if (req.companyFilter) {
        whereClause += ' AND company_id = $2';
        params.push(req.companyFilter);
      }

      // Use req.db.query which is context-aware
      const result = await req.db.query(
        `SELECT id, status FROM ${table} ${whereClause}`,
        params
      );

      if (result.rows.length === 0) return next(new AppError('Document not found', 404));

      const currentStatus = result.rows[0].status || 'Draft';

      if (req.user.role === 'super_admin' && newStatus === 'Draft') return next();

      const allowed = transitions[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        return next(
          new AppError(
            `Invalid status transition: cannot change from '${currentStatus}' to '${newStatus}'.`,
            400
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
