import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const srcDir = path.resolve('d:/Tile ERP/frontend/src');
const allFiles = [];
walkDir(srcDir, (filePath) => {
  allFiles.push(filePath);
});

const fileSet = new Set(allFiles.map(f => f.toLowerCase()));

let hasError = false;

allFiles.forEach(file => {
  if (!file.endsWith('.js') && !file.endsWith('.jsx')) return;
  const content = fs.readFileSync(file, 'utf8');
  
  // match import/export statements
  const importRegex = /(?:import|export)\s+.*?(?:from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const dir = path.dirname(file);
      let absolutePath = path.resolve(dir, importPath);
      
      // Try resolving extensions
      const exts = ['', '.js', '.jsx', '/index.js', '/index.jsx'];
      let resolved = false;
      let matchedFile = null;
      for (const ext of exts) {
        const checkPath = absolutePath + ext;
        if (fileSet.has(checkPath.toLowerCase())) {
          resolved = true;
          // check if casing matches
          const actualPath = allFiles.find(f => f.toLowerCase() === checkPath.toLowerCase());
          if (actualPath && actualPath !== checkPath) {
            console.error(`Case mismatch in ${file}:\n  Imported: ${importPath}\n  Actual:   ${actualPath}`);
            hasError = true;
          }
          break;
        }
      }
    }
  }
});

if (!hasError) {
  console.log("No case sensitivity issues found.");
}
