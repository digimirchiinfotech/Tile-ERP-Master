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
 * Centralized Document Number Generator for Multi-Tenant ERP
 * Handles unique sequential numbering per company with prefix and date-based isolation.
 */

const ALLOWED_TYPES = ['PI', 'PO', 'PL', 'NP', 'EXP', 'INV', 'VGM', 'BL', 'ACC', 'QC', 'SI', 'ANX', 'IB', 'BS', 'CLI', 'SUP', 'LEAD', 'PROD', 'SPROD', 'CAT', 'TKT', 'CERT', 'CC', 'PSD', 'IGST', 'PS', 'OS'];
const EXPORT_STANDARD_TYPES = ['EXP', 'INV', 'VGM', 'SI', 'ANX', 'IB', 'PL', 'QC', 'BL', 'CLI', 'SUP', 'LEAD', 'PROD', 'SPROD', 'CAT', 'TKT', 'CERT', 'CC', 'PSD', 'PS', 'OS'];

/**
 * Preview the next document number without incrementing the counter
 */
export const previewDocumentNumber = async (documentType, companyId, db, date = new Date()) => {
  if (!ALLOWED_TYPES.includes(documentType)) {
    throw new Error(`Invalid Document Type: ${documentType}`);
  }

  const isExportStandard = EXPORT_STANDARD_TYPES.includes(documentType);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const dateKey = isExportStandard ? 'ALL_TIME' : `${month}/${year}`;

  const result = await db.query(
    `SELECT counter FROM id_counters WHERE company_id = $1 AND prefix = $2 AND date_key = $3`,
    [companyId, documentType, dateKey]
  );

  const nextCounter = result.rows.length > 0 ? parseInt(result.rows[0].counter) + 1 : 1;
  const serialNumber = String(nextCounter).padStart(3, '0');
  const baseNumber = isExportStandard ? `${documentType}/${serialNumber}` : `${documentType}/${month}/${year}/${serialNumber}`;

  return {
    baseNumber,
    displayNumber: baseNumber,
    serialNumber,
    dateKey,
    nextValue: nextCounter
  };
};

/**
 * Generate and increment the document number (Atomic operation)
 */
export const generateDocumentNumber = async (documentType, companyId, db, date = new Date(), revisionNumber = 0) => {
  if (!ALLOWED_TYPES.includes(documentType)) {
    throw new Error(`Invalid Document Type: ${documentType}`);
  }

  const isExportStandard = EXPORT_STANDARD_TYPES.includes(documentType);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const dateKey = isExportStandard ? 'ALL_TIME' : `${month}/${year}`;

  const result = await db.query(
    `INSERT INTO id_counters (company_id, prefix, date_key, counter)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (company_id, prefix, date_key)
     DO UPDATE SET counter = id_counters.counter + 1, updated_at = CURRENT_TIMESTAMP
     RETURNING counter`,
    [companyId, documentType, dateKey]
  );

  const nextCounter = parseInt(result.rows[0].counter);
  const serialNumber = String(nextCounter).padStart(3, '0');
  const baseNumber = isExportStandard ? `${documentType}/${serialNumber}` : `${documentType}/${month}/${year}/${serialNumber}`;
  const displayNumber = revisionNumber > 0 ? `${baseNumber}-R${revisionNumber}` : baseNumber;

  return {
    baseNumber,
    displayNumber,
    serialNumber,
    dateKey,
    nextValue: nextCounter
  };
};

/**
 * Format a raw number into the display format
 */
export const formatDisplayNumber = (baseNumber, revisionNumber = 0) => {
  return revisionNumber > 0 ? `${baseNumber}-R${revisionNumber}` : baseNumber;
};

/**
 * Get the next revision number
 */
export const getNextRevisionNumber = (currentRevision = 0) => currentRevision + 1;

/**
 * Parse a document number into its constituent parts
 */
export const parseDocumentNumber = (documentNumber) => {
  if (!documentNumber) return null;
  const parts = documentNumber.split('-');
  const baseParts = parts[0].split('/');

  if (baseParts.length === 2) {
    return { 
      documentType: baseParts[0], 
      serialNumber: baseParts[1], 
      revisionNumber: parts[1] ? parseInt(parts[1].substring(1)) : 0, 
      baseNumber: parts[0], 
      fullNumber: documentNumber 
    };
  } else if (baseParts.length === 4) {
    return { 
      documentType: baseParts[0], 
      month: baseParts[1], 
      year: baseParts[2], 
      serialNumber: baseParts[3], 
      revisionNumber: parts[1] ? parseInt(parts[1].substring(1)) : 0, 
      baseNumber: parts[0], 
      fullNumber: documentNumber 
    };
  }
  return { documentType: baseParts[0], fullNumber: documentNumber };
};
