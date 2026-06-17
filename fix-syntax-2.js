const fs = require('fs');
const lines = fs.readFileSync('frontend/src/utils/productExportUtils.js', 'utf8').split('\n');

const startIndex = 1779;
const endIndex = 2080;

lines.splice(startIndex, endIndex - startIndex + 1, "      setCell(r, 3, `FINAL DESTINATION :\\n${dest}`, { bold: true, size: 8, align: { horizontal: 'left', vertical: 'top' } });");

fs.writeFileSync('frontend/src/utils/productExportUtils.js', lines.join('\n'));
console.log('Fixed syntax by replacing lines 1780 to 2081.');
