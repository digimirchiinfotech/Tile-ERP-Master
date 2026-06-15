const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.json');
const controllersPath = path.join(__dirname, 'src', 'controllers');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const allTables = Object.keys(schema);

const issues = [];

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match INSERT INTO table (col1, col2)
        // Regex is simplified but catches common patterns
        const insertMatch = line.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
        if (insertMatch) {
            const table = insertMatch[1];
            const colsStr = insertMatch[2];
            const cols = colsStr.split(',').map(c => c.trim().toLowerCase());

            if (!schema[table]) {
                issues.push(`[${path.basename(filePath)}:${i+1}] Table not found in schema: ${table}`);
            } else {
                for (const col of cols) {
                    if (col && !schema[table].includes(col)) {
                        issues.push(`[${path.basename(filePath)}:${i+1}] Column '${col}' not in table '${table}'`);
                    }
                }
            }
        }

        // We can do a rudimentary UPDATE match, but UPDATE syntax varies greatly.
        // E.g. UPDATE companies SET status = $1, updated_at = ...
        // We'll skip UPDATE for now to keep it simple, or do a simple match
        const updateMatch = line.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+)/i);
        if (updateMatch) {
             const table = updateMatch[1];
             // we won't strictly parse SET because it can span multiple lines or use string concatenation
             if (!schema[table] && table.toLowerCase() !== 'public') {
                 issues.push(`[${path.basename(filePath)}:${i+1}] Table not found in schema: ${table}`);
             }
        }
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            scanFile(fullPath);
        }
    }
}

walkDir(controllersPath);

fs.writeFileSync(path.join(__dirname, 'audit_controller_issues.json'), JSON.stringify(issues, null, 2));
console.log(`Found ${issues.length} potential issues in controllers.`);
