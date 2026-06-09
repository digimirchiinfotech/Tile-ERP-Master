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
import { formatPrice, formatDisplayDate } from '../../utils/formatters.js';

const AccountPrintView = ({ entryData }) => {
  if (!entryData) return null;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm' }}>
      <div className="text-center mb-5 border-bottom pb-4">
        <h2 className="fw-bold text-uppercase mb-1">Financial Transaction Voucher</h2>
        <p className="text-muted small mb-0">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <Row className="mb-4">
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Voucher / Entry No</label>
            <div className="fw-bold h5 mb-0 text-dark">{entryData.entryNo}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Transaction Type</label>
            <div className={`fw-bold text-uppercase ${entryData.type === 'Receivable' ? 'text-info' : 'text-warning'}`}>{entryData.type}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Party / Client Name</label>
            <div className="fw-semibold text-dark h6 mb-0">{entryData.partyName}</div>
          </div>
        </Col>
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Transaction Status</label>
            <div className={`fw-bold h5 mb-0 ${entryData.status === 'Paid' ? 'text-success' : 'text-danger'}`}>{entryData.status?.toUpperCase()}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Entry Date</label>
            <div className="text-dark">{formatDisplayDate(entryData.date)}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Reference Invoice</label>
            <div className="text-dark fw-bold">{entryData.invoiceNo || 'N/A'}</div>
          </div>
        </Col>
      </Row>

      <hr className="my-4" />

      <h5 className="fw-bold mb-3 text-uppercase small text-muted">Financial Details</h5>
      <Table bordered size="sm">
        <tbody>
          <tr>
            <th className="bg-light" style={{ width: '30%' }}>Transaction Amount</th>
            <td className="fw-bold text-dark" style={{ fontSize: '1.2rem' }}>{formatPrice(entryData.amount, entryData.currency || 'USD')}</td>
          </tr>
          <tr>
            <th className="bg-light">Payment Mode</th>
            <td>{entryData.paymentMode || 'N/A'}</td>
          </tr>
          <tr>
            <th className="bg-light">Due Date</th>
            <td>{formatDisplayDate(entryData.dueDate)}</td>
          </tr>
        </tbody>
      </Table>

      <h5 className="fw-bold mb-3 text-uppercase small text-muted mt-4">Remarks / Description</h5>
      <div className="p-3 border rounded bg-light" style={{ minHeight: '100px' }}>
        <p className="mb-0">{entryData.remarks || 'No additional notes provided for this transaction.'}</p>
      </div>

      <div className="mt-5 pt-5 border-top text-center text-muted small">
        <p>© {new Date().getFullYear()} Finance Department. Authorized Financial Record.</p>
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

export default AccountPrintView;
