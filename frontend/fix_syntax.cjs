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
    
    // Fix <Form.Control className="premium-input".Feedback
    content = content.replace(/<Form\.Control className="premium-input"\.Feedback/g, '<Form.Control.Feedback');
    
    // Fix </Form.Control className="premium-input">
    content = content.replace(/<\/Form\.Control className="premium-input">/g, '</Form.Control>');

    // Check if there are other issues with Form.Select etc
    // E.g. </Form.Select className="premium-input">
    content = content.replace(/<\/Form\.Select className="premium-input">/g, '</Form.Select>');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed syntax errors in ${file}`);
  }
});
