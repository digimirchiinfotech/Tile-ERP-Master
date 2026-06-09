/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

import { Modal, Button, Alert } from 'react-bootstrap';
import { History, Info, Check } from 'lucide-react';

function RateHistoryManager({
  show,
  onHide,
  clientName,
  productName,
  onApplyRate,
}) {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <History size={20} className="me-2" />
          Rate History - {productName}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <h6 className="text-primary">
            Client: {clientName} | Product: {productName}
          </h6>
        </div>

        <Alert variant="info">
          <Alert.Heading>
            <Info size={20} className="me-2" />
            Rate History Not Available
          </Alert.Heading>
          <p>
            Rate history tracking has been migrated to the backend database system.
            Historical rate information is now available through the invoice and order records.
          </p>
          <p className="mb-0">
            To view past rates:
          </p>
          <ul className="mb-0 mt-2">
            <li>Check previous invoices for this client and product combination</li>
            <li>Review order history for supplier rate information</li>
            <li>Use the reports section to analyze pricing trends</li>
          </ul>
        </Alert>

        <div className="text-center py-4 text-muted">
          <History size={48} className="mb-3 opacity-50" />
          <p>Please refer to invoice and order records for rate history</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default RateHistoryManager;




