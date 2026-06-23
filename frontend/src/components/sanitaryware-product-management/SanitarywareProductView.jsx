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
import { Modal, Button, Row, Col, Badge } from 'react-bootstrap';
import { Calendar, DollarSign, Box, Minimize2, Eye, Tag, Hash, LayoutTemplate, Brush, Droplets, ArrowDownToDot, Layers, Maximize, Target, Activity } from 'lucide-react';
import CustomButton from '../shared/Button.jsx';

function SanitarywareProductView({ product, onCancel }) {
  if (!product) return null;

  // Container capacity rule estimators
  const weightLimit = 27000; // 27 Metric Tons
  const wpp = parseFloat(product.weight_per_piece || product.weightPerPiece) || 0;

  // Pieces based on Weight limit
  const pcsWeightLimit = wpp > 0 ? Math.floor(weightLimit / wpp) : 0;

  // Utilization percentages
  const utilWeight = pcsWeightLimit * wpp;

  return (
    <Modal contentClassName="glass-modal" show={true} onHide={onCancel} size="xl" backdrop="static" dialogClassName="sanitaryware-details-modal">
      <Modal.Body className="p-4 bg-light position-relative" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        
        {/* Absolute positioned close button */}
        <button 
          type="button" 
          className="btn-close position-absolute top-0 end-0 m-4 shadow-none" 
          aria-label="Close" 
          onClick={onCancel}
          style={{ zIndex: 1050 }}
        />

        {/* ── Breadcrumb ── */}
        <div className="breadcrumb mb-2 text-muted" style={{ fontSize: '0.82rem', letterSpacing: '0.5px' }}>
          Sanitaryware Products &gt; Product Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <Box size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2" style={{ letterSpacing: '-0.3px' }}>
                {product.name}
                <Badge bg={product.status === 'Active' ? 'success' : 'secondary'} className="px-2 py-1 rounded-pill fw-medium fs-6" style={{ fontSize: '0.75rem' }}>
                  {product.status || 'Active'}
                </Badge>
              </h4>
              <span className="text-muted small d-flex align-items-center gap-1">
                <Tag size={14} /> {product.category}
              </span>
            </div>
          </div>
        </div>

        <Row className="g-4">
          {/* Images/Specs */}
          <Col lg={4}>
            <div className="user-card bg-white p-0 h-100 shadow-sm border-0 overflow-hidden d-flex flex-column">
              <div className="bg-light d-flex align-items-center justify-content-center position-relative" style={{ height: '300px' }}>
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0].url || product.images[0].path}
                    alt={product.name}
                    className="img-fluid w-100 h-100"
                    style={{ objectFit: 'contain' }}
                  />
                ) : (
                  <div className="text-center text-muted p-4">
                    <span style={{ fontSize: '4rem' }}>🚽</span>
                    <p className="small mb-0 mt-2 fw-medium">No product image uploaded</p>
                  </div>
                )}
                <div className="position-absolute bottom-0 start-0 w-100 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}>
                   <Badge bg="primary" className="fw-medium px-2 py-1 shadow-sm">{product.brand || 'Generic'}</Badge>
                </div>
              </div>
              <div className="p-4 bg-white flex-grow-1">
                <h6 className="fw-bold text-dark mb-4 border-bottom pb-2">Quick Reference</h6>
                <div className="info-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary" style={{ width: '32px', height: '32px' }}><Hash size={16} /></div>
                    <div className="content">
                      <label className="mb-0">Product Code</label>
                      <span className="fw-bold">{product.product_code || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary" style={{ width: '32px', height: '32px' }}><Target size={16} /></div>
                    <div className="content">
                      <label className="mb-0">HSN Code</label>
                      <span className="fw-medium">{product.hsn_code || product.hsnCode || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary" style={{ width: '32px', height: '32px' }}><Activity size={16} /></div>
                    <div className="content">
                      <label className="mb-0">Ref ID</label>
                      <span className="text-muted font-monospace small">{product.item_ref || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Details & Capacity */}
          <Col lg={8}>
            <div className="d-flex flex-column gap-4 h-100">
              <div className="user-card bg-white p-4 shadow-sm border-0">
                <div className="user-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold mb-4" style={{ backgroundColor: '#2563eb', margin: '-1.5rem -1.5rem 1.5rem -1.5rem', borderRadius: '16px 16px 0 0' }}>
                  <LayoutTemplate size={18} />
                  <span>Technical Attributes</span>
                </div>
                
                <div className="info-grid">
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Tag size={18} /></div>
                    <div className="content">
                      <label>Collection</label>
                      <span>{product.collection || 'Standard'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Brush size={18} /></div>
                    <div className="content">
                      <label>Color</label>
                      <span>{product.color || 'White'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Layers size={18} /></div>
                    <div className="content">
                      <label>Material Type</label>
                      <span>{product.material_type || product.materialType || 'Vitreous China'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Box size={18} /></div>
                    <div className="content">
                      <label>Shape</label>
                      <span>{product.shape || 'Standard'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Droplets size={18} /></div>
                    <div className="content">
                      <label>Flush Type</label>
                      <span>{product.flush_type || product.flushType || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><ArrowDownToDot size={18} /></div>
                    <div className="content">
                      <label>Trap Type</label>
                      <span>{product.trap_type || product.trapType || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Maximize size={18} /></div>
                    <div className="content">
                      <label>Dimensions</label>
                      <span>{product.dimensions_l || product.dimensionsL || '0'} x {product.dimensions_w || product.dimensionsW || '0'} x {product.dimensions_h || product.dimensionsH || '0'} mm</span>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="icon-wrapper bg-light text-secondary"><Target size={18} /></div>
                    <div className="content">
                      <label>Mount & Seat</label>
                      <span>{product.mount_type || product.mountType || 'Floor Mounted'} • {product.seat_cover_type || product.seatCoverType || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Row className="g-4 flex-grow-1">
                <Col md={6}>
                  <div className="user-card bg-white p-4 h-100 shadow-sm border-0 d-flex flex-column justify-content-center">
                    <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-3">
                      <div className="bg-info-subtle text-info p-2 rounded-3">
                        <Box size={20} />
                      </div>
                      <h5 className="fw-bold mb-0 text-dark">Packaging Logic</h5>
                    </div>
                    <div className="d-flex justify-content-around text-center mt-2">
                      <div>
                        <span className="text-muted small d-block fw-bold text-uppercase tracking-wider mb-2">Weight per Piece</span>
                        <h3 className="fw-bold text-primary mb-0">{wpp} <span className="fs-6 text-muted">kg</span></h3>
                      </div>
                      <div className="border-end mx-3"></div>
                      <div>
                        <span className="text-muted small d-block fw-bold text-uppercase tracking-wider mb-2">Pcs per Carton</span>
                        <h3 className="fw-bold text-dark mb-0">{product.pcs_per_box || product.pcsPerBox || 1} <span className="fs-6 text-muted">Pcs</span></h3>
                      </div>
                    </div>
                  </div>
                </Col>
                
                <Col md={6}>
                  <div className="user-card bg-primary text-white p-4 h-100 shadow-sm border-0 d-flex flex-column justify-content-center position-relative overflow-hidden">
                    <div className="position-absolute" style={{ right: '-20px', top: '-20px', opacity: 0.1 }}>
                      <Maximize size={150} />
                    </div>
                    <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 position-relative z-index-1">
                      Capacity Estimates
                    </h5>
                    <div className="position-relative z-index-1">
                      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-white-50">
                        <span className="text-white-50 fw-medium">Max Pcs Limit</span>
                        <span className="fs-4 fw-bold">{pcsWeightLimit} Pcs</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-white-50 fw-medium">Total Weight Est</span>
                        <span className="fs-5 fw-bold">{utilWeight.toLocaleString()} kg</span>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>

        {/* ── Footer ── */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top bg-white px-3 py-2" style={{ margin: '0 -24px -24px -24px' }}>
          <CustomButton variant="outline-secondary" onClick={onCancel} className="border-secondary-subtle fw-semibold px-4">
            Close
          </CustomButton>
        </div>

      </Modal.Body>

      <style>{`
        .sanitaryware-details-modal .modal-content {
          border-radius: 16px !important;
          border: none !important;
          box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
          background-color: #f8fafc !important;
        }
        
        .user-card {
          border: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .user-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.05) !important;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px 30px;
        }

        @media (max-width: 992px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        .info-icon-wrapper {
          transition: all 0.2s ease;
        }

        .info-cell:hover .info-icon-wrapper {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.1);
        }
        
        .info-cell {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .info-cell .icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .info-cell .content {
          display: flex;
          flex-direction: column;
        }
        .info-cell label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 0.25rem;
          font-weight: 600;
        }
        .info-cell span {
          color: #0f172a;
          font-weight: 500;
          font-size: 0.95rem;
          word-break: break-word;
        }
        .border-white-50 {
          border-color: rgba(255,255,255,0.2) !important;
        }
        .z-index-1 {
          z-index: 1;
        }
        .tracking-wider {
          letter-spacing: 0.05em;
        }
      `}</style>
    </Modal>
  );
}

export default SanitarywareProductView;
