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
import { tokenManager } from '../../utils/tokenManager';

const ProductPrintView = ({ productData }) => {
  if (!productData) return null;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm' }}>
      <div className="text-center mb-5 border-bottom pb-4">
        <h2 className="fw-bold text-uppercase mb-1">Product Specification Report</h2>
        <p className="text-muted small mb-0">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <Row className="mb-4 align-items-center">
        <Col xs={4}>
          {productData.images && productData.images.length > 0 ? (
            <img 
              src={`${productData.images[0].url || productData.images[0].path || productData.images[0]}?token=${tokenManager.getAccessToken() || ''}`} 
              alt="Product" 
              className="img-fluid rounded border shadow-sm" 
              style={{ maxHeight: '200px', objectFit: 'contain' }} 
            />
          ) : (
            <div className="bg-light d-flex align-items-center justify-content-center border rounded" style={{ height: '200px' }}>
              <span className="text-muted text-uppercase small fw-bold">No Image Available</span>
            </div>
          )}
        </Col>
        <Col xs={8}>
          <div className="mb-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Company Product Name</label>
            <div className="fw-bold h4 mb-0 text-dark">{productData.companyProductName || productData.name}</div>
          </div>
          <Row>
            <Col xs={6}>
              <label className="text-muted small fw-bold text-uppercase d-block mb-1">Catalogue / Category</label>
              <div className="fw-semibold">{productData.catalogueName || productData.catalogue || productData.category || 'N/A'}</div>
            </Col>
            <Col xs={6}>
              <label className="text-muted small fw-bold text-uppercase d-block mb-1">Product Code / Item Ref</label>
              <div className="fw-semibold text-primary">{productData.productCode || productData.itemRef || 'N/A'}</div>
            </Col>
          </Row>
          <div className="mt-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Factory Source</label>
            <div className="fw-semibold small">{productData.factoryName || 'N/A'} — {productData.factoryProductName || 'N/A'}</div>
          </div>
        </Col>
      </Row>

      <hr className="my-4" />

      <Row>
        <Col xs={6}>
          <h5 className="fw-bold mb-3 text-uppercase small text-muted">Technical Specifications</h5>
          <Table bordered size="sm">
            <tbody>
              <tr>
                <th className="bg-light" style={{ width: '40%' }}>Size</th>
                <td>{Array.isArray(productData.size) ? productData.size.join(', ') : (productData.size || 'N/A')}</td>
              </tr>
              <tr>
                <th className="bg-light">Surface / Finish</th>
                <td>{Array.isArray(productData.surface) ? productData.surface.join(', ') : (productData.surface || 'N/A')}</td>
              </tr>
              <tr>
                <th className="bg-light">Thickness</th>
                <td>{Array.isArray(productData.thickness) ? productData.thickness.join(', ') : (productData.thickness || 'N/A')}</td>
              </tr>
              <tr>
                <th className="bg-light">Application</th>
                <td>{Array.isArray(productData.application) ? productData.application.join(', ') : (productData.application || 'N/A')}</td>
              </tr>
              <tr>
                <th className="bg-light">HS Code</th>
                <td>{productData.hsCode || 'N/A'}</td>
              </tr>
            </tbody>
          </Table>
        </Col>
        <Col xs={6}>
          <h5 className="fw-bold mb-3 text-uppercase small text-muted">Packing Specifications</h5>
          <Table bordered size="sm">
            <tbody>
              <tr>
                <th className="bg-light" style={{ width: '40%' }}>Pcs / Box</th>
                <td>{productData.boxPcs || productData.boxPC || '0'}</td>
              </tr>
              <tr>
                <th className="bg-light">Area / Box</th>
                <td>{productData.sqmPerBox || '0'} SQM</td>
              </tr>
              <tr>
                <th className="bg-light">Weight / Box</th>
                <td>{productData.defaultPerBoxWeight || productData.boxWeight || '0'} KG</td>
              </tr>
              <tr>
                <th className="bg-light">Boxes / Pallet</th>
                <td>{productData.defaultBoxesPerPallet || '0'}</td>
              </tr>
              <tr>
                <th className="bg-light">Pallet Weight</th>
                <td>{productData.defaultPerPalletWeight || '0'} KG</td>
              </tr>
            </tbody>
          </Table>
        </Col>
      </Row>

      <div className="mt-4">
        <h5 className="fw-bold mb-3 text-uppercase small text-muted">Detailed Description</h5>
        <div className="p-3 bg-light border rounded small" style={{ minHeight: '80px' }}>
          {productData.description || 'No additional technical notes provided for this product.'}
        </div>
      </div>

      <div className="mt-5 pt-5 border-top text-center text-muted small">
        <p>© {new Date().getFullYear()} Enterprise Dashboard. Product Specification Sheet — Confidential.</p>
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

export default ProductPrintView;
