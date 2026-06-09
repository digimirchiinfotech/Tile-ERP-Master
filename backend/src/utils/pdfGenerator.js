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

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generatePDF = async (docTitle, headers, data, filename = 'document.pdf') => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(docTitle, 14, 22);
  
  doc.autoTable({
    head: [headers],
    body: data,
    startY: 30,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillGray: true, textColor: 255 }
  });
  
  return doc.output('arraybuffer');
};
