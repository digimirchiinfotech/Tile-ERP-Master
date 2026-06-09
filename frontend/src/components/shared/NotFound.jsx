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
import { Container, Row, Col, Card } from 'react-bootstrap';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Button from './Button.jsx';

const NotFound = ({ onBack }) => {
  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
      <Row className="w-100 justify-content-center">
        <Col md={8} lg={6}>
          <Card className="border-0 shadow-sm text-center p-5 rounded-4">
            <Card.Body>
              <div className="mb-4">
                <AlertCircle size={64} className="text-warning mb-3" />
                <h2 className="fw-bold text-dark">404 - Page Not Found</h2>
                <p className="text-muted fs-5">
                  The page you are looking for doesn't exist or has been moved.
                </p>
              </div>
              {onBack && (
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={onBack}
                  className="px-4 py-2 fw-semibold"
                >
                  <ArrowLeft size={18} className="me-2" />
                  Return to Dashboard
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFound;
