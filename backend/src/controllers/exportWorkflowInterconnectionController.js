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

/**
 * Export Workflow Interconnection Controller
 * 
 * Handles all interconnection logic between export workflow stages
 */

import { debugLogger } from '../utils/debugLogger.js';
import { AppError } from '../middleware/errorHandler.js';
import { successResponse } from '../utils/helpers.js';
import * as interconnectionService from '../services/exportWorkflowInterconnectionService.js';

/**
 * Get complete workflow data from proforma invoice through all stages
 */
export const getCompleteWorkflow = async (req, res, next) => {
  try {
    const { proformaInvoiceId } = req.params;
    const companyId = req.companyFilter;

    if (!proformaInvoiceId) {
      return next(new AppError('Proforma Invoice ID is required', 400));
    }

    const result = await interconnectionService.getCompleteWorkflowData(
      proformaInvoiceId,
      companyId,
      req.db
    );

    if (result.error) {
      return next(new AppError(result.error, result.status));
    }

    return successResponse(
      res,
      result.data,
      'Complete workflow data retrieved successfully'
    );
  } catch (error) {
    debugLogger.error('Error in getCompleteWorkflow:', error);
    next(error);
  }
};

/**
 * Get export invoice workflow with all downstream stages
 */
export const getExportInvoiceWorkflow = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const companyId = req.companyFilter;

    if (!exportInvoiceId) {
      return next(new AppError('Export Invoice ID is required', 400));
    }

    const result = await interconnectionService.getExportInvoiceWorkflow(
      exportInvoiceId,
      companyId,
      req.db
    );

    if (result.error) {
      return next(new AppError(result.error, result.status));
    }

    return successResponse(
      res,
      result.data,
      'Export invoice workflow retrieved successfully'
    );
  } catch (error) {
    debugLogger.error('Error in getExportInvoiceWorkflow:', error);
    next(error);
  }
};

/**
 * Get data for creating next stage document
 * Automatically inherits and maps data from previous stage
 */
export const getDataForNextStage = async (req, res, next) => {
  try {
    const { stage, documentId } = req.params;
    const companyId = req.companyFilter;

    if (!stage || !documentId) {
      return next(new AppError('Stage and Document ID are required', 400));
    }

    const result = await interconnectionService.getDataForNextStage(
      stage,
      documentId,
      companyId,
      req.db
    );

    if (result.error) {
      return next(new AppError(result.error, result.status));
    }

    return successResponse(
      res,
      result.inheritedData,
      `Data for next stage after ${stage} retrieved successfully`
    );
  } catch (error) {
    debugLogger.error('Error in getDataForNextStage:', error);
    next(error);
  }
};

/**
 * Get workflow completion summary
 */
export const getWorkflowCompletionSummary = async (req, res, next) => {
  try {
    const { exportInvoiceId } = req.params;
    const companyId = req.companyFilter;

    if (!exportInvoiceId) {
      return next(new AppError('Export Invoice ID is required', 400));
    }

    const result = await interconnectionService.getWorkflowCompletionSummary(
      exportInvoiceId,
      companyId,
      req.db
    );

    if (result.error) {
      return next(new AppError(result.error, result.status));
    }

    return successResponse(
      res,
      result.data,
      'Workflow completion summary retrieved successfully'
    );
  } catch (error) {
    debugLogger.error('Error in getWorkflowCompletionSummary:', error);
    next(error);
  }
};

/**
 * Sync updates across related documents
 */
export const syncUpdatesAcrossStages = async (req, res, next) => {
  try {
    const { documentId, stage, changedFields } = req.body;
    const companyId = req.companyFilter;

    if (!documentId || !stage || !changedFields) {
      return next(new AppError('documentId, stage, and changedFields are required', 400));
    }

    if (!Array.isArray(changedFields)) {
      return next(new AppError('changedFields must be an array', 400));
    }

    const client = await req.db.getClient();
    try {
      await client.query('BEGIN');
      const result = await interconnectionService.syncUpdatesAcrossStages(
        documentId,
        stage,
        changedFields,
        companyId,
        client // Pass the transactional client
      );

      if (result.error) {
        await client.query('ROLLBACK');
        return next(new AppError(result.error, result.status));
      }

      await client.query('COMMIT');
      return successResponse(
        res,
        result.syncLog,
        'Updates synced across stages successfully'
      );
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    debugLogger.error('Error in syncUpdatesAcrossStages:', error);
    next(error);
  }
};

/**
 * Get all export invoices with their workflow status
 */
export const getAllWorkflowStatus = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { search, status } = req.query;

    let whereConditions = 'WHERE ei.company_id = $1';
    let queryParams = [companyId];
    let paramCount = 2;

    if (search) {
      whereConditions += ` AND (ei.invoice_no ILIKE $${paramCount} OR ei.client_name ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      whereConditions += ` AND ei.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    const result = await req.db.query(
      `SELECT 
        ei.id,
        ei.invoice_no,
        ei.invoice_date,
        ei.client_name,
        ei.status as export_invoice_status,
        BOOL_OR(pl.id IS NOT NULL) as has_packing_list,
        BOOL_OR(eia.id IS NOT NULL) as has_annexure,
        BOOL_OR(ib.id IS NOT NULL) as has_backside,
        BOOL_OR(vgm.id IS NOT NULL) as has_vgm,
        BOOL_OR(si.id IS NOT NULL) as has_shipping_instructions,
        COUNT(DISTINCT vgm.id) as vgm_documents_count,
        COUNT(DISTINCT si.id) as shipping_instructions_count,
        MAX(GREATEST(
          COALESCE(pl.updated_at, pl.created_at),
          COALESCE(eia.updated_at, eia.created_at),
          COALESCE(ib.updated_at, ib.created_at),
          COALESCE(vgm.updated_at, vgm.created_at),
          COALESCE(si.updated_at, si.created_at)
        )) as last_stage_updated
       FROM export_invoices ei
       LEFT JOIN packing_lists pl ON ei.id = pl.export_invoice_id AND pl.deleted_at IS NULL
       LEFT JOIN export_invoice_annexures eia ON ei.id = eia.export_invoice_id AND eia.deleted_at IS NULL
       LEFT JOIN invoice_backside ib ON ei.id = ib.export_invoice_id AND ib.deleted_at IS NULL
       LEFT JOIN vgm_documents vgm ON ei.id = vgm.export_invoice_id AND vgm.deleted_at IS NULL
       LEFT JOIN shipping_instructions si ON ei.id = si.export_invoice_id AND si.deleted_at IS NULL
       ${whereConditions}
       GROUP BY ei.id, ei.invoice_no, ei.invoice_date, ei.client_name, ei.status
       ORDER BY ei.created_at DESC`,
      queryParams
    );

    const workflowStatuses = result.rows.map(row => {
      const stagesComplete = [
        row.has_packing_list ? 1 : 0,
        row.has_annexure ? 1 : 0,
        row.has_backside ? 1 : 0,
        row.has_vgm ? 1 : 0,
        row.has_shipping_instructions ? 1 : 0
      ].reduce((a, b) => a + b, 0);

      return {
        ...row,
        completion_percentage: Math.round((stagesComplete / 5) * 100),
        stages_completed: stagesComplete,
        total_stages: 5,
        workflow_status: stagesComplete === 5 ? 'COMPLETE' : 'IN_PROGRESS'
      };
    });

    return successResponse(
      res,
      workflowStatuses,
      'Workflow status for all export invoices retrieved successfully'
    );
  } catch (error) {
    debugLogger.error('Error in getAllWorkflowStatus:', error);
    next(error);
  }
};

export default {
  getCompleteWorkflow,
  getExportInvoiceWorkflow,
  getDataForNextStage,
  getWorkflowCompletionSummary,
  syncUpdatesAcrossStages,
  getAllWorkflowStatus
};
