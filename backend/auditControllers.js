import fs from 'fs';
import path from 'path';

const dir = 'src/controllers';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const report = {
  parseIntUUID: [],
  missingAwaitQuery: [],
  missingCatchNext: []
};

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n');

  let inCatchBlock = false;
  let catchHasNext = false;
  
  lines.forEach((line, i) => {
    // Check for parseInt on IDs
    if (/parseInt\s*\(\s*(req\.params\.id|id)\s*\)/.test(line)) {
      if (!line.includes('count') && !line.includes('limit') && !line.includes('page')) {
        report.parseIntUUID.push(`${file}:${i+1} -> ${line.trim()}`);
      }
    }

    // Check for missing await on query
    if (/(req\.db\.query|req\.db\.globalQuery)/.test(line) && !line.includes('await') && !line.includes('const') && !line.includes('return')) {
      if (!line.includes('ensureSchemaExists')) {
        report.missingAwaitQuery.push(`${file}:${i+1} -> ${line.trim()}`);
      }
    }

    // Check catch blocks for next(error)
    if (line.includes('catch (error) {') || line.includes('catch (err) {') || line.match(/catch\s*\(\w+\)\s*\{/)) {
      inCatchBlock = true;
      catchHasNext = false;
    }

    if (inCatchBlock && (line.includes('next(') || line.includes('res.status'))) {
      catchHasNext = true;
    }

    if (inCatchBlock && line.includes('}')) {
      if (!catchHasNext && !line.includes('console') && !line.includes('debugLogger')) {
        report.missingCatchNext.push(`${file}:${i+1} -> End of catch without next()`);
      }
      inCatchBlock = false;
    }
  });
}

console.log(JSON.stringify(report, null, 2));
