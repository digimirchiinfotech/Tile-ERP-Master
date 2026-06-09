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
import { Button, Badge, Modal, Row, Col } from 'react-bootstrap';
import { Eye, Edit, Power, Trash2, UserCheck } from 'lucide-react';
import './CompanyCards.css';

function CompanyCards({
  companies,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onLoginAs,
  canEdit,
  getPlanBadge,
  getStatusBadge,
}) {
  const [viewingCompany, setViewingCompany] = useState(null);

  const handleViewClick = (company) => {
    setViewingCompany(company);
    if (onView) onView(company);
  };

  return (
    <>
      <div className="company-cards-grid">
        {companies.map((company) => (
          <div key={company.id} className="company-card-wrapper">
            <div className="company-card">
              {/* Card Left Section - Content */}
              <div className="card-left-section">
                {/* Company Name */}
                <div className="company-header">
                  <h6 className="company-name">{company.name}</h6>
                </div>

                {/* Industry */}
                <div className="company-industry">
                  <small className="text-muted">{company.industry}</small>
                </div>

                {/* Plan */}
                <div className="company-plan-section">
                  {getPlanBadge(company.subscriptionPlan)}
                </div>

                {/* Monthly Revenue */}
                <div className="company-revenue">
                  <small className="text-muted">${company.monthlyRevenue}/month</small>
                </div>

                {/* Status */}
                <div className="company-status-section">
                  {getStatusBadge(company.status)}
                </div>

                {/* Users Count */}
                <div className="company-users">
                  <small className="text-muted">{company.totalUsers} users</small>
                </div>

                {/* Last Login */}
                <div className="company-login">
                  <small className="text-muted">
                    Last Login: {company.lastLogin || 'Never'}
                  </small>
                </div>
              </div>

              {/* Card Right Section - Actions */}
              <div className="card-right-section">
                <div className="action-buttons">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleViewClick(company)}
                    title="View Details"
                    className="action-btn"
                  >
                    <Eye size={16} />
                  </Button>
                  {canEdit && (
                    <>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => onEdit(company)}
                        title="Edit Company"
                        className="action-btn"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant={
                          company.status === 'Active'
                            ? 'outline-warning'
                            : 'outline-success'
                        }
                        size="sm"
                        onClick={() => onToggleStatus(company.id)}
                        title="Toggle Status"
                        className="action-btn"
                      >
                        <Power size={16} />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => onLoginAs(company)}
                    title="Login as Company"
                    className="action-btn"
                  >
                    <UserCheck size={16} />
                  </Button>
                  {canEdit && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => onDelete(company.id)}
                      title="Delete"
                      className="action-btn"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default CompanyCards;
