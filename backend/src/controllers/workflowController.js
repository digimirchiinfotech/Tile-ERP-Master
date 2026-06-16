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
import { 
  successResponse, 
  getPagination, 
  paginationResponse 
} from '../utils/helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — must be declared BEFORE getFullWorkflowStatus (const is not hoisted)
// ─────────────────────────────────────────────────────────────────────────────
const humanizeResourceType = (rt) => {
  const map = {
    proforma_invoices:        'Proforma Invoice',
    proforma_orders:          'Proforma Order',
    qc_records:               'QC Inspection',
    export_invoices:          'Export Invoice',
    packing_lists:            'Packing List',
    export_invoice_annexures: 'Annexure',
    invoice_backside:         'Invoice Backside',
    vgm_documents:            'VGM',
    shipping_instructions:    'Shipping Instructions',
  };
  return map[rt] || rt || 'Document';
};

const formatAuditAction = (action, resourceType) => {
  const label = humanizeResourceType(resourceType);
  const verb  = action === 'CREATE' ? 'Created' : action === 'UPDATE' ? 'Updated' : action === 'DELETE' ? 'Deleted' : action;
  return `${label} ${verb}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORKFLOW STATUS — queries all 9 actual document tables
// Flow: PI → PO → Export Invoice → Packing List → Annexure → Backside → VGM → Shipping Instruction → Final Dispatch
// ─────────────────────────────────────────────────────────────────────────────
export const getFullWorkflowStatus = async (req, res, next) => {
  try {
    const { piNumber } = req.params;
    if (!piNumber) return next(new AppError('PI number is required', 400));

    const companyId = req.companyFilter;
    const params    = companyId ? [piNumber, companyId] : [piNumber];

    // Helper: resolve a uuid → user name from global users table
    const resolveUser = async (userId) => {
      if (!userId) return null;
      try {
        const r = await req.db.globalQuery(
          'SELECT name, email_id FROM users WHERE id = $1 LIMIT 1',
          [userId]
        );
        return r.rows[0]?.name || r.rows[0]?.email_id || null;
      } catch { return null; }
    };

    // ── 1 & 2: Proforma Invoice + Proforma Order — run in parallel ─────────────
    const [piRes, poResAll] = await Promise.all([
      req.db.query(
        `SELECT id, invoice_no, status, client_name, total_amount, created_by, created_at, updated_at
         FROM proforma_invoices WHERE invoice_no = $1 ${companyId ? 'AND company_id = $2' : ''} LIMIT 1`,
        params
      ),
      req.db.query(
        `SELECT id, order_no, status, created_by, created_at, updated_at
         FROM proforma_orders WHERE invoice_ref = $1 ${companyId ? 'AND company_id = $2' : ''} LIMIT 1`,
        params
      ),
    ]);
    const piRow = piRes.rows[0] || null;
    const poRow = poResAll.rows[0] || null;

    // ── 3: QC (needs poRow.id), 4: Export Invoice (needs piRow.id) — parallel ─
    const [qcResAll, eiResAll] = await Promise.all([
      poRow
        ? req.db.query(
            `SELECT q.id, q.qc_id, q.qc_status, q.overall_grade, q.created_by, q.created_at, q.updated_at
             FROM qc_records q
             LEFT JOIN master_order_sheets mos ON (mos.id = q.order_sheet_id OR mos.id = q.order_id)
             WHERE (mos.proforma_order_id = $1 OR q.order_id = $1)
             ${companyId ? 'AND q.company_id = $2' : ''}
             ORDER BY q.created_at DESC LIMIT 1`,
            companyId ? [poRow.id, companyId] : [poRow.id]
          )
        : Promise.resolve({ rows: [] }),
      piRow
        ? req.db.query(
            `SELECT id, invoice_no, status, created_by, created_at, updated_at,
                    shipping_bill_no, shipping_bill_date, bl_no, bl_date
             FROM export_invoices WHERE proforma_invoice_id = $1 ${companyId ? 'AND company_id = $2' : ''} LIMIT 1`,
            companyId ? [piRow.id, companyId] : [piRow.id]
          )
        : Promise.resolve({ rows: [] }),
    ]);
    const qcRow  = qcResAll.rows[0] || null;
    const eiRow  = eiResAll.rows[0] || null;

    // ── 4-8: All EI-dependent docs — run in full parallel once eiRow is known ──
    const [plRes, axRes, bsRes, vgmRes, siRes] = eiRow
      ? await Promise.all([
          req.db.query(
            `SELECT id, packing_list_no, status, created_by, created_at, updated_at
             FROM packing_lists WHERE export_invoice_id = $1 ${companyId ? 'AND company_id = $2' : ''} LIMIT 1`,
            companyId ? [eiRow.id, companyId] : [eiRow.id]
          ),
          req.db.query(
            `SELECT id, annexure_no, status, created_by, created_at, updated_at
             FROM export_invoice_annexures WHERE export_invoice_id = $1 ${companyId ? 'AND company_id = $2' : ''} LIMIT 1`,
            companyId ? [eiRow.id, companyId] : [eiRow.id]
          ),
          req.db.query(
            `SELECT id, backside_no, status, created_by, created_at, updated_at
             FROM invoice_backside WHERE export_invoice_id = $1 ${companyId ? 'AND company_id = $2' : ''} LIMIT 1`,
            companyId ? [eiRow.id, companyId] : [eiRow.id]
          ),
          req.db.query(
            `SELECT id, vgm_no, status, created_by, created_at, updated_at
             FROM vgm_documents WHERE export_invoice_id = $1 ${companyId ? 'AND company_id = $2' : ''} LIMIT 1`,
            companyId ? [eiRow.id, companyId] : [eiRow.id]
          ),
          req.db.query(
            `SELECT id, si_no, status, created_by, created_at, updated_at
             FROM shipping_instructions WHERE export_invoice_id = $1 ${companyId ? 'AND company_id = $2' : ''} LIMIT 1`,
            companyId ? [eiRow.id, companyId] : [eiRow.id]
          ),
        ])
      : [{ rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }];

    const plRow  = plRes.rows[0]  || null;
    const axRow  = axRes.rows[0]  || null;
    const bsRow  = bsRes.rows[0]  || null;
    const vgmRow = vgmRes.rows[0] || null;
    const siRow  = siRes.rows[0]  || null;

    // ── Resolve all created_by UUIDs → real user names (global DB) ───────────
    const allUserIds = [
      piRow?.created_by, poRow?.created_by, qcRow?.created_by, eiRow?.created_by,
      plRow?.created_by, axRow?.created_by, bsRow?.created_by,
      vgmRow?.created_by, siRow?.created_by,
    ].filter(Boolean);

    const uniqueUserIds = [...new Set(allUserIds)];
    const userMap = {};
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        userMap[uid] = await resolveUser(uid);
      })
    );
    const userName = (uid) => userMap[uid] || 'System';

    // ── Build stages with who_done + done_date ────────────────────────────────
    const stages = [
      { key: 'pi',       label: 'Proforma Invoice',     doc: piRow,       done: !!piRow,       doc_no: piRow?.invoice_no,       who_done: userName(piRow?.created_by),    done_date: piRow?.created_at },
      { key: 'po',       label: 'Proforma Order',        doc: poRow,       done: !!poRow,       doc_no: poRow?.order_no,         who_done: userName(poRow?.created_by),    done_date: poRow?.created_at },
      { key: 'qc',       label: 'QC Inspection',         doc: qcRow,       done: !!qcRow,       doc_no: qcRow?.qc_id,            who_done: userName(qcRow?.created_by),    done_date: qcRow?.created_at },
      { key: 'ei',       label: 'Export Invoice',        doc: eiRow,       done: !!eiRow,       doc_no: eiRow?.invoice_no,       who_done: userName(eiRow?.created_by),    done_date: eiRow?.created_at },
      { key: 'pl',       label: 'Packing List',          doc: plRow,       done: !!plRow,       doc_no: plRow?.packing_list_no,  who_done: userName(plRow?.created_by),    done_date: plRow?.created_at },
      { key: 'annexure', label: 'Annexure',              doc: axRow,       done: !!axRow,       doc_no: axRow?.annexure_no,      who_done: userName(axRow?.created_by),    done_date: axRow?.created_at },
      { key: 'backside', label: 'Invoice Backside',      doc: bsRow,       done: !!bsRow,       doc_no: bsRow?.backside_no,      who_done: userName(bsRow?.created_by),    done_date: bsRow?.created_at },
      { key: 'vgm',      label: 'VGM',                  doc: vgmRow,      done: !!vgmRow,      doc_no: vgmRow?.vgm_no,          who_done: userName(vgmRow?.created_by),   done_date: vgmRow?.created_at },
      { key: 'si',       label: 'Shipping Instructions', doc: siRow,       done: !!siRow,       doc_no: siRow?.si_no,            who_done: userName(siRow?.created_by),    done_date: siRow?.created_at },
    ];

    const completedCount  = stages.filter(s => s.done).length;
    const overallProgress = Math.round((completedCount / stages.length) * 100);
    const firstPending    = stages.find(s => !s.done);
    const nextAction      = firstPending ? `Create ${firstPending.label}` : 'All stages complete';

    // Also pull real audit_log rows (updates, status changes) — without the broken user JOIN
    let allLogs = [];
    try {
      const relevantIds = [piRow?.id, poRow?.id, qcRow?.id, eiRow?.id, plRow?.id, axRow?.id, bsRow?.id, vgmRow?.id, siRow?.id].filter(Boolean);
      if (relevantIds.length > 0) {
        const placeholders = relevantIds.map((_, i) => `$${i + 1}`).join(', ');
        const rawAudit = await req.db.query(
          `SELECT action, resource_type, resource_id, user_id, created_at
           FROM audit_logs
           WHERE resource_id IN (${placeholders})
           ORDER BY created_at DESC LIMIT 30`,
          relevantIds
        );
        // Resolve user IDs for audit rows
        const auditUserIds = [...new Set(rawAudit.rows.map(r => r.user_id).filter(Boolean))];
        const auditUserMap = {};
        await Promise.all(auditUserIds.map(async uid => {
          auditUserMap[uid] = await resolveUser(uid);
        }));

        // Backfill missing document creators from the audit log
        const creatorMap = {};
        rawAudit.rows.forEach(row => {
          if (row.action === 'CREATE' && !creatorMap[row.resource_id]) {
            creatorMap[row.resource_id] = auditUserMap[row.user_id];
          }
        });

        stages.forEach(s => {
          if (s.who_done === 'System' && s.doc?.id && creatorMap[s.doc.id]) {
            s.who_done = creatorMap[s.doc.id];
          }
        });

        const enrichedAudit = rawAudit.rows
          .filter(row => row.action !== 'CREATE') // Prevent duplicate 'Created' logs
          .map(row => ({
          action:        formatAuditAction(row.action, row.resource_type),
          resource_type: humanizeResourceType(row.resource_type),
          doc_no:        null,
          user_name:     auditUserMap[row.user_id] || 'System',
          created_at:    row.created_at,
        }));
        
        // Build rich audit log from document creation timeline
        const auditLogs = stages
          .filter(s => s.done && s.done_date)
          .map(s => ({
            action:        `${s.label} Created`,
            resource_type: s.label,
            doc_no:        s.doc_no || '—',
            user_name:     s.who_done,
            created_at:    s.done_date,
          }));

        // Merge doc-timeline + raw audit, deduplicate by action+timestamp, sort desc
        allLogs = [...auditLogs, ...enrichedAudit]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 30);
          
        return successResponse(res, { piNumber, stages, overallProgress, nextAction, completedCount, totalStages: stages.length, auditLogs: allLogs }, 'Full workflow status retrieved successfully');
      }
    } catch { /* fall through */ }

    // Fallback if no audit logs found
    const auditLogs = stages
      .filter(s => s.done && s.done_date)
      .map(s => ({
        action:        `${s.label} Created`,
        resource_type: s.label,
        doc_no:        s.doc_no || '—',
        user_name:     s.who_done,
        created_at:    s.done_date,
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return successResponse(res, {
      piNumber, stages, overallProgress, nextAction,
      completedCount, totalStages: stages.length, auditLogs,
    }, 'Full workflow status retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// (helpers moved above getFullWorkflowStatus — see top of file)

export const getByPiNumber = async (req, res, next) => {
  try {
    const { piNumber } = req.params;

    let whereConditions = 'WHERE pi_number = $1';
    let queryParams = [piNumber];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT * FROM workflow_tracking ${whereConditions} ORDER BY created_at DESC`,
      queryParams
    );

    return successResponse(
      res,
      result.rows,
      'Workflow tracking retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getRelatedDocuments = async (req, res, next) => {
  try {
    const { piNumber } = req.params;

    let whereConditions = 'WHERE pi_number = $1';
    let queryParams = [piNumber];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT * FROM workflow_tracking ${whereConditions}`,
      queryParams
    );

    const documents = result.rows.reduce((acc, row) => {
      const type = row.document_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        id: row.document_id,
        status: row.status,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
      return acc;
    }, {});

    const summary = {
      totalOrders: (documents.order || []).length,
      completedOrders: (documents.order || []).filter(d => d.status === 'Completed').length,
      totalPackingLists: (documents.packing_list || []).length,
      readyPackingLists: (documents.packing_list || []).filter(d => d.status === 'Ready').length,
      totalQC: (documents.qc_record || []).length,
      passedQC: (documents.qc_record || []).filter(d => d.status === 'Passed').length,
    };

    return successResponse(
      res,
      {
        orders: documents.order || [],
        packingLists: documents.packing_list || [],
        qcRecords: documents.qc_record || [],
        summary
      },
      'Related documents retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getWorkflowStatus = async (req, res, next) => {
  try {
    const { piNumber } = req.params;

    let whereConditions = 'WHERE pi_number = $1';
    let queryParams = [piNumber];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT document_type, status, COUNT(*) as count 
       FROM workflow_tracking 
       ${whereConditions}
       GROUP BY document_type, status`,
      queryParams
    );

    const statusMap = result.rows.reduce((acc, row) => {
      if (!acc[row.document_type]) {
        acc[row.document_type] = {};
      }
      acc[row.document_type][row.status] = parseInt(row.count);
      return acc;
    }, {});

    const totalSteps = 3;
    const completedSteps = [
      statusMap.order?.Completed > 0,
      statusMap.qc_record?.Passed > 0,
      statusMap.packing_list?.Ready > 0
    ].filter(Boolean).length;

    const overallProgress = (completedSteps / totalSteps) * 100;

    let nextAction = 'Start processing';
    if (completedSteps === 0) {
      nextAction = 'Create purchase order';
    } else if (completedSteps === 1) {
      nextAction = 'Complete QC inspection';
    } else if (completedSteps === 2) {
      nextAction = 'Prepare packing list';
    } else {
      nextAction = 'All steps completed';
    }

    return successResponse(
      res,
      {
        overallProgress: Math.round(overallProgress),
        nextAction,
        statusMap
      },
      'Workflow status retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const {
      pi_number,
      document_type,
      document_id,
      status,
      metadata = {}
    } = req.body;

    const companyId = req.user.role === 'super_admin' && req.body.company_id 
      ? req.body.company_id 
      : req.user.companyId;

    const result = await req.db.query(
      `INSERT INTO workflow_tracking (
        company_id, pi_number, document_type, document_id, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [companyId, pi_number, document_type, document_id, status, JSON.stringify(metadata)]
    );

    return successResponse(
      res,
      result.rows[0],
      'Workflow tracking created successfully',
      201
    );
  } catch (error) {
    if (error.code === '23505') {
      return next(new AppError('Workflow tracking entry already exists', 400));
    }
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, metadata } = req.body;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = queryParams.length + 1;

    if (status) {
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
      paramCount++;
    }

    if (metadata) {
      updateFields.push(`metadata = $${paramCount}`);
      updateValues.push(JSON.stringify(metadata));
      paramCount++;
    }

    if (updateFields.length === 0) {
      return next(new AppError('No fields to update', 400));
    }

    const result = await req.db.query(
      `UPDATE workflow_tracking 
       SET ${updateFields.join(', ')}
       ${whereConditions}
       RETURNING *`,
      [...queryParams, ...updateValues]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Workflow tracking not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Workflow tracking updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const updateLinkedStatus = async (req, res, next) => {
  try {
    const { document_type, document_id, status, metadata = {} } = req.body;

    let whereConditions = 'WHERE document_type = $1 AND document_id = $2';
    let queryParams = [document_type, document_id];

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $3';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `UPDATE workflow_tracking 
       SET status = $${queryParams.length + 1}, metadata = $${queryParams.length + 2}
       ${whereConditions}
       RETURNING *`,
      [...queryParams, status, JSON.stringify(metadata)]
    );

    return successResponse(
      res,
      {
        updated: result.rowCount,
        records: result.rows
      },
      'Linked status updated successfully'
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

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `DELETE FROM workflow_tracking ${whereConditions} RETURNING *`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Workflow tracking not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Workflow tracking deleted successfully'
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

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingWorkflow = await req.db.query(
      `SELECT id FROM workflow_tracking ${whereConditions}`,
      queryParams
    );

    if (existingWorkflow.rows.length === 0) {
      return next(new AppError('Workflow tracking not found', 404));
    }

    await req.db.query(
      `DELETE FROM workflow_tracking ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingWorkflow.rows[0].id },
      'Workflow tracking permanently deleted'
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

    if (req.hasOwnProperty('companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingWorkflow = await req.db.query(
      `SELECT id, status FROM workflow_tracking ${whereConditions}`,
      queryParams
    );

    if (existingWorkflow.rows.length === 0) {
      return next(new AppError('Workflow tracking not found', 404));
    }

    const currentStatus = existingWorkflow.rows[0].status;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    queryParams.push(newStatus);
    const result = await req.db.query(
      `UPDATE workflow_tracking 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      `Workflow tracking status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};
