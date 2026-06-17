const fs = require('fs');
let content = fs.readFileSync('src/components/export-management/IGSTInvoice/IGSTInvoiceForm.jsx', 'utf8');

// 1. loadIGSTInvoiceData mapping
content = content.replace(
  /igst_rate:\s*parseFloat\(l\.igstRate\s*\|\|\s*l\.igst_rate\s*\|\|\s*18\.00\),/g,
  `igst_percentage: parseFloat(l.igst_percentage || l.igst_percent || l.igstRate || l.igst_rate || 18.00),
            igst_rate: parseFloat(l.igst_percentage || l.igst_percent || l.igstRate || l.igst_rate || 18.00),`
);

// 2. handleAddLine
content = content.replace(
  /igst_rate:\s*18\.00,/g,
  `igst_percentage: 18.00,
      igst_rate: 18.00,`
);

// 3. runLiveCalculations
content = content.replace(
  /const igstRate = parseFloat\(l\.igst_rate \|\| 18\.00\);/g,
  `const igstRate = parseFloat(l.igst_percentage !== undefined ? l.igst_percentage : (l.igst_rate || 18.00));`
);

content = content.replace(
  /igst_rate:\s*igstRate,/g,
  `igst_percentage: igstRate,
        igst_rate: igstRate,`
);

// 4. Update the table column rendering
const oldTableCol = `<td className="font-monospace text-info fw-semibold">
                        {parseFloat(l.igst_rate || 18.00).toFixed(2)}%
                      </td>`;
const newTableCol = `<td className="font-monospace text-info fw-semibold">
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={l.igst_percentage !== undefined ? l.igst_percentage : (l.igst_rate || '')}
                          onChange={e => {
                            let val = parseFloat(e.target.value);
                            if (isNaN(val)) val = 0;
                            if (val < 0) val = 0;
                            if (val > 100) val = 100;
                            handleLineFieldChange(i, 'igst_percentage', val);
                          }}
                          className="fw-bold text-center border-info border-opacity-25"
                          size="sm"
                        />
                      </td>`;

// Let's replace by indexOf to be safe for multiline HTML
const startIdx = content.indexOf('<td className="font-monospace text-info fw-semibold">');
const endIdx = content.indexOf('</td>', startIdx) + 5;
if (startIdx !== -1) {
  const currentTableCol = content.substring(startIdx, endIdx);
  if (currentTableCol.includes('igst_rate')) {
    content = content.replace(currentTableCol, newTableCol);
  }
}

fs.writeFileSync('src/components/export-management/IGSTInvoice/IGSTInvoiceForm.jsx', content);
console.log('IGSTInvoiceForm.jsx updated!');
