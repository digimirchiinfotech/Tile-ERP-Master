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
import { Card, Row, Col, Alert, Badge } from 'react-bootstrap';
import { Info, Copy, Check } from 'lucide-react';

/**
 * Component to display inherited/inherited data from previous stages
 * Shows which fields are inherited and allows copying values
 */
const InheritedDataDisplay = ({ inheritedData, stage, onFieldUse }) => {
  const [copiedField, setCopiedField] = React.useState(null);

  if (!inheritedData || Object.keys(inheritedData).length === 0) {
    return null;
  }

  const handleCopyValue = (fieldName, value) => {
    navigator.clipboard.writeText(String(value));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUseField = (fieldName, value) => {
    if (onFieldUse) {
      onFieldUse(fieldName, value);
    }
  };

  const formatFieldName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value);
  };

  return (
    <Card className="mb-3 border-info">
      <Card.Header className="bg-light">
        <div className="d-flex align-items-center gap-2">
          <Info size={20} color="#0dcaf0" />
          <h6 className="mb-0">Inherited Data from Previous Stage</h6>
          <Badge bg="info" className="ms-2">Auto-populated</Badge>
        </div>
      </Card.Header>
      <Card.Body>
        <Alert variant="info" className="mb-3">
          <strong>Note:</strong> The following fields have been automatically inherited from the previous stage. 
          You can modify these values if needed. Click on a field to use or copy its value.
        </Alert>

        <Row>
          {Object.entries(inheritedData).map(([key, value]) => (
            <Col md={6} lg={4} className="mb-3" key={key}>
              <Card className="h-100 shadow-sm border-info-subtle">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <small className="text-muted font-weight-bold">
                      {formatFieldName(key)}
                    </small>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary p-0"
                        style={{ width: '24px', height: '24px', lineHeight: '1' }}
                        onClick={() => handleCopyValue(key, value)}
                        title="Copy value"
                      >
                        {copiedField === key ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div
                    className="p-2 bg-light rounded text-break"
                    style={{
                      fontSize: '0.875rem',
                      maxHeight: '100px',
                      overflow: 'auto',
                      wordBreak: 'break-word'
                    }}
                  >
                    <code>{formatValue(value)}</code>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
};

export default InheritedDataDisplay;




