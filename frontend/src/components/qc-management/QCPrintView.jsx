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
import { Row, Col, Table, Badge } from 'react-bootstrap';
import { getCompanyConfig } from '../../config/companyConfig';
import { resolveImageUrl } from '../../utils/urlHelper';

const QCPrintView = ({ qcData }) => {
  if (!qcData) return null;

  const getStatusColor = (status) => {
    const colors = {
      Passed: '#198754',
      Failed: '#dc3545',
      Pending: '#ffc107',
      'Under Process': '#0dcaf0'
    };
    return colors[status] || '#6c757d';
  };

  const companyConfig = getCompanyConfig(qcData?.company_id || qcData?.companyId);
  const logoUrl = qcData?.company_info?.logo_url || qcData?.company_info?.logoUrl || companyConfig.exporter.logoUrl;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm', position: 'relative' }}>
      <div className="d-flex justify-content-between align-items-center mb-5 border-bottom pb-4">
        <div className="text-start">
          <h2 className="fw-bold text-uppercase mb-1">Quality Control Inspection Report</h2>
          <p className="text-muted small mb-0">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
        </div>
        {logoUrl && (
          <div className="ms-auto">
            <img 
              src={resolveImageUrl(logoUrl)} 
              alt="Company Logo" 
              style={{ maxHeight: '45px', maxWidth: '140px' }}
            />
          </div>
        )}
      </div>

      <Row className="mb-4">
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">QC ID / Reference</label>
            <div className="fw-bold h5 mb-0 text-dark">{qcData.qcId}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Order Number</label>
            <div className="fw-semibold text-dark">{qcData.orderNumber || 'N/A'}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Client Firm Name</label>
            <div className="text-dark">{qcData.clientName || 'N/A'}</div>
          </div>
        </Col>
        <Col xs={6}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Overall QC Status</label>
            <div className="fw-bold h5 mb-0" style={{ color: getStatusColor(qcData.qcStatus) }}>
              {qcData.qcStatus?.toUpperCase() || 'PENDING'}
            </div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Inspection Date</label>
            <div className="text-dark">{qcData.qcDate ? new Date(qcData.qcDate).toLocaleDateString() : 'N/A'}</div>
          </div>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Product Name</label>
            <div className="text-dark fw-bold">{qcData.productName || 'N/A'}</div>
          </div>
        </Col>
      </Row>

      <hr className="my-4" />

      <h5 className="fw-bold mb-3 text-uppercase small text-muted">Inspection Parameters</h5>
      <Table bordered size="sm">
        <thead>
          <tr className="bg-light">
            <th style={{ width: '40%' }}>Checkpoint Parameter</th>
            <th>Observation / Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Dimensional Check</strong></td>
            <td>{qcData.inspectionDetails?.dimensionalCheck || 'Checked & Verified'}</td>
          </tr>
          <tr>
            <td><strong>Surface Quality</strong></td>
            <td>{qcData.inspectionDetails?.surfaceQuality || 'Good'}</td>
          </tr>
          <tr>
            <td><strong>Color Consistency</strong></td>
            <td>{qcData.inspectionDetails?.colorConsistency || 'Matching Samples'}</td>
          </tr>
          <tr>
            <td><strong>Packaging Condition</strong></td>
            <td>{qcData.inspectionDetails?.packagingCondition || 'Intact'}</td>
          </tr>
          <tr>
            <td><strong>Overall Grade</strong></td>
            <td>{qcData.overallGrade || 'Grade A'}</td>
          </tr>
          <tr>
            <td><strong>Box Type</strong></td>
            <td>{qcData.boxType || qcData.box_type || [...new Set(qcData.productLines?.map(l => l.boxType || l.box_type).filter(b => b && b !== 'N/A'))].join(', ') || 'N/A'}</td>
          </tr>
        </tbody>
      </Table>

      <h5 className="fw-bold mb-3 text-uppercase small text-muted mt-4">Notes & Remarks</h5>
      <div className="p-3 border rounded bg-light" style={{ minHeight: '100px' }}>
        <p className="mb-0">{qcData.notes || 'No additional remarks provided.'}</p>
      </div>

      {qcData.defects && qcData.defects.length > 0 && (
        <div className="mt-4">
          <h5 className="fw-bold mb-3 text-uppercase small text-danger">Defects Documented</h5>
          <Table bordered size="sm" className="table-danger">
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {qcData.defects.map((defect, idx) => (
                <tr key={idx}>
                  <td>{defect.type}</td>
                  <td>{defect.severity}</td>
                  <td>{defect.description}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <div className="mt-5 pt-5 border-top text-center text-muted small">
        <p>© {new Date().getFullYear()} Quality Control Department. Confidential Technical Report.</p>
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

export default QCPrintView;
