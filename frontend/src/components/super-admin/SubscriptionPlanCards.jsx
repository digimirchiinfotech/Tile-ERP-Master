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

import { useState } from 'react';
import { Badge, Button, Modal, Row, Col } from 'react-bootstrap';
import { Plus, Edit, Trash2, Eye, Power } from 'lucide-react';
import './SubscriptionPlanCards.css';

function SubscriptionPlanCards({ 
  plans, 
  onView, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  canEdit 
}) {
  const [viewingPlan, setViewingPlan] = useState(null);

  const handleViewClick = (plan) => {
    setViewingPlan(plan);
    if (onView) onView(plan);
  };

  return (
    <>
      <div className="subscription-cards-grid">
        {plans.map((plan) => (
          <div key={plan.id} className="subscription-card-wrapper">
            <div className="subscription-card">
              {/* Card Header */}
              <div className="card-header-section">
                <h6 className="card-plan-name">{plan.name}</h6>
                <Badge bg={plan.status === 'Active' ? 'success' : 'danger'} className="card-status-badge">
                  {plan.status}
                </Badge>
              </div>

              {/* Card Body Content */}
              <div className="card-body-section">
                {/* Price */}
                <div className="plan-info-row">
                  <span className="info-label">Price:</span>
                  <span className="info-value">
                    {plan.price === 0 ? (
                      <Badge bg="success-subtle" text="success" className="fw-semibold">FREE</Badge>
                    ) : (
                      <span>${plan.price}</span>
                    )}
                  </span>
                </div>

                {/* Duration */}
                <div className="plan-info-row">
                  <span className="info-label">Duration:</span>
                  <span className="info-value">{plan.duration} {plan.durationType}</span>
                </div>

                {/* Max Users */}
                <div className="plan-info-row">
                  <span className="info-label">Users:</span>
                  <span className="info-value">
                    {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers}
                  </span>
                </div>

                {/* Features */}
                <div className="plan-features-row">
                  <span className="info-label">Features:</span>
                  <div className="features-badges">
                    {plan.features.slice(0, 2).map((feature, idx) => (
                      <Badge key={idx} bg="primary" className="feature-badge">
                        {feature.toUpperCase()}
                      </Badge>
                    ))}
                    {plan.features.length > 2 && (
                      <Badge bg="light" text="dark" className="feature-badge">
                        +{plan.features.length - 2} MORE
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="card-actions-section">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => handleViewClick(plan)} 
                  title="View"
                  className="action-btn"
                >
                  <Eye size={14} />
                </Button>
                {canEdit && (
                  <>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={() => onEdit(plan)} 
                      title="Edit"
                      className="action-btn"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button 
                      variant={plan.status === 'Active' ? 'outline-warning' : 'outline-success'} 
                      size="sm" 
                      onClick={() => onToggleStatus(plan.id)} 
                      title="Toggle Status"
                      className="action-btn"
                    >
                      <Power size={14} />
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => onDelete(plan.id)} 
                      title="Delete"
                      className="action-btn"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View Plan Modal */}
      {viewingPlan && (
        <Modal show onHide={() => setViewingPlan(null)} size="lg" backdrop="static">
          <Modal.Header closeButton>
            <Modal.Title>Subscription Plan Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <h5 className="fw-bold mb-1">{viewingPlan.name}</h5>
                <Badge bg={viewingPlan.status === 'Active' ? 'success' : 'danger'}>
                  {viewingPlan.status}
                </Badge>
              </Col>
              <Col md={6}>
                <div className="detail-item">
                  <span className="detail-label">Price</span>
                  <span className="detail-value">
                    {viewingPlan.price === 0 ? 'Free' : `$${viewingPlan.price}`}
                  </span>
                </div>
              </Col>
              <Col md={6}>
                <div className="detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">
                    {viewingPlan.duration} {viewingPlan.durationType}
                  </span>
                </div>
              </Col>
              <Col md={6}>
                <div className="detail-item">
                  <span className="detail-label">Max Users</span>
                  <span className="detail-value">
                    {viewingPlan.maxUsers === -1 ? 'Unlimited' : viewingPlan.maxUsers}
                  </span>
                </div>
              </Col>
              <Col md={6}>
                <div className="detail-item">
                  <span className="detail-label">Max Companies</span>
                  <span className="detail-value">{viewingPlan.maxCompanies}</span>
                </div>
              </Col>
              <Col md={12}>
                <p className="fw-semibold mb-2">Features</p>
                <div className="features-list">
                  {viewingPlan.features.map((f, i) => (
                    <Badge key={i} bg="secondary" className="fw-normal px-2 py-1" style={{fontSize:'12px'}}>
                      ✓ {f}
                    </Badge>
                  ))}
                </div>
              </Col>
            </Row>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
}

export default SubscriptionPlanCards;
