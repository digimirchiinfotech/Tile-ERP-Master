const fs = require('fs');
let data = fs.readFileSync('src/components/user-management/UserDashboard.jsx', 'utf8');

data = data.replace(/<Card className="text-center h-100 shadow-sm border-0 stats-card">/g, '<Card className="h-100 shadow-sm border-0 stats-card">');
data = data.replace(/<Card\.Body className="p-2 d-flex flex-column align-items-center justify-content-center">/g, '<Card.Body className="p-3 d-flex align-items-center gap-3">');

data = data.replace(/<div className="icon-box bg-(.*?)-light mb-1 mx-auto" style={{ width: '32px', height: '32px' }}>/g, '<div className="icon-box bg-$1-light flex-shrink-0" style={{ width: \'48px\', height: \'48px\', borderRadius: \'12px\' }}>');

data = data.replace(/size={16} className="text-primary"/g, 'size={24} className="text-primary"');
data = data.replace(/size={16} className="text-success"/g, 'size={24} className="text-success"');
data = data.replace(/size={16} className="text-info"/g, 'size={24} className="text-info"');

data = data.replace(/<h5 className="fw-bold mb-0">/g, '<h4 className="fw-bold mb-0 text-dark">');
data = data.replace(/<\/h5>/g, '</h4>');

data = data.replace(/<p className="text-muted extra-small mb-0 text-nowrap">/g, '<p className="text-muted small fw-semibold mb-0 text-uppercase" style={{ letterSpacing: \'1px\' }}>');

// Switch order of p and h4 so the text is above the number
data = data.replace(/(<h4.*?>.*?<\/h4>)\s*(<p.*?>.*?<\/p>)/g, '<div>\n                $2\n                $1\n              </div>');

fs.writeFileSync('src/components/user-management/UserDashboard.jsx', data, 'utf8');
