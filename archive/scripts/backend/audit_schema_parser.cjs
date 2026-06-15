const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
const outputPath = path.join(__dirname, 'schema.json');

const schemaSql = fs.readFileSync(schemaPath, 'utf8');

const tables = {};
let currentTable = null;

const lines = schemaSql.split('\n');

for (let line of lines) {
    line = line.trim();
    if (line.startsWith('CREATE TABLE')) {
        const match = line.match(/CREATE TABLE public\.([a-zA-Z0-9_]+) \(/);
        if (match) {
            currentTable = match[1];
            tables[currentTable] = [];
        }
    } else if (currentTable && line.startsWith(');')) {
        currentTable = null;
    } else if (currentTable && line.length > 0 && !line.startsWith('--') && !line.startsWith(');')) {
        // e.g. "id uuid DEFAULT gen_random_uuid() NOT NULL,"
        // or "company_id uuid NOT NULL,"
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
            const columnName = parts[0].replace(/,/g, '');
            // Skip constraints like "CONSTRAINT" or "PRIMARY KEY"
            if (columnName !== 'CONSTRAINT' && columnName !== 'PRIMARY' && columnName !== 'FOREIGN' && columnName !== 'UNIQUE') {
                tables[currentTable].push(columnName);
            }
        }
    }
}

fs.writeFileSync(outputPath, JSON.stringify(tables, null, 2));
console.log(`Parsed ${Object.keys(tables).length} tables into schema.json`);
