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

const UserPrintView = ({ userData }) => {
  if (!userData) return null;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm' }}>
      <div className="text-center mb-5 border-bottom pb-4">
        <h2 className="fw-bold text-uppercase mb-1">User Profile Report</h2>
        <p className="text-muted small mb-0">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <Row className="mb-4">
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Full Name</label>
            <div className="fw-bold h5 mb-0 text-dark">{userData.name}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Email Address</label>
            <div className="fw-semibold text-dark">{userData.emailId}</div>
          </div>
        </Col>
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Role / Designation</label>
            <div className="fw-bold text-primary text-uppercase">{userData.role?.replace('_', ' ')}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Status</label>
            <div className={`fw-bold ${userData.status === 'Active' ? 'text-success' : 'text-danger'}`}>{userData.status}</div>
          </div>
        </Col>
      </Row>

      <hr className="my-4" />

      <h5 className="fw-bold mb-3 text-uppercase small text-muted">Additional Information</h5>
      <Row>
        <Col xs={4}>
          <label className="text-muted small fw-bold d-block mb-1">Contact Number</label>
          <div className="mb-3">{userData.contactNumber || 'N/A'}</div>
        </Col>
        <Col xs={4}>
          <label className="text-muted small fw-bold d-block mb-1">Department</label>
          <div className="mb-3">{userData.department || 'N/A'}</div>
        </Col>
        <Col xs={4}>
          <label className="text-muted small fw-bold d-block mb-1">Designation</label>
          <div className="mb-3">{userData.designation || 'N/A'}</div>
        </Col>
      </Row>

      <div className="mt-5 pt-5 border-top text-center text-muted small">
        <p>© {new Date().getFullYear()} Enterprise Dashboard. Confidential Information.</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-view-container, .print-view-container * { visibility: visible; }
          .print-view-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 15mm; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
};

export default UserPrintView;
