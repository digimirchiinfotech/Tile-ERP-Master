const fs = require('fs');
const path = 'd:/Tile ERP/frontend/src/components/user-management/UserDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Chunk 1: Imports
content = content.replace("import ActivityTimeline from '../shared/ActivityTimeline.jsx';", 
  "import ActivityTimeline from '../shared/ActivityTimeline.jsx';\nimport PremiumCard from '../shared/PremiumCard.jsx';\nimport PremiumDataGrid from '../shared/PremiumDataGrid.jsx';");

// Chunk 2: Columns
const beforeReturn = `  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading users...</p>
      </div>
    );
  }

  return (`

const withColumns = `  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading users...</p>
      </div>
    );
  }

  const gridColumns = [
    {
      key: 'srNo',
      label: 'SR. NO.',
      width: '80px',
      render: (_, index) => <div className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</div>
    },
    {
      key: 'status',
      label: 'Status',
      render: (user) => <StatusBadge status={user.status} />
    },
    { key: 'name', label: 'Name', render: (row) => <span className="fw-semibold text-primary">{row.name}</span> },
    { key: 'emailId', label: 'Email', render: (row) => row.emailId },
    { key: 'role', label: 'Role', render: (row) => (
      <Badge bg="secondary-subtle" text="dark" className="fw-normal border">
        {userRoles[row.role] || row.role}
      </Badge>
    )},
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (user) => (
        <div className="d-flex justify-content-end gap-1 pe-4">
          <Button
            variant="outline"
            size="sm"
            className="text-info border-info-subtle"
            onClick={() => handleViewUser(user)}
            title="View Profile"
          >
            <Eye size={14} />
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="text-primary border-primary-subtle"
              onClick={() => handleEditUser(user)}
              title="Edit"
            >
              <Edit size={14} />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-success border-success-subtle"
            onClick={() => handleDownloadPDF(user)}
            title="Download PDF"
          >
            <Download size={14} />
          </Button>
          {canEdit && (
            <Button
              variant={user.status === 'Active' ? 'outline-danger' : 'outline-success'}
              size="sm"
              className={user.status === 'Active' ? 'border-danger-subtle text-danger' : 'border-success-subtle text-success'}
              onClick={() => handleToggleUserStatus(user)}
              title={user.status === 'Active' ? 'Deactivate' : 'Activate'}
            >
              <Power size={14} />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-danger border-danger-subtle"
              onClick={() => handleDeleteUser(user.id)}
              title="Delete"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (`

content = content.replace(beforeReturn, withColumns);

// Chunk 3: Replace Stats Row
const oldStats = `<Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><UsersIcon size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Users</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.total}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><CheckCircle size={18} className="text-success" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Active Users</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.active}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><ShieldCheck size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Admin Access</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{apiUsers.filter(u => ['administration', 'company_admin', 'super_admin'].includes(u.role)).length}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>`;

const newStats = `<Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <PremiumCard isHoverable bodyClassName="p-3 d-flex align-items-center gap-3">
            <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px' }}><UsersIcon size={20} className="text-primary" /></div>
            <div className="text-start">
              <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Total Users</p>
              <h4 className="fw-bold mb-0 text-dark">{dashboardStats.total}</h4>
            </div>
          </PremiumCard>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <PremiumCard isHoverable bodyClassName="p-3 d-flex align-items-center gap-3">
            <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px' }}><CheckCircle size={20} className="text-success" /></div>
            <div className="text-start">
              <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Active Users</p>
              <h4 className="fw-bold mb-0 text-dark">{dashboardStats.active}</h4>
            </div>
          </PremiumCard>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <PremiumCard isHoverable bodyClassName="p-3 d-flex align-items-center gap-3">
            <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px' }}><ShieldCheck size={20} className="text-info" /></div>
            <div className="text-start">
              <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Admin Access</p>
              <h4 className="fw-bold mb-0 text-dark">{apiUsers.filter(u => ['administration', 'company_admin', 'super_admin'].includes(u.role)).length}</h4>
            </div>
          </PremiumCard>
        </Col>
      </Row>`;

content = content.replace(oldStats, newStats);

// Chunk 4: Replace Table
const oldTableStart = '<div className="table-responsive d-none d-lg-block">';
const oldTableEnd = '</div>\n\n          {/* Mobile Card View */}';
const startIndex = content.indexOf(oldTableStart);
const endIndex = content.indexOf(oldTableEnd);

if(startIndex > -1 && endIndex > -1) {
  const newTable = `<div className="d-none d-lg-block">
            <PremiumDataGrid 
              columns={gridColumns} 
              data={paginatedUsers} 
              keyField="id" 
              emptyMessage="No users found" 
            />
          </div>`;
  content = content.substring(0, startIndex) + newTable + '\n\n          {/* Mobile Card View */}' + content.substring(endIndex + oldTableEnd.length);
}

fs.writeFileSync(path, content, 'utf8');
console.log('UserDashboard modified successfully.');
