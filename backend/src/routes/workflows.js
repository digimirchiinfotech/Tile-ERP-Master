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
import {
  getFullWorkflowStatus,
  getByPiNumber,
  getRelatedDocuments,
  getWorkflowStatus,
  create,
  updateStatus,
  updateLinkedStatus,
  remove,
  hardDelete
} from '../controllers/workflowController.js';
import { authenticate, filterByCompany } from '../middleware/auth.js';

const router = express.Router();

// Full real workflow status — queries all 9 document tables
router.get(
  '/pi/:piNumber/full-status',
  authenticate,
  filterByCompany,
  getFullWorkflowStatus
);


// Default GET all workflows
router.get(
  '/',
  authenticate,
  filterByCompany,
  async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: [],
        message: 'Workflows endpoint is available (no specific filters applied)'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/pi/:piNumber',
  authenticate,
  filterByCompany,
  getByPiNumber
);

router.get(
  '/pi/:piNumber/related',
  authenticate,
  filterByCompany,
  getRelatedDocuments
);

router.get(
  '/pi/:piNumber/status',
  authenticate,
  filterByCompany,
  getWorkflowStatus
);

router.post(
  '/',
  authenticate,
  filterByCompany,
  create
);

router.put(
  '/:id',
  authenticate,
  filterByCompany,
  updateStatus
);

router.put(
  '/linked/status',
  authenticate,
  filterByCompany,
  updateLinkedStatus
);

router.delete(
  '/:id',
  authenticate,
  filterByCompany,
  remove
);

router.delete(
  '/:id/hard-delete',
  authenticate,
  filterByCompany,
  hardDelete
);

export default router;
