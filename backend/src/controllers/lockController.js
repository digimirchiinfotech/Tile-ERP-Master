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

import { AppError } from '../middleware/errorHandler.js';
import { createSnapshot } from '../services/documentSnapshotService.js';
import { notificationService } from '../services/notificationService.js';

const TABLE_MAP = {
  PI: 'proforma_invoices',
  PROFORMA_INVOICE: 'proforma_invoices',
  PO: 'proforma_orders',
  PROFORMA_ORDER: 'proforma_orders',
  EXPORT_INVOICE: 'export_invoices',
  PACKING_LIST: 'packing_lists',
  ANNEXURE: 'export_invoice_annexures',
  VGM: 'vgm_documents',
  SHIPPING_INSTRUCTION: 'shipping_instructions',
  INVOICE_BACKSIDE: 'invoice_backside',
  IGST_INVOICE: 'igst_invoices',
  QC: 'qc_records',
};

export const lockDocument = async (req, res, next) => {
  let client;
  try {
    const documentType = req.body.documentType || req.body.document_type;
    const documentId = req.body.documentId || req.body.document_id;
    let snapshotData = req.body.snapshotData || req.body.snapshot_data;
    const finalPdfPath = req.body.finalPdfPath || req.body.final_pdf_path;
    const finalExcelPath = req.body.finalExcelPath || req.body.final_excel_path;
    const finalizedHash = req.body.finalizedHash || req.body.finalized_hash;
    const companyId = req.companyFilter || req.user.companyId;
    const userId = req.user.id;

    const tableName = TABLE_MAP[documentType];
    if (!tableName) return next(new AppError('Invalid document type', 400));

    client = await req.db.getClient();
    await client.query('BEGIN');

    let currentDoc;
    if (companyId) {
      currentDoc = await client.query(`SELECT * FROM ${tableName} WHERE id = $1 AND company_id = $2 FOR UPDATE`, [documentId, companyId]);
    } else {
      currentDoc = await client.query(`SELECT * FROM ${tableName} WHERE id = $1 AND company_id IS NULL FOR UPDATE`, [documentId]);
    }

    if (currentDoc.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Document not found', 404));
    }
    if (currentDoc.rows[0].is_locked) {
      await client.query('ROLLBACK');
      return next(new AppError('Document is already locked', 400));
    }

    // Generate snapshot automatically if not provided
    if (!snapshotData) {
      try {
        const dbWrapper = {
          query: (text, params) => client.query(text, params),
          globalQuery: (text, params) => req.db.globalQuery(text, params)
        };
        snapshotData = await createSnapshot(dbWrapper, documentType, documentId, companyId, userId);
      } catch (err) {
        // Snapshot generation failed — continue without snapshot
      }
    }

    const snapshotDataJson = snapshotData ? JSON.stringify(snapshotData) : null;

    const statusUpdate = documentType === 'QC' ? '' : `, status = 'Locked'`;

    if (companyId) {
      await client.query(`
        UPDATE ${tableName} 
        SET is_locked = true, 
            locked_at = CURRENT_TIMESTAMP, 
            locked_by = $1,
            snapshot_data = $2,
            final_pdf_path = $3,
            final_excel_path = $4,
            finalized_hash = $5,
            lock_version = COALESCE(lock_version, 0) + 1,
            finalized_at = CURRENT_TIMESTAMP${statusUpdate}
        WHERE id = $6 AND company_id = $7
      `, [userId, snapshotDataJson, finalPdfPath || null, finalExcelPath || null, finalizedHash || null, documentId, companyId]);
    } else {
      await client.query(`
        UPDATE ${tableName} 
        SET is_locked = true, 
            locked_at = CURRENT_TIMESTAMP, 
            locked_by = $1,
            snapshot_data = $2,
            final_pdf_path = $3,
            final_excel_path = $4,
            finalized_hash = $5,
            lock_version = COALESCE(lock_version, 0) + 1,
            finalized_at = CURRENT_TIMESTAMP${statusUpdate}
        WHERE id = $6 AND company_id IS NULL
      `, [userId, snapshotDataJson, finalPdfPath || null, finalExcelPath || null, finalizedHash || null, documentId]);
    }

    await client.query(`
      INSERT INTO audit_logs (company_id, resource_type, resource_id, action, user_id, ip_address, changes)
      VALUES ($1, $2, $3, 'LOCK', $4, $5, $6)
    `, [companyId, documentType, documentId, userId, req.ip, JSON.stringify({ browser: req.headers['user-agent'] })]);

    // --- Cascade Lock Logic for EXPORT_INVOICE ---
    if (documentType === 'EXPORT_INVOICE') {
      const expNo = currentDoc.rows[0].invoice_no || currentDoc.rows[0].export_invoice_no || 'UNKNOWN';
      const relatedTables = [
        { name: 'packing_lists', type: 'PACKING_LIST' },
        { name: 'export_invoice_annexures', type: 'ANNEXURE' },
        { name: 'invoice_backside', type: 'INVOICE_BACKSIDE' },
        { name: 'vgm_documents', type: 'VGM' },
        { name: 'shipping_instructions', type: 'SHIPPING_INSTRUCTION' }
      ];

      for (const t of relatedTables) {
        let updateQuery = `UPDATE ${t.name} SET is_locked = true WHERE export_invoice_id = $1`;
        let params = [documentId];
        if (companyId) {
          updateQuery += ` AND company_id = $2 RETURNING id`;
          params.push(companyId);
        } else {
          updateQuery += ` RETURNING id`;
        }

        const relatedRes = await client.query(updateQuery, params);
        
        for (const row of relatedRes.rows) {
          await client.query(`
            INSERT INTO export_document_lock (company_id, exp_no, document_type, document_id, lock_status, locked_by, locked_at)
            VALUES ($1, $2, $3, $4, 'LOCKED', $5, CURRENT_TIMESTAMP)
          `, [companyId || null, expNo, t.type, row.id, userId]);
        }
      }

      // Record lock for Export Invoice itself
      await client.query(`
        INSERT INTO export_document_lock (company_id, exp_no, document_type, document_id, lock_status, locked_by, locked_at)
        VALUES ($1, $2, $3, $4, 'LOCKED', $5, CURRENT_TIMESTAMP)
      `, [companyId || null, expNo, 'EXPORT_INVOICE', documentId, userId]);
    }
    // ----------------------------------------------

    await client.query('COMMIT');

    // Notify about the document lock
    notificationService.notifyDocumentLocked(
      companyId, 
      documentType, 
      currentDoc.rows[0].invoice_no || currentDoc.rows[0].vgm_no || currentDoc.rows[0].si_no || currentDoc.rows[0].packing_list_no || currentDoc.rows[0].annexure_no || documentId.substring(0,8), 
      documentId, 
      req.user?.name || req.user?.email_id || 'Admin', 
      req.db
    ).catch(() => {});

    res.json({ success: true, message: 'Document locked successfully' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    if (client) client.release();
  }
};

export const unlockDocument = async (req, res, next) => {
  let client;
  try {
    const documentType = req.body.documentType || req.body.document_type;
    const documentId = req.body.documentId || req.body.document_id;
    const unlockReason = req.body.unlockReason || req.body.unlock_reason;
    const companyId = req.companyFilter || req.user.companyId;
    const userId = req.user.id;

    if (!unlockReason) return next(new AppError('Unlock reason is required', 400));

    const tableName = TABLE_MAP[documentType];
    if (!tableName) return next(new AppError('Invalid document type', 400));

    if (!['super_admin', 'company_admin', 'admin'].includes(req.user.role)) {
      return next(new AppError('Only administrators can unlock documents', 403));
    }

    client = await req.db.getClient();
    await client.query('BEGIN');

    let currentDoc;
    if (companyId) {
      currentDoc = await client.query(`SELECT * FROM ${tableName} WHERE id = $1 AND company_id = $2 FOR UPDATE`, [documentId, companyId]);
    } else {
      currentDoc = await client.query(`SELECT * FROM ${tableName} WHERE id = $1 AND company_id IS NULL FOR UPDATE`, [documentId]);
    }
    if (currentDoc.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Document not found', 404));
    }
    if (!currentDoc.rows[0].is_locked) {
      await client.query('ROLLBACK');
      return next(new AppError('Document is not locked', 400));
    }

    if (companyId) {
      await client.query(`
        UPDATE ${tableName} 
        SET is_locked = false, 
            unlocked_at = CURRENT_TIMESTAMP, 
            unlocked_by = $1,
            unlock_reason = $2
        WHERE id = $3 AND company_id = $4
      `, [userId, unlockReason, documentId, companyId]);
    } else {
      await client.query(`
        UPDATE ${tableName} 
        SET is_locked = false, 
            unlocked_at = CURRENT_TIMESTAMP, 
            unlocked_by = $1,
            unlock_reason = $2
        WHERE id = $3 AND company_id IS NULL
      `, [userId, unlockReason, documentId]);
    }

    await client.query(`
      INSERT INTO audit_logs (company_id, resource_type, resource_id, action, user_id, ip_address, changes)
      VALUES ($1, $2, $3, 'UNLOCK', $4, $5, $6)
    `, [companyId, documentType, documentId, userId, req.ip, JSON.stringify({ unlockReason, browser: req.headers['user-agent'] })]);

    // --- Cascade Unlock Logic for EXPORT_INVOICE ---
    if (documentType === 'EXPORT_INVOICE') {
      const relatedTables = [
        { name: 'packing_lists', type: 'PACKING_LIST' },
        { name: 'export_invoice_annexures', type: 'ANNEXURE' },
        { name: 'invoice_backside', type: 'INVOICE_BACKSIDE' },
        { name: 'vgm_documents', type: 'VGM' },
        { name: 'shipping_instructions', type: 'SHIPPING_INSTRUCTION' }
      ];

      for (const t of relatedTables) {
        let updateQuery = `UPDATE ${t.name} SET is_locked = false WHERE export_invoice_id = $1`;
        let params = [documentId];
        if (companyId) {
          updateQuery += ` AND company_id = $2 RETURNING id`;
          params.push(companyId);
        } else {
          updateQuery += ` RETURNING id`;
        }

        const relatedRes = await client.query(updateQuery, params);
        
        for (const row of relatedRes.rows) {
           await client.query(`
            UPDATE export_document_lock 
            SET lock_status = 'UNLOCKED', unlocked_by = $1, unlocked_at = CURRENT_TIMESTAMP, unlock_reason = $2
            WHERE document_id = $3 AND lock_status = 'LOCKED'
          `, [userId, unlockReason, row.id]);
        }
      }

      // Unlock for Export Invoice itself in the tracking table
      await client.query(`
        UPDATE export_document_lock 
        SET lock_status = 'UNLOCKED', unlocked_by = $1, unlocked_at = CURRENT_TIMESTAMP, unlock_reason = $2
        WHERE document_id = $3 AND lock_status = 'LOCKED'
      `, [userId, unlockReason, documentId]);
    }
    // ------------------------------------------------

    await client.query('COMMIT');
    res.json({ success: true, message: 'Document unlocked successfully' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    if (client) client.release();
  }
};
