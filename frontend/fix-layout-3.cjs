const fs = require('fs');
let data = fs.readFileSync('src/components/user-management/UserDashboard.jsx', 'utf8');

data = data.replace(/<Card className="h-100 shadow-sm border-0 stats-card">/g, '<Card className="shadow-sm border-0 stats-card h-auto">');
data = data.replace(/<Card\.Body className="p-3 d-flex align-items-center gap-3">/g, '<Card.Body className="p-2 d-flex align-items-center gap-3">');

data = data.replace(/style={{ width: '48px', height: '48px', borderRadius: '12px' }}/g, 'style={{ width: \'36px\', height: \'36px\', borderRadius: \'8px\' }}');
data = data.replace(/size={24}/g, 'size={18}');

data = data.replace(/<h4 className="fw-bold mb-0 text-dark">/g, '<h5 className="fw-bold mb-0 text-dark" style={{ fontSize: \'1.1rem\' }}>');
data = data.replace(/<\/h4>/g, '</h5>');

data = data.replace(/fontSize: '0.75rem'/g, 'fontSize: \'0.65rem\'');
data = data.replace(/className="mb-4 g-2 flex-nowrap overflow-auto pb-2 stats-row-container"/g, 'className="mb-2 g-2 flex-nowrap overflow-auto pb-1 stats-row-container"');

// Fix the h5 issue that caused the previous compiler error!
data = data.replace(/<h5 className="mb-0 fw-bold text-nowrap me-2">Users \({filteredUsers\.length}\)<\/h5>/g, '<h5 className="mb-0 fw-bold text-nowrap me-2">Users ({filteredUsers.length})</h5>');
data = data.replace(/<h5 className="fw-bold mb-1 text-dark">{user\.name}<\/h5>/g, '<h5 className="fw-bold mb-1 text-dark">{user.name}</h5>');

fs.writeFileSync('src/components/user-management/UserDashboard.jsx', data, 'utf8');
