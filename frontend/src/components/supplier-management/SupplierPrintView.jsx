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

const SupplierPrintView = ({ supplierData }) => {
  if (!supplierData) return null;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm' }}>
      <div className="text-center mb-5 border-bottom pb-4">
        <h2 className="fw-bold text-uppercase mb-1">Supplier Profile Report</h2>
        <p className="text-muted small mb-0">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <Row className="mb-4">
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Supplier Factory Name</label>
            <div className="fw-bold h5 mb-0 text-dark">{supplierData.name}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Contact Person</label>
            <div className="fw-semibold text-dark">{supplierData.contactPersonName || 'N/A'}</div>
          </div>
        </Col>
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">City / Region</label>
            <div className="fw-bold text-primary text-uppercase">{supplierData.city || 'N/A'} — {supplierData.country || 'India'}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Status</label>
            <div className={`fw-bold ${supplierData.status === 'Active' ? 'text-success' : 'text-danger'}`}>{supplierData.status}</div>
          </div>
        </Col>
      </Row>

      <hr className="my-4" />

      <Row>
        <Col xs={6}>
          <h5 className="fw-bold mb-3 text-uppercase small text-muted">Business Summary</h5>
          <Table bordered size="sm">
            <tbody>
              <tr>
                <th className="bg-light" style={{ width: '40%' }}>Total Orders</th>
                <td>{supplierData.totalOrders || 0}</td>
              </tr>
              <tr>
                <th className="bg-light">Business Value</th>
                <td>₹{(supplierData.totalPurchaseValue || 0).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <th className="bg-light">Payment Terms</th>
                <td>{supplierData.paymentTerms || 'N/A'}</td>
              </tr>
              <tr>
                <th className="bg-light">Lead Time</th>
                <td>{supplierData.leadTime || 'N/A'}</td>
              </tr>
              <tr>
                <th className="bg-light">Quality Rating</th>
                <td>{supplierData.qualityRating ? `${supplierData.qualityRating}/5` : 'N/A'}</td>
              </tr>
            </tbody>
          </Table>
        </Col>
        <Col xs={6}>
          <h5 className="fw-bold mb-3 text-uppercase small text-muted">Tax & Bank Details</h5>
          <Table bordered size="sm">
            <tbody>
              <tr>
                <th className="bg-light" style={{ width: '40%' }}>GST Number</th>
                <td>{supplierData.gstn || 'N/A'}</td>
              </tr>
              <tr>
                <th className="bg-light">PAN Number</th>
                <td>{supplierData.pan || 'N/A'}</td>
              </tr>
              <tr>
                <th className="bg-light">Bank Name</th>
                <td>{supplierData.bankDetails?.bankName || 'N/A'}</td>
              </tr>
              <tr>
                <th className="bg-light">Account No.</th>
                <td>{supplierData.bankDetails?.accountNumber || 'N/A'}</td>
              </tr>
              <tr>
                <th className="bg-light">IFSC Code</th>
                <td>{supplierData.bankDetails?.ifscCode || 'N/A'}</td>
              </tr>
            </tbody>
          </Table>
        </Col>
      </Row>

      <div className="mt-4">
        <h5 className="fw-bold mb-3 text-uppercase small text-muted">Address & Contact</h5>
        <Table bordered size="sm">
          <tbody>
            <tr>
              <th className="bg-light" style={{ width: '20%' }}>Email</th>
              <td>{supplierData.emailId}</td>
              <th className="bg-light" style={{ width: '20%' }}>Contact</th>
              <td>{supplierData.contactNumber}</td>
            </tr>
            <tr>
              <th className="bg-light">Address</th>
              <td colSpan={3}>{supplierData.address || 'N/A'}</td>
            </tr>
            {supplierData.website && (
              <tr>
                <th className="bg-light">Website</th>
                <td colSpan={3}>{supplierData.website}</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {supplierData.productCategories && (
        <div className="mt-4">
          <h5 className="fw-bold mb-3 text-uppercase small text-muted">Product Categories</h5>
          <div className="d-flex flex-wrap gap-2">
            {(Array.isArray(supplierData.productCategories) 
                ? supplierData.productCategories 
                : typeof supplierData.productCategories === 'string'
                  ? supplierData.productCategories.split(',')
                  : []
            ).map((cat, idx) => (
              <span key={idx} className="badge bg-light text-dark border p-2">{String(cat).trim()}</span>
            ))}
          </div>
        </div>
      )}

      {supplierData.notes && (
        <div className="mt-4">
          <h5 className="fw-bold mb-3 text-uppercase small text-muted">Additional Notes</h5>
          <div className="p-3 bg-light border rounded small">
            {supplierData.notes}
          </div>
        </div>
      )}

      <div className="mt-5 pt-5 border-top text-center text-muted small">
        <p>© {new Date().getFullYear()} Enterprise Dashboard. Supplier Verification Document.</p>
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

export default SupplierPrintView;
