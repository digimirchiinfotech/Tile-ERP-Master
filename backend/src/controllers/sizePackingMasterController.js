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
import debugLogger from '../utils/debugLogger.js';
import { v4 as uuidv4 } from 'uuid';
import { logAction } from '../services/auditService.js';

const CONTEXT = 'SizePackingMasterController';

export const getAllSizePacking = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const companyId = req.user.companyId;

    const result = await req.db.globalQuery(
      `SELECT * FROM size_packing_master WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId]
    );

    debugLogger.timing(CONTEXT, 'getAllSizePacking', Date.now() - startTime);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'getAllSizePacking failed', error);
    next(error);
  }
};

export const getSizePackingBySize = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { size } = req.params;

    const result = await req.db.globalQuery(
      `SELECT * FROM size_packing_master WHERE company_id = $1 AND size = $2 LIMIT 1`,
      [companyId, size]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'getSizePackingBySize failed', error);
    next(error);
  }
};

export const createSizePacking = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const {
      size,
      box_pcs,
      sqm_per_box,
      boxes_per_pallet,
      boxes_per_kathli,
      per_box_weight,
      per_pallet_weight,
      status = 'Active'
    } = req.body;

    if (!size) {
      return next(new AppError('Size is required', 400));
    }

    // Upsert logic to handle both "create" and "save as default" smoothly without crashing on duplicate
    const result = await req.db.globalQuery(
      `INSERT INTO size_packing_master (
        company_id, size, box_pcs, sqm_per_box, boxes_per_pallet, boxes_per_kathli, per_box_weight, per_pallet_weight, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (company_id, size) 
      DO UPDATE SET 
        box_pcs = EXCLUDED.box_pcs,
        sqm_per_box = EXCLUDED.sqm_per_box,
        boxes_per_pallet = EXCLUDED.boxes_per_pallet,
        boxes_per_kathli = EXCLUDED.boxes_per_kathli,
        per_box_weight = EXCLUDED.per_box_weight,
        per_pallet_weight = EXCLUDED.per_pallet_weight,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        companyId, size, box_pcs || 0, sqm_per_box || 0, boxes_per_pallet || 0, boxes_per_kathli || 0, per_box_weight || 0, per_pallet_weight || 0, status, req.user.id
      ]
    );

    // Add to generic product_sizes as well if it doesn't exist
    await req.db.globalQuery(
      `INSERT INTO product_sizes (company_id, size, created_by)
       SELECT $1::uuid, $2::varchar, $3::uuid
       WHERE NOT EXISTS (SELECT 1 FROM product_sizes WHERE company_id = $1 AND size = $2)`,
      [companyId, size, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Size packing template saved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'createSizePacking failed', error);
    next(error);
  }
};

export const updateSizePacking = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const {
      size,
      box_pcs,
      sqm_per_box,
      boxes_per_pallet,
      boxes_per_kathli,
      per_box_weight,
      per_pallet_weight,
      status
    } = req.body;

    // Check if another record has the same size
    if (size) {
      const checkResult = await req.db.globalQuery(
        `SELECT id FROM size_packing_master WHERE company_id = $1 AND size = $2 AND id != $3`,
        [companyId, size, id]
      );
      if (checkResult.rows.length > 0) {
        return next(new AppError('Another template with this size already exists', 400));
      }
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (size !== undefined) { updateFields.push(`size = $${paramCount++}`); values.push(size); }
    if (box_pcs !== undefined) { updateFields.push(`box_pcs = $${paramCount++}`); values.push(box_pcs); }
    if (sqm_per_box !== undefined) { updateFields.push(`sqm_per_box = $${paramCount++}`); values.push(sqm_per_box); }
    if (boxes_per_pallet !== undefined) { updateFields.push(`boxes_per_pallet = $${paramCount++}`); values.push(boxes_per_pallet); }
    if (boxes_per_kathli !== undefined) { updateFields.push(`boxes_per_kathli = $${paramCount++}`); values.push(boxes_per_kathli); }
    if (per_box_weight !== undefined) { updateFields.push(`per_box_weight = $${paramCount++}`); values.push(per_box_weight); }
    if (per_pallet_weight !== undefined) { updateFields.push(`per_pallet_weight = $${paramCount++}`); values.push(per_pallet_weight); }
    if (status !== undefined) { updateFields.push(`status = $${paramCount++}`); values.push(status); }

    if (updateFields.length === 0) {
      return res.json({ success: true, message: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(companyId, id);

    const result = await req.db.globalQuery(
      `UPDATE size_packing_master SET ${updateFields.join(', ')} WHERE company_id = $${paramCount} AND id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return next(new AppError('Template not found or unauthorized', 404));
    }
    
    // Also update product_sizes if size was changed
    if (size !== undefined) {
      // Find the old size string first to update it
      const oldRec = await req.db.globalQuery(`SELECT size FROM size_packing_master WHERE id = $1`, [id]);
      if(oldRec.rows.length > 0) {
         await req.db.globalQuery(
           `UPDATE product_sizes SET size = $1 WHERE company_id = $2 AND size = $3`,
           [size, companyId, oldRec.rows[0].size]
         );
      }
    }

    res.json({
      success: true,
      message: 'Size packing template updated',
      data: result.rows[0]
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'updateSizePacking failed', error);
    next(error);
  }
};

export const deleteSizePacking = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const result = await req.db.globalQuery(
      `DELETE FROM size_packing_master WHERE company_id = $1 AND id = $2 RETURNING *`,
      [companyId, id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Template not found or unauthorized', 404));
    }

    res.json({
      success: true,
      message: 'Size packing template deleted'
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'deleteSizePacking failed', error);
    next(error);
  }
};
