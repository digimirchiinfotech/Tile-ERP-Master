const fs = require('fs');
const glob = require('glob'); // Note: We might not have glob, better to use fs and path to traverse

const traverseDir = (dir, callback) => {
  fs.readdirSync(dir).forEach(file => {
    let fullPath = dir + '/' + file;
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
};

traverseDir('d:/Tile ERP/frontend/src/components', (filePath) => {
  if (filePath.endsWith('View.jsx') || filePath.endsWith('PrintView.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Apply Modal styling
    if (content.includes('<Modal ') && !content.includes('contentClassName="glass-modal"')) {
      content = content.replace(/<Modal /g, '<Modal contentClassName="glass-modal" ');
      changed = true;
    }

    // Convert basic cards inside views to PremiumCard where applicable
    if (content.includes('<Card className="border-0 shadow-sm') || content.includes('<Card className="shadow-sm border-0')) {
      if(!content.includes('import PremiumCard')) {
        content = content.replace("import { Card", "import PremiumCard from '../shared/PremiumCard.jsx';\nimport { Card");
      }
      content = content.replace(/<Card className="border-0 shadow-sm[^>]*>/g, '<PremiumCard className="mb-3">');
      content = content.replace(/<Card className="shadow-sm border-0[^>]*>/g, '<PremiumCard className="mb-3">');
      content = content.replace(/<\/Card>/g, '</PremiumCard>');
      content = content.replace(/<Card\.Body/g, '<PremiumCard.Body');
      content = content.replace(/<\/Card\.Body>/g, '</PremiumCard.Body>');
      content = content.replace(/<Card\.Header/g, '<PremiumCard.Header');
      content = content.replace(/<\/Card\.Header>/g, '</PremiumCard.Header>');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Refactored Modal/View in ' + filePath);
    }
  }
});
