const fs = require('fs');
const file = 'frontend/src/components/client-order-management/ClientOrderDashboard.jsx';
let code = fs.readFileSync(file, 'utf8');

const badStart = `            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="border-white text-white d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>`;

const replacement = `            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="border-white text-white d-flex align-items-center flex-shrink-0"
              style={{ width: 'auto' }}
            >
              <Upload size={14} className="me-1" />
              <span className="d-none d-md-inline small">Import</span>
            </Button>
            {canEdit && (
              <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={handleCreateOrder} style={{ width: 'auto' }}>
                <Plus size={16} className="me-1" />
                <span className="d-none d-sm-inline small">Create Order</span>
                <span className="d-sm-none small">Create</span>
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {/* Desktop Table View */}
          <div className="table-responsive d-none d-lg-block">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr className="table-light text-muted small text-uppercase">
                  <th className="ps-4" style={{ width: '80px' }}>SR. NO.</th>
                  <th>Status</th>
                  <th>Order ID</th>
                  <th>Client</th>
                  <th>Country</th>
                  <th>Linked PI</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order, index) => (
                    <tr key={order.id}>
                      <td className="ps-4 text-center">{index + 1 + (currentPage - 1) * PAGE_SIZE}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td className="fw-semibold text-primary">{order.orderId || order.orderNo}</td>
                      <td>{order.clientName || order.supplierName || '-'}</td>
                      <td>{order.country}</td>
                      <td>
                        {order.invoiceRef || order.invoice_ref || order.linkedInvoice ? (
                          <Badge bg="secondary" className="fw-normal">{order.invoiceRef || order.invoice_ref || order.linkedInvoice}</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button variant="outline" size="sm" className="text-info border-info-subtle" onClick={() => handleViewOrder(order)} title="View Preview"><Eye size={14} /></Button>
                          <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handlePrintOrder(order)} title="Print"><Printer size={14} /></Button>
                          <Button variant="outline" size="sm" className="text-success border-success-subtle" onClick={() => handleDownloadPDF(order)} title="Download PDF"><Download size={14} /></Button>
                          {canEdit && <Button variant="outline" size="sm" className="text-primary border-primary-subtle" onClick={() => handleEditOrder(order)} title="Edit"><Edit size={14} /></Button>}
                          {canDelete && <Button variant="outline" size="sm" className="text-danger border-danger-subtle" onClick={() => handleDeleteOrder(order.id)} title="Delete"><Trash2 size={14} /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none bg-light-subtle p-3">
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order, index) => (
                <Card key={order.id} className="mb-3 border-0 shadow-sm pl-mobile-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">{order.orderId || order.orderNo}</h5>
                        <div className="text-muted small">#{index + 1 + (currentPage - 1) * PAGE_SIZE} • {order.country}</div>
                      </div>
                      <div className="status-container">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    <Row className="g-3 mb-4">
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                          <div className="text-dark fw-bold">{order.clientName || order.supplierName || 'N/A'}</div>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div className="detail-item">
                          <label className="text-muted small fw-bold mb-1 d-block">Linked PI:</label>
                          <div className="text-dark fw-bold">
                            {order.invoiceRef || order.invoice_ref || order.linkedInvoice ? (
                              <Badge bg="secondary" className="fw-normal">{order.invoiceRef || order.invoice_ref || order.linkedInvoice}</Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-info border-info-subtle flex-fill d-flex align-items-center justify-content-center py-2 px-2 fw-bold"
                        onClick={() => handleViewOrder(order)}
                        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        <Eye size={14} className="me-1" /> View
                      </Button>`;

if(code.includes(badStart)) {
  code = code.replace(badStart, replacement);
  fs.writeFileSync(file, code, 'utf8');
  console.log("SUCCESS");
} else {
  console.log("COULD NOT FIND BAD START");
}
