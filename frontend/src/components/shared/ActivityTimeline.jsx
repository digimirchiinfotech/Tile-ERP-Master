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
import { Card, Spinner, Alert } from 'react-bootstrap';
import { Clock, Plus, Edit, CheckCircle, Lock, Printer, Download, FileText } from 'lucide-react';
import api from '../../services/api';
import { formatDisplayDate } from '../../utils/formatters';

const ActivityTimeline = ({ resourceType, resourceId }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/document-activity/${resourceType}/${resourceId}/timeline`);
        if (response.data?.success) {
          setTimeline(response.data.data || []);
        } else {
          throw new Error('Failed to fetch timeline');
        }
      } catch (err) {
        setError(err.message || 'Error fetching timeline');
      } finally {
        setLoading(false);
      }
    };

    if (resourceType && resourceId) {
      fetchTimeline();
    }
  }, [resourceType, resourceId]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm mt-4">
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" />
          <span className="ms-2">Loading timeline...</span>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm mt-4">
        <Card.Body>
          <Alert variant="danger" className="mb-0">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATE': return <Plus size={16} className="text-primary" />;
      case 'UPDATE': return <Edit size={16} className="text-info" />;
      case 'STATUS_CHANGE': return <FileText size={16} className="text-warning" />;
      case 'APPROVE': return <CheckCircle size={16} className="text-success" />;
      case 'LOCK': return <Lock size={16} className="text-dark" />;
      case 'PRINT': return <Printer size={16} className="text-secondary" />;
      case 'DOWNLOAD': return <Download size={16} className="text-secondary" />;
      default: return <Clock size={16} className="text-muted" />;
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'CREATE': return 'Created';
      case 'UPDATE': return 'Updated';
      case 'STATUS_CHANGE': return 'Status Changed';
      case 'APPROVE': return 'Approved';
      case 'LOCK': return 'Locked';
      case 'PRINT': return 'Printed';
      case 'DOWNLOAD': return 'Downloaded';
      default: return action;
    }
  };

  if (timeline.length === 0) {
    return (
      <Card className="border-0 shadow-sm mt-4">
        <Card.Header className="bg-white border-bottom">
          <h6 className="mb-0 fw-bold"><Clock size={16} className="me-2 text-muted" /> Activity Timeline</h6>
        </Card.Header>
        <Card.Body>
          <p className="text-muted mb-0 small text-center">No activity recorded for this document.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm mt-4">
      <Card.Header className="bg-white border-bottom">
        <h6 className="mb-0 fw-bold"><Clock size={16} className="me-2 text-muted" /> Activity Timeline</h6>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="position-relative" style={{ borderLeft: '2px solid #e9ecef', paddingLeft: '20px' }}>
          {timeline.map((entry, index) => (
            <div key={index} className="mb-4 position-relative">
              <div 
                className="position-absolute bg-white rounded-circle d-flex align-items-center justify-content-center border"
                style={{ 
                  width: '30px', 
                  height: '30px', 
                  left: '-36px',
                  top: '-4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                {getActionIcon(entry.action)}
              </div>
              <div className="d-flex flex-column">
                <span className="fw-bold" style={{ fontSize: '0.9rem' }}>
                  {getActionText(entry.action)} by {entry.user_name || 'System'}
                </span>
                <span className="text-muted small">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
};

export default ActivityTimeline;
