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
import { Card, Row, Col } from 'react-bootstrap';

export const StatsCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card className="h-100 shadow-sm border-0 rounded-3 bg-white">
    <Card.Body className="d-flex align-items-center p-3">
      <div 
        className="rounded-circle d-flex align-items-center justify-content-center me-3"
        style={{ 
          width: '48px', 
          height: '48px', 
          backgroundColor: `${color || '#0d6efd'}15`,
          color: color || '#0d6efd' 
        }}
      >
        {Icon && <Icon size={24} />}
      </div>
      <div>
        <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>{title}</div>
        <div className="h4 mb-0 fw-bold" style={{ color: '#212529' }}>{value}</div>
        {subtitle && <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>{subtitle}</div>}
      </div>
    </Card.Body>
  </Card>
);

export const StatsRow = ({ stats }) => (
  <Row className="g-3 mb-4">
    {stats.map((stat, idx) => (
      <Col key={idx} xs={12} sm={6} md={3}>
        <StatsCard {...stat} />
      </Col>
    ))}
  </Row>
);

export default StatsCard;




