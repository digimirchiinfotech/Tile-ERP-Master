const fs = require('fs');
let data = fs.readFileSync('src/components/user-management/UserDashboard.jsx', 'utf8');

data = data.replace(/<div className="icon-box bg-primary-light flex-shrink-0" style={{ width: '48px', height: '48px', borderRadius: '12px' }}><UsersIcon size={16} className="text-primary" \/><\/div>/g, '<div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: \'48px\', height: \'48px\', borderRadius: \'12px\' }}><UsersIcon size={24} className="text-primary" /></div>');

data = data.replace(/<div className="icon-box bg-success-light flex-shrink-0" style={{ width: '48px', height: '48px', borderRadius: '12px' }}><CheckCircle size={16} className="text-success" \/><\/div>/g, '<div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: \'48px\', height: \'48px\', borderRadius: \'12px\' }}><CheckCircle size={24} className="text-success" /></div>');

data = data.replace(/<div className="icon-box bg-info-light flex-shrink-0" style={{ width: '48px', height: '48px', borderRadius: '12px' }}><ShieldCheck size={16} className="text-info" \/><\/div>/g, '<div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: \'48px\', height: \'48px\', borderRadius: \'12px\' }}><ShieldCheck size={24} className="text-info" /></div>');

data = data.replace(/<div>\s*<p className="text-muted small fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '1px' }}>/g, '<div className="text-start">\n                <p className="text-muted small fw-semibold mb-0 text-uppercase" style={{ letterSpacing: \'1px\', fontSize: \'0.75rem\' }}>');

fs.writeFileSync('src/components/user-management/UserDashboard.jsx', data, 'utf8');
