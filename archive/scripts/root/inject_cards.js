const fs = require('fs');

function inject(path) {
  let content = fs.readFileSync(path, 'utf8');

  const cardToInsert = `
          {/* LC & EPCG DETAILS */}
          <Card className="mb-4 shadow-sm border-0 rounded-4 overflow-hidden">
            <Card.Body className="p-4 p-md-5">
              <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-3">
                  <i className="bi bi-card-text fs-5"></i>
                </div>
                <h5 className="mb-0 fw-bold text-dark">LC & EPCG Details</h5>
              </div>
              <Row className="g-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                      LC Number
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter LC Number"
                      value={formData.lcNumber || ''}
                      disabled={true}
                      className="bg-light border-0 py-2 px-3 fw-bold"
                      style={{ borderRadius: '10px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                      LC Date
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.lcDate || ''}
                      disabled={true}
                      className="bg-light border-0 py-2 px-3 fw-bold"
                      style={{ borderRadius: '10px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                      EPCG No.
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter EPCG No."
                      value={formData.epcgNo || ''}
                      disabled={true}
                      className="bg-light border-0 py-2 px-3 fw-bold"
                      style={{ borderRadius: '10px' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
`;

  if (!content.includes('LC & EPCG Details')) {
    // Find where the status card starts to insert just before it
    const summaryCardStart = '{/* --- STATUS --- */}';
    
    if (content.includes(summaryCardStart)) {
      content = content.replace(summaryCardStart, cardToInsert + '\n        ' + summaryCardStart);
      fs.writeFileSync(path, content);
      console.log('Inserted LC & EPCG details into ' + path);
    } else {
      console.log('Could not find summary card to insert before in ' + path);
    }
  } else {
    console.log('LC details already exist in ' + path);
  }
}

inject('frontend/src/components/export-management/Invoice/ExportInvoiceForm.jsx');
inject('frontend/src/components/export-management/PackingList/PackingListForm.jsx');
