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

import * as referenceService from '../services/exportDocumentReferenceService.js';

export const getExportInvoiceReferences = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { search = '', currentId } = req.query;
    const references = await referenceService.getValidExportInvoiceReferences(companyId, search, currentId, req.db);
    res.json({ success: true, data: references, count: references.length });
  } catch (error) {
    next(error);
  }
};

export const getPackingListReferences = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { exportInvoiceId, search = '', currentId } = req.query;
    const references = await referenceService.getValidPackingListReferences(companyId, exportInvoiceId, search, currentId, req.db);
    res.json({ success: true, data: references, count: references.length });
  } catch (error) {
    next(error);
  }
};

export const getAnnexureReferences = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { packingListId, search = '', currentId } = req.query;
    const references = await referenceService.getValidAnnexureReferences(companyId, packingListId, search, currentId, req.db);
    res.json({ success: true, data: references, count: references.length });
  } catch (error) {
    next(error);
  }
};

export const getBacksideReferences = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { annexureId, exportInvoiceId, search = '', currentId } = req.query;
    const references = await referenceService.getValidBacksideReferences(companyId, annexureId, search, exportInvoiceId, currentId, req.db);
    res.json({ success: true, data: references, count: references.length });
  } catch (error) {
    next(error);
  }
};

export const getVGMReferences = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { backsideId, search = '', currentId } = req.query;
    const references = await referenceService.getValidVGMReferences(companyId, backsideId, search, currentId, req.db);
    res.json({ success: true, data: references, count: references.length });
  } catch (error) {
    next(error);
  }
};

export const getPackingListInheritedData = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { exportInvoiceId } = req.params;
    const validation = await referenceService.validateExportDocumentReference('export_invoice', exportInvoiceId, companyId, req.db);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: `Invalid export invoice reference: ${validation.reason}` });
    }
    const inheritedData = await referenceService.getPackingListInheritedData(companyId, exportInvoiceId, req.db);
    res.json({ success: true, data: inheritedData });
  } catch (error) {
    next(error);
  }
};

export const getAnnexureInheritedData = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { packingListId } = req.params;
    const validation = await referenceService.validateExportDocumentReference('packing_list', packingListId, companyId, req.db);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: `Invalid packing list reference: ${validation.reason}` });
    }
    const inheritedData = await referenceService.getAnnexureInheritedData(companyId, packingListId, req.db);
    if (!inheritedData) {
      return res.status(404).json({ success: false, message: 'Packing list data not found' });
    }
    res.json({ success: true, data: inheritedData });
  } catch (error) {
    next(error);
  }
};

export const getBacksideInheritedData = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { annexureId } = req.params;
    // For inheritance of data, allow annexures in any status as long as the reference exists.
    // The stricter status checks are intended for creating downstream documents, not for data autofill.
    const existsValidation = await referenceService.validateExportDocumentReference('annexure', annexureId, companyId, req.db);
    if (!existsValidation.valid && existsValidation.reason === 'Reference not found') {
      return res.status(400).json({ success: false, message: `Invalid annexure reference: ${existsValidation.reason}` });
    }
    const inheritedData = await referenceService.getBacksideInheritedData(companyId, annexureId, req.db);
    res.json({ success: true, data: inheritedData });
  } catch (error) {
    next(error);
  }
};

export const getVGMInheritedData = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { backsideId } = req.params;
    // For inheritance of data, allow backsides in any status as long as the reference exists.
    const existsValidation = await referenceService.validateExportDocumentReference('backside', backsideId, companyId, req.db);
    if (!existsValidation.valid && existsValidation.reason === 'Reference not found') {
      return res.status(400).json({ success: false, message: `Invalid backside reference: ${existsValidation.reason}` });
    }
    const inheritedData = await referenceService.getVGMInheritedData(companyId, backsideId, req.db);
    res.json({ success: true, data: inheritedData });
  } catch (error) {
    next(error);
  }
};

export const getShippingInheritedData = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { vgmId } = req.params;
    // For inheritance of data, allow VGMs in any status as long as the reference exists.
    const existsValidation = await referenceService.validateExportDocumentReference('vgm', vgmId, companyId, req.db);
    if (!existsValidation.valid && existsValidation.reason === 'Reference not found') {
      return res.status(400).json({ success: false, message: `Invalid VGM reference: ${existsValidation.reason}` });
    }
    const inheritedData = await referenceService.getShippingInheritedData(companyId, vgmId, req.db);
    res.json({ success: true, data: inheritedData });
  } catch (error) {
    next(error);
  }
};

export const getWorkflowChain = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { exportInvoiceId } = req.params;
    const chain = await referenceService.getWorkflowChain(companyId, exportInvoiceId, req.db);
    res.json({ success: true, data: chain });
  } catch (error) {
    next(error);
  }
};

export const validateReference = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { referenceType, referenceId } = req.body;
    if (!referenceType || !referenceId) {
      return res.status(400).json({ success: false, message: 'referenceType and referenceId are required' });
    }
    const validation = await referenceService.validateExportDocumentReference(referenceType, referenceId, companyId, req.db);
    res.json({ success: true, valid: validation.valid, reason: validation.reason });
  } catch (error) {
    next(error);
  }
};
export const getBLInheritedData = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { exportInvoiceId } = req.params;
    const inheritedData = await referenceService.getBLInheritedData(companyId, exportInvoiceId, req.db);
    res.json({ success: true, data: inheritedData });
  } catch (error) {
    next(error);
  }
};
