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

import express from 'express';
import { authenticate, filterByCompany } from '../middleware/auth.js';
import { handleBulkUpdate, handleBulkDelete } from '../controllers/bulkController.js';

const router = express.Router();

/**
 * @route   PATCH /api/bulk/update
 * @desc    Update multiple records dynamically
 * @access  Private (Dynamic RBAC inside controller)
 */
router.patch('/update', authenticate, filterByCompany, handleBulkUpdate);

/**
 * @route   DELETE /api/bulk/delete
 * @desc    Soft-delete multiple records safely
 * @access  Private (Dynamic RBAC inside controller)
 */
router.delete('/delete', authenticate, filterByCompany, handleBulkDelete);

export default router;
