const fs = require('fs');

const files = [
  'd:/Tile ERP/frontend/src/components/client-management/ClientForm.jsx',
  'd:/Tile ERP/frontend/src/components/supplier-management/SupplierForm.jsx',
  'd:/Tile ERP/frontend/src/components/proforma-order/OrderForm.jsx',
  'd:/Tile ERP/frontend/src/components/user-management/UserForm.jsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Use a function to replace duplicate classes within Form.Control, Form.Select, etc.
    const tags = ['Form.Control', 'Form.Select', 'Modal', 'Card.Header', 'Card.Body', 'Modal.Content', 'DynamicDropdown'];
    
    tags.forEach(tag => {
      const parts = content.split(`<${tag}`);
      for (let i = 1; i < parts.length; i++) {
        const endIdx = parts[i].indexOf('/>');
        const endIdx2 = parts[i].indexOf('>');
        const closeIdx = Math.min(
          endIdx === -1 ? Infinity : endIdx,
          endIdx2 === -1 ? Infinity : endIdx2
        );
        
        if (closeIdx !== Infinity) {
          let attributes = parts[i].substring(0, closeIdx);
          
          // Count classNames
          const classNameMatches = [...attributes.matchAll(/className="([^"]*)"/g)];
          
          if (classNameMatches.length > 1) {
            // merge them
            const allClasses = classNameMatches.map(m => m[1]).join(' ').split(' ');
            const uniqueClasses = [...new Set(allClasses)].join(' ');
            
            // replace the first one with the merged classes
            let newAttributes = attributes.replace(classNameMatches[0][0], `className="${uniqueClasses}"`);
            
            // remove subsequent classNames
            for (let j = 1; j < classNameMatches.length; j++) {
              newAttributes = newAttributes.replace(classNameMatches[j][0], '');
            }
            
            parts[i] = newAttributes + parts[i].substring(closeIdx);
            changed = true;
          }
        }
      }
      content = parts.join(`<${tag}`);
    });

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Merged duplicate classes in ${file}`);
    }
  }
});
