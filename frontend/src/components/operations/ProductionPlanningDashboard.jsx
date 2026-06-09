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
import { Card, Row, Col, Table, Badge, Spinner } from 'react-bootstrap';
import { Layers, Activity, Settings, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const ProductionPlanningDashboard = () => {
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCapacities();
  }, []);

  const fetchCapacities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/order-sheets/capacity');
      const data = response.data?.data || response.data || [];
      setCapacities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching factory capacities:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAllocated = capacities.reduce((sum, f) => sum + (f.total_allocated || 0), 0);
  const totalProduced = capacities.reduce((sum, f) => sum + (f.total_produced || 0), 0);
  
  // Count how many factories are heavily loaded (e.g. pending > 5000 SQM)
  const overloadedCount = capacities.filter(f => f.total_pending > 5000).length;

  return (
    <div className="dashboard-container p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1 d-flex align-items-center">
            <Layers className="text-primary me-2" />
            Factory Capacity Planning
          </h4>
          <p className="text-muted small mb-0">Live production tracking and load balancing across all factories.</p>
        </div>
      </div>

      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                <Settings size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-muted small mb-0 fw-bold text-uppercase">Active Factories</p>
                <h3 className="fw-bold mb-0 text-dark">{capacities.length}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-success bg-opacity-10 p-3 rounded-circle me-3">
                <TrendingUp size={24} className="text-success" />
              </div>
              <div>
                <p className="text-muted small mb-0 fw-bold text-uppercase">Total Network Load</p>
                <h3 className="fw-bold mb-0 text-dark">{totalAllocated.toLocaleString()} <span className="fs-6 text-muted">SQM</span></h3>
                <div className="small text-success fw-medium">Produced: {totalProduced.toLocaleString()} SQM</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-danger bg-opacity-10 p-3 rounded-circle me-3">
                <AlertTriangle size={24} className="text-danger" />
              </div>
              <div>
                <p className="text-muted small mb-0 fw-bold text-uppercase">High Load Factories</p>
                <h3 className="fw-bold mb-0 text-dark">{overloadedCount}</h3>
                <div className="small text-muted fw-medium">&gt; 5,000 SQM Pending</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-bottom p-3">
          <h5 className="mb-0 fw-bold d-flex align-items-center">
            <Activity size={18} className="me-2 text-primary" />
            Factory Load Distribution
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="text-secondary small fw-semibold border-bottom-0 ps-4">Factory Name</th>
                  <th className="text-secondary small fw-semibold border-bottom-0 text-end">Total Allocated</th>
                  <th className="text-secondary small fw-semibold border-bottom-0 text-end">Total Produced</th>
                  <th className="text-secondary small fw-semibold border-bottom-0 text-end">Pending SQM</th>
                  <th className="text-secondary small fw-semibold border-bottom-0" style={{ minWidth: '250px' }}>Capacity Load Indicator</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                    </td>
                  </tr>
                ) : capacities.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      No factory data found.
                    </td>
                  </tr>
                ) : (
                  capacities.map((factory) => {
                    const allocated = factory.total_allocated || 0;
                    const produced = factory.total_produced || 0;
                    const pending = factory.total_pending || 0;
                    const progress = allocated > 0 ? (produced / allocated) * 100 : 0;
                    
                    let statusColor = 'success';
                    if (pending > 2000 && pending <= 5000) statusColor = 'warning';
                    if (pending > 5000) statusColor = 'danger';

                    return (
                      <tr key={factory.factory_id}>
                        <td data-label="Factory Name" className="ps-4 fw-bold">{factory.factory_name}</td>
                        <td data-label="Total Allocated" className="text-end fw-medium">{allocated.toLocaleString()}</td>
                        <td data-label="Total Produced" className="text-end fw-medium text-success">{produced.toLocaleString()}</td>
                        <td data-label="Pending SQM" className={`text-end fw-bold text-${statusColor}`}>
                          {pending.toLocaleString()}
                        </td>
                        <td data-label="Load Indicator" className="pe-4">
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="fw-medium text-muted">Progress</span>
                            <span className="fw-bold">{progress.toFixed(1)}%</span>
                          </div>
                          <div className="progress" style={{ height: '8px' }}>
                            <div 
                              className={`progress-bar bg-${statusColor}`} 
                              role="progressbar" 
                              style={{ width: `${Math.min(100, progress)}%` }} 
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ProductionPlanningDashboard;
