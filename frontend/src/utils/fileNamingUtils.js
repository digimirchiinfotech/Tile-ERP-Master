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

export const generateEnterpriseFilename = ({
  moduleName = '',
  documentNo = '',
  clientName = '',
  date = '',
  extension = 'pdf',
  revision = '',
  isProductExport = false
}) => {
  // Helper to sanitize strings: uppercase, remove special chars, replace spaces with hyphens
  const sanitize = (str) => {
    if (!str) return '';
    return String(str)
      .trim()
      .toUpperCase()
      .replace(/[\/\\?%*:|"<>.,;']/g, '') // remove invalid file chars
      .replace(/\s+/g, '-');              // spaces to hyphens
  };

  const safeModule = sanitize(moduleName);
  
  // Extract revision from documentNo if it already contains -R[number]
  let safeDocNo = sanitize(documentNo);
  let safeRevision = sanitize(revision);

  const revMatch = safeDocNo.match(/-R(\d+)$/);
  if (revMatch && !safeRevision) {
    safeRevision = `R${revMatch[1]}`;
    safeDocNo = safeDocNo.replace(/-R\d+$/, ''); // Temporarily remove it so we can append it cleanly
  }

  // If there's a revision, append it to doc no
  if (safeRevision && !safeRevision.startsWith('R')) {
    safeRevision = `R${safeRevision}`;
  }

  if (safeRevision) {
    safeDocNo = `${safeDocNo}-${safeRevision}`;
  }

  const safeClient = sanitize(clientName);

  // Format Date to DD-MM-YYYY
  let safeDate = '';
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      safeDate = `${day}-${month}-${year}`;
    } else {
      safeDate = sanitize(date); // Fallback to raw string
    }
  } else {
    // Current date fallback
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    safeDate = `${day}-${month}-${year}`;
  }

  // Construct parts: [MODULE]_[DOCUMENT-NO]_[CLIENT]_[DATE]_[VERSION].[EXTENSION]
  const parts = [];
  if (safeModule) parts.push(safeModule);
  if (safeDocNo) parts.push(safeDocNo);

  if (isProductExport) {
    parts.push('PRODUCTS');
  } else if (safeClient) {
    parts.push(safeClient);
  }

  if (safeDate) parts.push(safeDate);

  const finalName = parts.join('_');
  const safeExt = extension.toLowerCase().replace(/^\.+/, '');

  return `${finalName}.${safeExt}`;
};
