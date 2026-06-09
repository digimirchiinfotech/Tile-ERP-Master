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

import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Link } from 'lucide-react';
import WorkflowTracker from './WorkflowTracker';
import { workflowConnections } from '../../utils/helpers';

export default function GlobalWorkflowTracker() {
  const [show, setShow] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  useEffect(() => {
    const handleOpenWorkflow = (e) => {
      const doc = e.detail.doc;
      if (!doc) return;

      const docNo = doc.invoiceNo || doc.piReference || doc.invoice_reference || doc.pi_reference || doc.invoice_ref || doc.orderNo || doc.order_no || 'Unknown';
      
      const workflowData = workflowConnections.getRelatedDocuments(docNo);
      
      setSelectedWorkflow({
        ...workflowData,
        sourceType: 'Module',
        sourceId: doc.id,
        sourceNo: docNo,
      });
      setShow(true);
    };

    window.addEventListener('openWorkflow', handleOpenWorkflow);
    return () => window.removeEventListener('openWorkflow', handleOpenWorkflow);
  }, []);

  if (!show || !selectedWorkflow) return null;

  return (
    <Modal
      show={show}
      onHide={() => setShow(false)}
      size="xl"
      centered
      style={{ zIndex: 1055 }}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <Link size={20} className="me-2" />
          Workflow Status - {selectedWorkflow.sourceNo}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <WorkflowTracker
          piNumber={selectedWorkflow.sourceNo}
          onNavigate={(view) => {
            setShow(false);
            // Optional: emit navigation event if needed
          }}
        />
      </Modal.Body>
    </Modal>
  );
}
