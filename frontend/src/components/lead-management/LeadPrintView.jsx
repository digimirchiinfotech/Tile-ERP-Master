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
import { Row, Col, Badge } from 'react-bootstrap';

const LeadPrintView = ({ leadData }) => {
  if (!leadData) return null;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm' }}>
      <div className="text-center mb-5 border-bottom pb-4">
        <h2 className="fw-bold text-uppercase mb-1">Lead Inquiry Report</h2>
        <p className="text-muted small mb-0">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <Row className="mb-4">
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Lead Name / Company</label>
            <div className="fw-bold h5 mb-0 text-dark">{leadData.name || leadData.companyName}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Source</label>
            <div className="fw-semibold text-dark">{leadData.source || 'N/A'}</div>
          </div>
        </Col>
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Status</label>
            <div className="fw-bold text-primary text-uppercase">{leadData.status || 'New'}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Created At</label>
            <div className="text-dark">{new Date(leadData.created_at || leadData.createdAt).toLocaleDateString()}</div>
          </div>
        </Col>
      </Row>

      <hr className="my-4" />

      <h5 className="fw-bold mb-3 text-uppercase small text-muted">Contact Information</h5>
      <Row>
        <Col xs={6}>
          <label className="text-muted small fw-bold d-block mb-1">Email Address</label>
          <div className="mb-3">{leadData.emailId || leadData.email || 'N/A'}</div>
          <label className="text-muted small fw-bold d-block mb-1">Contact Number</label>
          <div className="mb-3">{leadData.contactNumber || leadData.phone || 'N/A'}</div>
        </Col>
        <Col xs={6}>
          <label className="text-muted small fw-bold d-block mb-1">Country</label>
          <div className="mb-3">{leadData.country || 'N/A'}</div>
          <label className="text-muted small fw-bold d-block mb-1">City</label>
          <div className="mb-3">{leadData.city || 'N/A'}</div>
        </Col>
      </Row>

      <h5 className="fw-bold mb-3 text-uppercase small text-muted mt-4">Inquiry Details</h5>
      <div className="p-3 bg-light rounded mb-4" style={{ minHeight: '150px' }}>
        <p className="white-space-pre-wrap">{leadData.requirement || leadData.inquiryDetails || 'No specific requirement details provided.'}</p>
      </div>

      <h5 className="fw-bold mb-3 text-uppercase small text-muted mt-4">Assigned To</h5>
      <div className="p-2 border rounded d-inline-block px-3">
        <span className="fw-bold">{leadData.salesPersonResolvedName || leadData.salesPersonName || leadData.assignedTo || leadData.assignedSalesperson || 'Unassigned'}</span>
      </div>

      <div className="mt-5 pt-5 border-top text-center text-muted small">
        <p>© {new Date().getFullYear()} Enterprise Dashboard. Lead Confidential Data.</p>
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

export default LeadPrintView;
