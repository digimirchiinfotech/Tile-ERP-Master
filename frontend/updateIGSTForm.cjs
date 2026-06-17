const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/export-management/IGSTInvoice/IGSTInvoiceForm.jsx', 'utf8');

// 1. loadIGSTInvoiceData mapping
content = content.replace(
  'igst_rate: parseFloat(l.igstRate || l.igst_rate || 18.00),',
  `igst_percentage: parseFloat(l.igst_percentage || l.igst_percent || l.igstRate || l.igst_rate || 18.00),
            igst_rate: parseFloat(l.igst_percentage || l.igst_percent || l.igstRate || l.igst_rate || 18.00),`
);

// 2. handleAddLine
content = content.replace(
  'igst_rate: 18.00,',
  `igst_percentage: 18.00,
      igst_rate: 18.00,`
);

// 3. runLiveCalculations
content = content.replace(
  'const igstRate = parseFloat(l.igst_rate || 18.00);',
  `const igstRate = parseFloat(l.igst_percentage !== undefined ? l.igst_percentage : (l.igst_rate || 18.00));`
);

content = content.replace(
  'igst_rate: igstRate,',
  `igst_percentage: igstRate,
        igst_rate: igstRate,`
);

// 4. Update the table column rendering
content = content.replace(
  `<td className="font-monospace text-info fw-semibold">
                        {parseFloat(l.igst_rate || 18.00).toFixed(2)}%
                      </td>`,
  `<td className="font-monospace text-info fw-semibold">
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
                      </td>`
);

fs.writeFileSync('frontend/src/components/export-management/IGSTInvoice/IGSTInvoiceForm.jsx', content);
console.log('IGSTInvoiceForm.jsx updated!');
