const fs = require('fs');

function refactorForm(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace old Card with PremiumCard
  if (!content.includes("import PremiumCard")) {
    content = content.replace("import { Row, Col, Card, Form, Badge } from 'react-bootstrap';", "import { Row, Col, Card, Form, Badge } from 'react-bootstrap';\nimport PremiumCard from '../shared/PremiumCard.jsx';");
  }

  // Replace specific inline styled cards with PremiumCard
  content = content.replace(/<Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>/g, '<PremiumCard className="mb-4">');
  content = content.replace(/<Card className="shadow-sm border-0 mb-4">/g, '<PremiumCard className="mb-4">');
  content = content.replace(/<\/Card>/g, '</PremiumCard>');
  content = content.replace(/<Card\.Body className="p-4">/g, '<PremiumCard.Body className="p-4">');
  // Card inside PremiumCard is handled via PremiumCard.Body which actually is Card.Body inside PremiumCard component.
  // Wait, PremiumCard is a wrapper. It renders <Card><Card.Body>{children}</Card.Body></Card>.
  // If the original has <Card><Card.Header>...</Card.Header><Card.Body>...</Card.Body></Card>
  // We can just use PremiumCard without header prop and keep <Card.Header> inside? No, PremiumCard takes header prop, or we can just leave Card and change its class.
  
  // To avoid breaking React Bootstrap Card.Header/Card.Body structure, it's better to just swap the Card tags but NOT use PremiumCard if it breaks nested children like Card.Header. 
  // Let's just do regex replacements for classes.
  
  // Re-read file fresh to discard the above experiments
  content = fs.readFileSync(filePath, 'utf8');

  // 1. Labels
  content = content.replace(/<Form\.Label className="fw-bold small text-muted">/g, '<Form.Label className="premium-form-label">');
  content = content.replace(/<Form\.Label className="fw-bold small text-muted text-uppercase">/g, '<Form.Label className="premium-form-label">');
  content = content.replace(/<Form\.Label className="fw-bold text-muted small">/g, '<Form.Label className="premium-form-label">');
  
  // 2. Form Controls and Selects
  // This is tricky because some have existing classes. We can append premium-input.
  // E.g. <Form.Control\n
  content = content.replace(/<Form\.Control/g, '<Form.Control className="premium-input"');
  content = content.replace(/<Form\.Select/g, '<Form.Select className="premium-input"');
  // Deduplicate if we accidentally got className="premium-input" className="..."
  content = content.replace(/className="premium-input"(\s+)className="/g, 'className="premium-input ');
  
  // 3. Card Styles
  content = content.replace(/<Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>/g, '<Card className="premium-card mb-4">');
  content = content.replace(/<Card className="shadow-sm border-0 mb-4">/g, '<Card className="premium-card mb-4">');
  content = content.replace(/<Card className="shadow-sm border-0">/g, '<Card className="premium-card">');
  
  // 4. Modal Styles
  content = content.replace(/<Modal\.Content/g, '<Modal.Content className="glass-modal"'); // Not standard react-bootstrap
  content = content.replace(/<Modal /g, '<Modal contentClassName="glass-modal" ');
  
  // 5. Header Styles
  content = content.replace(/<Card\.Header className="bg-light border-bottom p-3">/g, '<Card.Header className="bg-transparent border-bottom-0 pt-4 pb-2 px-4">');
  content = content.replace(/<h5 className="mb-0 fw-bold text-dark">/g, '<h5 className="mb-0 fw-bold text-dark text-gradient">');

  fs.writeFileSync(filePath, content, 'utf8');
}

const files = [
  'd:/Tile ERP/frontend/src/components/client-management/ClientForm.jsx',
  'd:/Tile ERP/frontend/src/components/supplier-management/SupplierForm.jsx',
  'd:/Tile ERP/frontend/src/components/proforma-order/OrderForm.jsx',
  'd:/Tile ERP/frontend/src/components/user-management/UserForm.jsx'
];

files.forEach(file => {
  if(fs.existsSync(file)) {
    refactorForm(file);
    console.log(`Refactored ${file}`);
  }
});
