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
import { X, Calendar, DollarSign, Box, Minimize2, Eye, Tag, Hash, LayoutTemplate, Brush, Droplets, ArrowDownToDot, Layers, Maximize, Target, Activity } from 'lucide-react';

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
    <Modal contentClassName="glass-modal border-0 shadow-lg" show={true} onHide={onCancel} size="xl" centered backdrop="static">
      <div className="position-relative">
        <div className="modal-header-bg bg-primary opacity-10" style={{ height: '120px', borderRadius: '16px 16px 0 0', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}></div>
        
        <Modal.Header className="border-0 pt-4 pb-0 px-4 position-relative" style={{ zIndex: 1 }}>
          <div className="w-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="d-flex align-items-center gap-2 text-muted small fw-medium text-uppercase tracking-wider">
                <Box size={14} />
                <span>Sanitaryware Products</span>
                <span>/</span>
                <span className="text-primary">{product.name}</span>
              </div>
              <button onClick={onCancel} className="btn-close-custom" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            
            <div className="d-flex align-items-end justify-content-between mt-3">
              <div className="d-flex align-items-center gap-3">
                <div className="icon-box bg-white text-primary shadow-sm rounded-4 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                  <Box size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                    {product.name}
                    <Badge bg={product.status === 'Active' ? 'success' : 'secondary'} className="px-3 py-2 rounded-pill fw-medium fs-6">
                      {product.status || 'Active'}
                    </Badge>
                  </h3>
                  <p className="text-muted mb-0 d-flex align-items-center gap-2">
                    <Tag size={16} /> {product.category}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body className="p-4 position-relative" style={{ zIndex: 1 }}>
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
                  <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-3">
                    <div className="bg-primary-subtle text-primary p-2 rounded-3">
                      <LayoutTemplate size={20} />
                    </div>
                    <h5 className="fw-bold mb-0 text-dark">Technical Attributes</h5>
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
        </Modal.Body>
      </div>

      <style>{`
        /* User Card & Grid Styles */
        .glass-modal .modal-content {
          border-radius: 16px;
          overflow: hidden;
          background: #f8fafc;
        }
        .btn-close-custom {
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.2s;
        }
        .btn-close-custom:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .user-card {
          border-radius: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .user-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.05) !important;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
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
