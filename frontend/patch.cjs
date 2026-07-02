const fs = require('fs');
const file = 'd:/Tile ERP/frontend/src/components/account-finance-management/AccountEntryForm.jsx';
let content = fs.readFileSync(file, 'utf8');

// The exact string to replace:
const target = `              <Col md={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Linked Invoice is mandatory.</Tooltip>}>
                    <Form.Label className="small fw-bold text-danger text-uppercase tracking-wider" style={{cursor: 'help'}}>
                      Linked Invoice * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  {formData.partyName ? (`;

const replacement = `              {formData.type === 'Receipt' && (
              <Col md={6}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Linked Invoice is mandatory.</Tooltip>}>
                    <Form.Label className="small fw-bold text-danger text-uppercase tracking-wider" style={{cursor: 'help'}}>
                      Linked Invoice * <Info size={12} className="ms-1" />
                    </Form.Label>
                  </OverlayTrigger>
                  {formData.partyName ? (`;

content = content.replace(target, replacement);

const targetEnd = `                  <Form.Control.Feedback type="invalid">{errors.invoiceNo}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Amount is mandatory.</Tooltip>}>`;

const replacementEnd = `                  <Form.Control.Feedback type="invalid">{errors.invoiceNo}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              )}
              <Col md={4}>
                <Form.Group>
                  <OverlayTrigger placement="top" overlay={<Tooltip>Amount is mandatory.</Tooltip>}>`;

content = content.replace(targetEnd, replacementEnd);

fs.writeFileSync(file, content);
console.log('patched AccountEntryForm.jsx');
