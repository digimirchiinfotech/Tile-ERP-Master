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

import React from 'react';
import { Row, Col } from 'react-bootstrap';

const ClientPrintView = ({ clientData }) => {
  if (!clientData) return null;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm' }}>
      <div className="text-center mb-5 border-bottom pb-4">
        <h2 className="fw-bold text-uppercase mb-1">Client Profile Report</h2>
        <p className="text-muted small mb-0">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <Row className="mb-4">
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Company Name</label>
            <div className="fw-bold h5 mb-0 text-dark">{clientData.clientName || clientData.name}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Client Code</label>
            <div className="fw-semibold text-dark">{clientData.clientId || clientData.code || 'N/A'}</div>
          </div>
        </Col>
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Country</label>
            <div className="fw-bold text-primary text-uppercase">{clientData.country || 'N/A'}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Status</label>
            <div className={`fw-bold ${clientData.status === 'Active' ? 'text-success' : 'text-danger'}`}>{clientData.status || 'Active'}</div>
          </div>
        </Col>
      </Row>

      <hr className="my-4" />

      <h5 className="fw-bold mb-3 text-uppercase small text-muted">Contact Information</h5>
      <Row>
        <Col xs={6}>
          <label className="text-muted small fw-bold d-block mb-1">Contact Person</label>
          <div className="mb-3 fw-bold">{clientData.contactPersonName || 'N/A'}</div>
          <label className="text-muted small fw-bold d-block mb-1">Email Address</label>
          <div className="mb-3">{clientData.emailId || clientData.email || 'N/A'}</div>
        </Col>
        <Col xs={6}>
          <label className="text-muted small fw-bold d-block mb-1">Mobile / Phone</label>
          <div className="mb-3">{clientData.contactNumber || clientData.phone || 'N/A'}</div>
          <label className="text-muted small fw-bold d-block mb-1">Website</label>
          <div className="mb-3">{clientData.website || 'N/A'}</div>
        </Col>
      </Row>

      <h5 className="fw-bold mb-3 text-uppercase small text-muted mt-4">Address Details</h5>
      <div className="p-3 bg-light rounded mb-4">
        <div className="white-space-pre-wrap">{clientData.address || 'N/A'}</div>
        {clientData.city && <span>{clientData.city}, </span>}
        {clientData.country && <span>{clientData.country} </span>}
      </div>

      <h5 className="fw-bold mb-3 text-uppercase small text-muted mt-4">Business & Shipping Details</h5>
      <Row className="mb-4">
        <Col xs={6}>
          <label className="text-muted small fw-bold d-block mb-1">Business Type</label>
          <div className="mb-3">{clientData.businessType || 'N/A'}</div>
          <label className="text-muted small fw-bold d-block mb-1">Port of Loading</label>
          <div className="mb-3">{clientData.portOfLoading || 'N/A'}</div>
          <label className="text-muted small fw-bold d-block mb-1">Credit Limit</label>
          <div className="mb-3">{clientData.creditLimit || '0.00'}</div>
        </Col>
        <Col xs={6}>
          <label className="text-muted small fw-bold d-block mb-1">Currency</label>
          <div className="mb-3">{clientData.currency || 'N/A'}</div>
          <label className="text-muted small fw-bold d-block mb-1">Port of Discharge</label>
          <div className="mb-3">{clientData.portOfDischarge || 'N/A'}</div>
          <label className="text-muted small fw-bold d-block mb-1">Credit Days</label>
          <div className="mb-3">{clientData.creditDays || '0'}</div>
        </Col>
      </Row>

      <div className="mt-5 pt-5 border-top text-center text-muted small">
        <p>© {new Date().getFullYear()} Enterprise Dashboard. Confidential Information.</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-view-container, .print-view-container * { visibility: visible; }
          .print-view-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
};

export default ClientPrintView;
