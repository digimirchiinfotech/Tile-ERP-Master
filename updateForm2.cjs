const fs = require('fs');
const filePath = 'frontend/src/components/account-finance-management/AccountEntryForm.jsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const newEntryNo = `ACC/')) {
    // Found start
    lines[i] = "      const newEntryNo = `ACC/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}/Auto`;";
    lines[i+1] = ""; // remove
    lines[i+2] = ""; // remove
    lines[i+3] = ""; // remove
    lines[i+4] = ""; // remove
    lines[i+5] = ""; // remove
    break;
  }
}

fs.writeFileSync(filePath, lines.filter(l => l !== "").join('\n'));
console.log('Fixed');
