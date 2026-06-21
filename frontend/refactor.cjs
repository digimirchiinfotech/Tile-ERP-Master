const fs = require('fs');
const path = 'd:/Tile ERP/frontend/src/components/supplier-management/SupplierDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Chunk 1: Imports
content = content.replace("import ActivityTimeline from '../shared/ActivityTimeline.jsx';", 
  "import ActivityTimeline from '../shared/ActivityTimeline.jsx';\nimport PremiumCard from '../shared/PremiumCard.jsx';\nimport PremiumDataGrid from '../shared/PremiumDataGrid.jsx';");

// Chunk 2: Columns
const beforeReturn = `  if (!canManageSuppliers) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access Supplier Management.</p>
      </div>
    );
  }

  return (`

const withColumns = `  if (!canManageSuppliers) {
    return (
      <div className="text-center py-5">
        <h4>Access Denied</h4>
        <p>You don't have permission to access Supplier Management.</p>
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
      key: 'select',
      label: (
        <Form.Check
          type="checkbox"
          checked={bulk.selectedIds.length === filteredSuppliers.length && filteredSuppliers.length > 0}
          onChange={() => bulk.selectAll(filteredSuppliers)}
          title="Select All"
        />
      ),
      width: '40px',
      render: (row) => (
        <Form.Check
          type="checkbox"
          checked={bulk.selectedIds.includes(row.id)}
          onChange={() => bulk.toggleSelect(row.id)}
        />
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (supplier) => (
        <div 
          onDoubleClick={() => canEdit && setInlineEditingId(supplier.id)}
          title={canEdit ? "Double-click to quick-edit status" : ""}
          style={{ cursor: canEdit ? 'pointer' : 'default' }}
        >
          {inlineEditingId === supplier.id ? (
            <InlineStatusEdit 
              status={supplier.status} 
              onChange={(newStatus) => handleInlineStatusChange(supplier, newStatus)} 
              onBlur={() => setInlineEditingId(null)}
            />
          ) : (
            <StatusBadge status={supplier.status} />
          )}
        </div>
      )
    },
    { key: 'name', label: 'Supplier Factory Name', render: (row) => <span className="fw-semibold text-primary">{row.name}</span> },
    { key: 'contactPersonName', label: 'Contact Person', render: (row) => row.contactPersonName || '-' },
    { key: 'city', label: 'City', render: (row) => row.city || '-' },
    { key: 'totalOrders', label: 'Total Orders', render: (row) => row.totalOrders || 0 },
    { key: 'totalValue', label: 'Total Value', render: (row) => \`₹\${((row.totalPurchaseValue || 0) / 100000).toFixed(1)}L\` },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (supplier) => (
        <div className="d-flex justify-content-end gap-1 pe-4">
          <Button
            variant="outline"
            size="sm"
            className="text-info border-info-subtle"
            onClick={() => handleViewSupplier(supplier)}
            title="View Profile"
            aria-label="View Profile"
          >
            <Eye size={14} />
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="text-primary border-primary-subtle"
              onClick={() => handleEditSupplier(supplier)}
              title="Edit"
              aria-label="Edit"
            >
              <Edit size={14} />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-success border-success-subtle"
            onClick={() => handleDownloadPDF(supplier)}
            title="Download PDF"
            aria-label="Download PDF"
          >
            <Download size={14} />
          </Button>
          {canEdit && (
            <Button
              variant={supplier.status === 'Active' ? 'outline-warning' : 'outline-success'}
              size="sm"
              className={supplier.status === 'Active' ? 'border-warning-subtle text-warning' : 'border-success-subtle text-success'}
              onClick={() => handleToggleSupplierStatus(supplier.id)}
              title={supplier.status === 'Active' ? 'Deactivate' : 'Activate'}
              aria-label={supplier.status === 'Active' ? 'Deactivate' : 'Activate'}
            >
              <Power size={14} />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-danger border-danger-subtle"
              onClick={() => handleDeleteSupplier(supplier.id)}
              title="Delete"
              aria-label="Delete"
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
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Building size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Suppliers</p>
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
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Active Suppliers</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.active}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><TrendingUp size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Value</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>₹{(dashboardStats.totalValue / 100000).toFixed(1)}L</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-danger-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><XCircle size={18} className="text-danger" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Inactive Suppliers</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dashboardStats.inactive}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>`;

const newStats = `<Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <PremiumCard isHoverable bodyClassName="p-3 d-flex align-items-center gap-3">
            <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px' }}><Building size={20} className="text-primary" /></div>
            <div className="text-start">
              <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Total Suppliers</p>
              <h4 className="fw-bold mb-0 text-dark">{dashboardStats.total}</h4>
            </div>
          </PremiumCard>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <PremiumCard isHoverable bodyClassName="p-3 d-flex align-items-center gap-3">
            <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px' }}><CheckCircle size={20} className="text-success" /></div>
            <div className="text-start">
              <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Active Suppliers</p>
              <h4 className="fw-bold mb-0 text-dark">{dashboardStats.active}</h4>
            </div>
          </PremiumCard>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <PremiumCard isHoverable bodyClassName="p-3 d-flex align-items-center gap-3">
            <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px' }}><TrendingUp size={20} className="text-warning" /></div>
            <div className="text-start">
              <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Total Value</p>
              <h4 className="fw-bold mb-0 text-dark">₹{(dashboardStats.totalValue / 100000).toFixed(1)}L</h4>
            </div>
          </PremiumCard>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <PremiumCard isHoverable bodyClassName="p-3 d-flex align-items-center gap-3">
            <div className="icon-box bg-danger-light flex-shrink-0 d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px' }}><XCircle size={20} className="text-danger" /></div>
            <div className="text-start">
              <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Inactive Suppliers</p>
              <h4 className="fw-bold mb-0 text-dark">{dashboardStats.inactive}</h4>
            </div>
          </PremiumCard>
        </Col>
      </Row>`;

content = content.replace(oldStats, newStats);

// Chunk 4: Replace Table
const oldTableStart = '<div className="table-responsive d-none d-lg-block">';
const oldTableEnd = '</div>\n\n          <div className="d-lg-none bg-light-subtle p-3">';
const startIndex = content.indexOf(oldTableStart);
const endIndex = content.indexOf(oldTableEnd);

if(startIndex > -1 && endIndex > -1) {
  const newTable = `<div className="d-none d-lg-block">
            <PremiumDataGrid 
              columns={gridColumns} 
              data={paginatedSuppliers} 
              keyField="id" 
              rowClassName={(row) => bulk.selectedIds.includes(row.id) ? 'table-active' : ''} 
              emptyMessage="No suppliers found. Add your first supplier to get started." 
            />
          </div>`;
  content = content.substring(0, startIndex) + newTable + '\n\n          <div className="d-lg-none bg-light-subtle p-3">' + content.substring(endIndex + oldTableEnd.length);
}

fs.writeFileSync(path, content, 'utf8');
console.log('SupplierDashboard modified successfully.');
