const fs = require('fs');

let content = fs.readFileSync('backend/src/controllers/packingListController.js', 'utf8');

// SELECT queries
content = content.replace(/p\.legalisation, p\.product_lines/g, 'p.legalisation, p.lc_number, p.lc_date, p.epcg_no, p.product_lines');
content = content.replace(/ei\.legalisation as inv_legalisation,\n(.*)ei\.legalisation,/g, 'ei.legalisation as inv_legalisation, ei.lc_number as inv_lc_number, ei.lc_date as inv_lc_date, ei.epcg_no as inv_epcg_no,\n$1ei.legalisation, ei.lc_number, ei.lc_date, ei.epcg_no,');
content = content.replace(/p\.legalisation,(\s+)client_name:/g, 'p.legalisation,\n        lc_number: p.lc_number || mergedRow.inv_lc_number || \'\',\n        lc_date: p.lc_date || mergedRow.inv_lc_date || null,\n        epcg_no: p.epcg_no || mergedRow.inv_epcg_no || \'\',$1client_name:');
content = content.replace(/mergedRow\.inv_legalisation \|\| \'\',(\s+)client_name:/g, 'mergedRow.inv_legalisation || \'\',\n        lc_number: mergedRow.inv_lc_number || mergedRow.lc_number || \'\',\n        lc_date: mergedRow.inv_lc_date || mergedRow.lc_date || null,\n        epcg_no: mergedRow.inv_epcg_no || mergedRow.epcg_no || \'\',$1client_name:');

// Upsert build
content = content.replace(/legalisation,(\s+)product_lines,/g, 'legalisation,\n    lc_number,\n    lc_date,\n    epcg_no,$1product_lines,');
content = content.replace(/legalisation: _toYesNo\(legalisation\),(\s+)product_lines:/g, 'legalisation: _toYesNo(legalisation),\n    lc_number: coerce(lc_number),\n    lc_date: coerceDate(lc_date),\n    epcg_no: coerce(epcg_no),$1product_lines:');

// UPDATE query
content = content.replace(/fumigation = \$36, legalisation = \$37,\n(.*)status = \$38,/g, 'fumigation = $36, legalisation = $37, lc_number = $46, lc_date = $47, epcg_no = $48,\n$1status = $38,');
content = content.replace(/WHERE export_invoice_id = \$46 AND company_id = \$47/g, 'WHERE export_invoice_id = $49 AND company_id = $50');
content = content.replace(/p\.fumigation, p\.legalisation,\n(.*)p\.status/g, 'p.fumigation, p.legalisation,\n$1p.status, p.lc_number, p.lc_date, p.epcg_no');
content = content.replace(/exportInvoiceId, companyId\n(.*)\]/g, 'exportInvoiceId, companyId, p.lc_number, p.lc_date, p.epcg_no\n$1]');

content = content.replace(/WHERE id = \$46/g, 'WHERE id = $49');

// INSERT query
content = content.replace(/fumigation, legalisation,\n(.*)product_lines/g, 'fumigation, legalisation, lc_number, lc_date, epcg_no,\n$1product_lines');
content = content.replace(/\$39,\$40,\$41,\$42,\$43,\$44,\$45,\$46,\$47/g, '$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50');

fs.writeFileSync('backend/src/controllers/packingListController.js', content);
