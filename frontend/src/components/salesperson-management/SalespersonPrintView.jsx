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
import { Row, Col, Table } from 'react-bootstrap';

const SalespersonPrintView = ({ salespersonData }) => {
  if (!salespersonData) return null;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm' }}>
      <div className="text-center mb-5 border-bottom pb-4">
        <h2 className="fw-bold text-uppercase mb-1">Salesperson Profile Report</h2>
        <p className="text-muted small mb-0">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <Row className="mb-4">
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Full Name</label>
            <div className="fw-bold h5 mb-0 text-dark">{salespersonData.name}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Employee ID</label>
            <div className="fw-semibold text-dark">{salespersonData.employeeId || 'N/A'}</div>
          </div>
        </Col>
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Department / Location</label>
            <div className="fw-bold text-primary text-uppercase">{salespersonData.department || 'Sales'} — {salespersonData.city || 'N/A'}, {salespersonData.country || 'N/A'}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Status</label>
            <div className={`fw-bold ${salespersonData.status === 'Active' ? 'text-success' : 'text-danger'}`}>{salespersonData.status}</div>
          </div>
        </Col>
      </Row>

      <hr className="my-4" />

      <h5 className="fw-bold mb-3 text-uppercase small text-muted">Performance & Targets</h5>
      <Table bordered size="sm">
        <tbody>
          <tr>
            <th className="bg-light" style={{ width: '30%' }}>Monthly Sales Target</th>
            <td>${(salespersonData.salesTarget || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <th className="bg-light">Commission Rate</th>
            <td>{salespersonData.commission || 0}%</td>
          </tr>
          <tr>
            <th className="bg-light">Email Address</th>
            <td>{salespersonData.emailId}</td>
          </tr>
          <tr>
            <th className="bg-light">Contact Number</th>
            <td>{salespersonData.contactNumber || 'N/A'}</td>
          </tr>
        </tbody>
      </Table>

      <div className="mt-5 pt-5 border-top text-center text-muted small">
        <p>© {new Date().getFullYear()} Enterprise Dashboard. Internal Performance Document.</p>
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

export default SalespersonPrintView;
