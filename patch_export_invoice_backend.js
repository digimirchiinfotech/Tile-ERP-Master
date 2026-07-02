const fs = require('fs');
const file = 'd:/Tile ERP/backend/src/controllers/exportInvoiceController.js';
let content = fs.readFileSync(file, 'utf8');

// In createExportInvoice
content = content.replace(
  /lc_number \|\| null,\s*\/\/\s*\$49/g,
  `(lc_number !== undefined ? lc_number : req.body.lcNumber) || null,                            // $49`
);
content = content.replace(
  /lc_date \|\| null,\s*\/\/\s*\$50/g,
  `(lc_date !== undefined ? lc_date : req.body.lcDate) || null,                                  // $50`
);
content = content.replace(
  /epcg_no \|\| null,\s*\/\/\s*\$51/g,
  `(epcg_no !== undefined ? epcg_no : req.body.epcgNo) || null,                                  // $51`
);

// In updateExportInvoice
content = content.replace(
  /const allowedFields = \[/g,
  `
    if (req.body.lcNumber !== undefined && req.body.lc_number === undefined) req.body.lc_number = req.body.lcNumber;
    if (req.body.lcDate !== undefined && req.body.lc_date === undefined) req.body.lc_date = req.body.lcDate;
    if (req.body.epcgNo !== undefined && req.body.epcg_no === undefined) req.body.epcg_no = req.body.epcgNo;
    
    const allowedFields = [`
);

fs.writeFileSync(file, content);
console.log('Done mapping exportInvoiceController!');
