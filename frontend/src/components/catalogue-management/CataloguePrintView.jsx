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
import { tokenManager } from '../../utils/tokenManager.js';

const CataloguePrintView = ({ catalogueData }) => {
  if (!catalogueData) return null;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm' }}>
      <div className="text-center mb-5 border-bottom pb-4">
        <h2 className="fw-bold text-uppercase mb-1">Product Catalogue Report</h2>
        <p className="text-muted small mb-0">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <Row className="mb-4">
        <Col xs={4}>
          {catalogueData.coverImagePath || catalogueData.coverImage ? (
            <img 
              src={`${catalogueData.coverImagePath || catalogueData.coverImage}?token=${tokenManager.getAccessToken() || ''}`} 
              alt="Cover" 
              className="img-fluid rounded border shadow-sm" 
              style={{ maxHeight: '200px', objectFit: 'contain' }} 
            />
          ) : (
            <div className="bg-light d-flex align-items-center justify-content-center border rounded" style={{ height: '200px' }}>
              <span className="text-muted text-uppercase small fw-bold">No Cover Image</span>
            </div>
          )}
        </Col>
        <Col xs={8}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Catalogue Name</label>
            <div className="fw-bold h4 mb-0 text-dark">{catalogueData.name}</div>
          </div>
          <p className="text-muted small mb-3">{catalogueData.description || 'No description provided.'}</p>
          <Row>
            <Col xs={6}>
              <label className="text-muted small fw-bold text-uppercase d-block mb-1">Status</label>
              <div className={`fw-bold small text-uppercase ${catalogueData.status === 'Active' ? 'text-success' : 'text-warning'}`}>{catalogueData.status}</div>
            </Col>
            <Col xs={6}>
              <label className="text-muted small fw-bold text-uppercase d-block mb-1">Items Included</label>
              <div className="fw-bold small text-dark">{catalogueData.productCount || (catalogueData.products ? catalogueData.products.length : 0)} Products</div>
            </Col>
          </Row>
        </Col>
      </Row>

      <hr className="my-4" />

      <h5 className="fw-bold mb-3 text-uppercase small text-muted">Product Specifications Summary</h5>
      {catalogueData.products && catalogueData.products.length > 0 ? (
        <Table bordered size="sm" className="small">
          <thead>
            <tr className="bg-light">
              <th className="text-center" style={{ width: '50px' }}>#</th>
              <th>Product Name</th>
              <th>Reference / Code</th>
              <th>Dimensions</th>
              <th>Surface</th>
            </tr>
          </thead>
          <tbody>
            {catalogueData.products.map((product, idx) => (
              <tr key={idx}>
                <td className="text-center">{idx + 1}</td>
                <td className="fw-semibold">{product.name || product.companyProductName}</td>
                <td>{product.productCode || product.itemRef || product.item_ref || '-'}</td>
                <td>{product.size || '-'}</td>
                <td>{product.surface || '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-center text-muted py-3 small">No products listed in this catalogue.</p>
      )}

      <div className="mt-5 pt-5 border-top text-center text-muted small">
        <p>© {new Date().getFullYear()} Enterprise Dashboard. Product Marketing Document.</p>
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

export default CataloguePrintView;
