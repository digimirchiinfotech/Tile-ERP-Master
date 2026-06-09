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

const SanitarywareProductPrintView = ({ productData }) => {
  if (!productData) return null;

  return (
    <div className="print-view-container p-5 bg-white" style={{ minHeight: '297mm' }}>
      <div className="text-center mb-5 border-bottom pb-4">
        <h2 className="fw-bold text-uppercase mb-1">Sanitaryware Specification Report</h2>
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
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">Product Name</label>
            <div className="fw-bold h4 mb-0 text-dark">{productData.name}</div>
          </div>
          <Row>
            <Col xs={6}>
              <label className="text-muted small fw-bold text-uppercase d-block mb-1">Category</label>
              <div className="fw-semibold">{productData.category || 'N/A'}</div>
            </Col>
            <Col xs={6}>
              <label className="text-muted small fw-bold text-uppercase d-block mb-1">Product Code / SKU</label>
              <div className="fw-semibold text-primary">{productData.product_code || productData.productCode || 'N/A'}</div>
            </Col>
          </Row>
          <div className="mt-3">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">HSN Code</label>
            <div className="fw-semibold small">{productData.hsn_code || productData.hsnCode || 'N/A'}</div>
          </div>
        </Col>
      </Row>

      <hr className="my-4" />

      <Row>
        <Col xs={6}>
          <h5 className="fw-bold mb-3 text-uppercase small text-muted">Technical Attributes</h5>
          <Table bordered size="sm">
            <tbody>
              <tr>
                <th className="bg-light" style={{ width: '40%' }}>Brand</th>
                <td>{productData.brand || 'Generic'}</td>
              </tr>
              <tr>
                <th className="bg-light">Collection</th>
                <td>{productData.collection || 'Standard'}</td>
              </tr>
              <tr>
                <th className="bg-light">Color</th>
                <td>{productData.color || 'White'}</td>
              </tr>
              <tr>
                <th className="bg-light">Material Type</th>
                <td>{productData.material_type || productData.materialType || 'Vitreous China'}</td>
              </tr>
              <tr>
                <th className="bg-light">Shape</th>
                <td>{productData.shape || 'Standard'}</td>
              </tr>
              <tr>
                <th className="bg-light">Flush Type</th>
                <td>{productData.flush_type || productData.flushType || 'N/A'}</td>
              </tr>
              <tr>
                <th className="bg-light">Trap Type</th>
                <td>{productData.trap_type || productData.trapType || 'N/A'}</td>
              </tr>
            </tbody>
          </Table>
        </Col>
        <Col xs={6}>
          <h5 className="fw-bold mb-3 text-uppercase small text-muted">Dimensions & Packaging</h5>
          <Table bordered size="sm">
            <tbody>
              <tr>
                <th className="bg-light" style={{ width: '40%' }}>Mount Type</th>
                <td>{productData.mount_type || productData.mountType || 'Floor Mounted'}</td>
              </tr>
              <tr>
                <th className="bg-light">Seat Cover</th>
                <td>{productData.seat_cover_type || productData.seatCoverType || 'N/A'}</td>
              </tr>
              <tr>
                <th className="bg-light">Dimensions (LxWxH)</th>
                <td>
                  {productData.dimensions_l || productData.dimensionsL || '0'} x {productData.dimensions_w || productData.dimensionsW || '0'} x {productData.dimensions_h || productData.dimensionsH || '0'} mm
                </td>
              </tr>
              <tr>
                <th className="bg-light">Weight / Piece</th>
                <td>{productData.weight_per_piece || productData.weightPerPiece || '0'} KG</td>
              </tr>
              <tr>
                <th className="bg-light">Pcs / Carton</th>
                <td>{productData.pcs_per_box || productData.pcsPerBox || '1'} Pcs</td>
              </tr>
            </tbody>
          </Table>
        </Col>
      </Row>

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

export default SanitarywareProductPrintView;
