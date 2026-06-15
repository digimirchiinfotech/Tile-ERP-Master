const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('frontend/src');
let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace direct hardcoded API base with || '/api'
  content = content.replace(/"https:\/\/tile-erp-master-production\.railway\.app\/api" \|\| '\/api'/g, "(import.meta.env.DEV || import.meta.env.MODE === 'development' ? '/api' : 'https://tile-erp-master-production.railway.app/api')");
  
  // Replace without || '/api'
  content = content.replace(/"https:\/\/tile-erp-master-production\.railway\.app\/api"/g, "(import.meta.env.DEV || import.meta.env.MODE === 'development' ? '/api' : 'https://tile-erp-master-production.railway.app/api')");
  
  // Replace base without /api
  content = content.replace(/'https:\/\/tile-erp-master-production\.railway\.app'/g, "(import.meta.env.DEV || import.meta.env.MODE === 'development' ? '' : 'https://tile-erp-master-production.railway.app')");
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changed++;
    console.log('Fixed ' + file);
  }
});
console.log('Total files changed: ' + changed);
