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
import { Row, Col, Card, ProgressBar, Spinner, Alert } from 'react-bootstrap';
import { HardDrive, FileText, Image as ImageIcon, FileSpreadsheet, Paperclip, File } from 'lucide-react';
import api from '../../services/api';

const StorageMonitoring = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storageData, setStorageData] = useState(null);

  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/storage/stats');
        if (response.data?.success) {
          setStorageData(response.data.data);
        } else {
          setError('Failed to load storage data');
        }
      } catch (err) {
        console.error('Storage fetch error:', err);
        setError('Error connecting to storage service');
      } finally {
        setLoading(false);
      }
    };

    fetchStorageData();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center p-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  if (!storageData) return null;

  const totalLimit = parseFloat(storageData.limit) || 10;
  const usedStorage = parseFloat(storageData.used) || 0;
  const remainingStorage = parseFloat(storageData.remaining) || (totalLimit - usedStorage);
  const usedPercentage = (usedStorage / totalLimit) * 100;

  const iconMap = {
    'PDF': FileText,
    'Excel': FileSpreadsheet,
    'Images': ImageIcon,
    'QC Attachments': Paperclip,
    'Documents': File
  };

  const storageDetails = storageData.details.map(d => ({
    ...d,
    icon: iconMap[d.type] || File
  }));

  return (
    <div className="storage-monitoring-container">
      <Row className="mb-4">
        <Col md={12}>
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                    <HardDrive size={24} className="text-primary" />
                  </div>
                  <div>
                    <h5 className="mb-1 fw-bold text-dark">Storage Overview</h5>
                    <p className="text-muted small mb-0">System-wide storage utilization</p>
                  </div>
                </div>
                <div className="text-end">
                  <h4 className="fw-bold mb-0 text-dark">{usedStorage.toFixed(2)} GB <span className="text-muted fw-normal" style={{ fontSize: '1rem' }}>/ {totalLimit} GB</span></h4>
                  <p className="text-success small fw-bold mb-0">{remainingStorage.toFixed(2)} GB Remaining</p>
                </div>
              </div>

              <div className="mb-4">
                <ProgressBar style={{ height: '12px', borderRadius: '6px' }}>
                  {storageDetails.map((item, idx) => (
                    <ProgressBar 
                      key={idx} 
                      variant={item.color} 
                      now={parseFloat(item.percent)} 
                    />
                  ))}
                </ProgressBar>
                <div className="d-flex justify-content-between mt-2">
                  <span className="text-muted small fw-bold">{usedPercentage.toFixed(1)}% Used</span>
                  <span className="text-muted small fw-bold">100% Total</span>
                </div>
              </div>

              <Row className="g-3">
                {storageDetails.map((item, idx) => (
                  <Col md={4} lg={2} key={idx} className="flex-grow-1">
                    <Card className="border shadow-none rounded-3 h-100">
                      <Card.Body className="p-3 text-center">
                        <div className={`text-${item.color} mb-2`}>
                          <item.icon size={28} />
                        </div>
                        <h6 className="fw-bold mb-1">{item.type}</h6>
                        <p className="text-muted small fw-bold mb-0">{item.size}</p>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StorageMonitoring;
