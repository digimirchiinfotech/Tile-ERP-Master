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

import React, { useState, useEffect } from 'react';
import { Card, ProgressBar, Badge, Row, Col, Alert } from 'react-bootstrap';
import { CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react';

/**
 * Component to display workflow status and progression
 * Shows which stages are complete and which are pending
 */
const ExportWorkflowProgressIndicator = ({ completionData, exportInvoiceId }) => {
  if (!completionData) return null;

  const stages = [
    { key: 'has_packing_list', label: 'Packing List', icon: CheckCircle },
    { key: 'has_annexure', label: 'Annexure', icon: CheckCircle },
    { key: 'has_backside', label: 'Backside', icon: CheckCircle },
    { key: 'has_vgm', label: 'VGM', icon: CheckCircle },
    { key: 'has_shipping_instructions', label: 'Shipping', icon: CheckCircle }
  ];

  const completionPercentage = completionData.completionPercentage || 0;

  const getNextPendingStage = () => {
    for (const stage of stages) {
      if (!completionData[stage.key]) {
        return stage.label;
      }
    }
    return null;
  };

  const nextStage = getNextPendingStage();

  return (
    <Card className="mb-3 border-primary">
      <Card.Header className="bg-light">
        <h6 className="mb-2">Export Workflow Progress</h6>
        <ProgressBar 
          now={completionPercentage} 
          label={`${completionPercentage}%`}
          variant={completionPercentage === 100 ? 'success' : 'info'}
        />
      </Card.Header>
      <Card.Body>
        <Row className="mb-3">
          {stages.map((stage, index) => (
            <React.Fragment key={stage.key}>
              <Col xs="auto" className="d-flex align-items-center">
                <div className="text-center">
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: completionData[stage.key]
                        ? '#d4edda'
                        : '#fff3cd',
                      border: `2px solid ${
                        completionData[stage.key] ? '#28a745' : '#ffc107'
                      }`
                    }}
                  >
                    {completionData[stage.key] ? (
                      <CheckCircle size={20} color="#28a745" />
                    ) : (
                      <Clock size={20} color="#ffc107" />
                    )}
                  </div>
                  <small className="d-block mt-2 text-center" style={{ width: '40px' }}>
                    {stage.label}
                  </small>
                </div>
              </Col>
              {index < stages.length - 1 && (
                <Col xs="auto" className="d-flex align-items-center">
                  <ArrowRight size={24} color="#ccc" />
                </Col>
              )}
            </React.Fragment>
          ))}
        </Row>

        {nextStage && (
          <Alert variant="info" className="mb-0">
            <AlertCircle size={16} className="me-2" style={{ display: 'inline' }} />
            <strong>Next Step:</strong> Create {nextStage} document
          </Alert>
        )}

        {completionPercentage === 100 && (
          <Alert variant="primary" className="mb-0">
            <CheckCircle size={16} className="me-2" style={{ display: 'inline' }} />
            <strong>Workflow Complete!</strong> All export documents have been created.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default ExportWorkflowProgressIndicator;




