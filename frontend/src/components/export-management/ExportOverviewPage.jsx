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

import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import Button from '../shared/Button.jsx';
import '../shared/DashboardButtons.css';
import { Ship, Shield, FileText, TrendingUp, Award, Eye } from 'lucide-react';
import { getExportStatistics } from '../../utils/exportDataService';

function ExportOverviewPage({ currentUser, onNavigate }) {
  const [stats, setStats] = useState({
    totalShipments: 0,
    clearedShipments: 0,
    certificates: 0,
    clearanceRate: 0
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, invoicesRes] = await Promise.all([
          getExportStatistics(),
          api.get('/export-invoices', { params: { limit: 5 } })
        ]);
        
        setStats(statsData);
        
        const invData = invoicesRes.data?.data || invoicesRes.data || [];
        const invList = Array.isArray(invData) ? invData : (invData.data || []);
        setRecentActivities(invList);
      } catch (error) {
        console.error('Error loading overview data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Export Documentation Management</h2>
          <p className="text-muted small">Comprehensive export documentation workflow management</p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Ship size={18} className="text-primary" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Shipments</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.totalShipments}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Shield size={18} className="text-success" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Cleared</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.clearedShipments}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><Award size={18} className="text-info" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Certificates</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.certificates}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><TrendingUp size={18} className="text-warning" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Clearance Rate</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.clearanceRate}%</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Quick Access</h5>
          <span className="text-white-50 small d-none d-sm-inline">Navigate to specific export documentation sections</span>
        </Card.Header>
        <Card.Body className="p-3 p-md-4">
          <Row className="g-3">
            <Col xs={12} sm={6} md={4}>
              <Card 
                className="h-100 border shadow-sm hover-elevate transition-all" 
                style={{ cursor: 'pointer', borderRadius: '12px', border: '1px solid #e0e0e0' }} 
                onClick={() => onNavigate('export-invoice')}
              >
                <Card.Body className="d-flex flex-column align-items-center text-center p-4">
                  <div className="icon-box bg-primary-light mb-2 mx-auto" style={{ width: '48px', height: '48px' }}>
                    <FileText size={24} className="text-primary" />
                  </div>
                  <h6 className="fw-bold mb-2">Export Invoices</h6>
                  <p className="text-muted small mb-0">Manage export invoices and packing lists</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Card 
                className="h-100 border shadow-sm hover-elevate transition-all" 
                style={{ cursor: 'pointer', borderRadius: '12px', border: '1px solid #e0e0e0' }} 
                onClick={() => onNavigate('packing-list-management')}
              >
                <Card.Body className="d-flex flex-column align-items-center text-center p-4">
                  <div className="icon-box bg-primary-light mb-2 mx-auto" style={{ width: '48px', height: '48px' }}>
                    <FileText size={24} className="text-primary" />
                  </div>
                  <h6 className="fw-bold mb-2">Packing List Management</h6>
                  <p className="text-muted small mb-0">Manage packing lists and shipment details</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Card 
                className="h-100 border shadow-sm hover-elevate transition-all" 
                style={{ cursor: 'pointer', borderRadius: '12px', border: '1px solid #e0e0e0' }} 
                onClick={() => onNavigate('export-invoice-annexure')}
              >
                <Card.Body className="d-flex flex-column align-items-center text-center p-4">
                  <div className="icon-box bg-success-light mb-2 mx-auto" style={{ width: '48px', height: '48px' }}>
                    <FileText size={24} className="text-success" />
                  </div>
                  <h6 className="fw-bold mb-2">Export Invoice Annexure</h6>
                  <p className="text-muted small mb-0">Manage export invoice annexures and documents</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Card 
                className="h-100 border shadow-sm hover-elevate transition-all" 
                style={{ cursor: 'pointer', borderRadius: '12px', border: '1px solid #e0e0e0' }} 
                onClick={() => onNavigate('invoice-backside')}
              >
                <Card.Body className="d-flex flex-column align-items-center text-center p-4">
                  <div className="icon-box bg-info-light mb-2 mx-auto" style={{ width: '48px', height: '48px' }}>
                    <FileText size={24} className="text-info" />
                  </div>
                  <h6 className="fw-bold mb-2">Invoice Backside</h6>
                  <p className="text-muted small mb-0">Manage invoice backsides and GST annexures</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Card 
                className="h-100 border shadow-sm hover-elevate transition-all" 
                style={{ cursor: 'pointer', borderRadius: '12px', border: '1px solid #e0e0e0' }} 
                onClick={() => onNavigate('vgm')}
              >
                <Card.Body className="d-flex flex-column align-items-center text-center p-4">
                  <div className="icon-box bg-warning-light mb-2 mx-auto" style={{ width: '48px', height: '48px' }}>
                    <Ship size={24} className="text-warning" />
                  </div>
                  <h6 className="fw-bold mb-2">VGM - Verified Gross Mass</h6>
                  <p className="text-muted small mb-0">Manage VGM and container documentation</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Card 
                className="h-100 border shadow-sm hover-elevate transition-all" 
                style={{ cursor: 'pointer', borderRadius: '12px', border: '1px solid #e0e0e0' }} 
                onClick={() => onNavigate('export-shipping-instructions')}
              >
                <Card.Body className="d-flex flex-column align-items-center text-center p-4">
                  <div className="icon-box bg-primary-light mb-2 mx-auto" style={{ width: '48px', height: '48px' }}>
                    <Ship size={24} className="text-primary" />
                  </div>
                  <h6 className="fw-bold mb-2">Shipping Instructions</h6>
                  <p className="text-muted small mb-0">Manage booking details and vessel information</p>
                </Card.Body>
              </Card>
            </Col>

          </Row>
        </Card.Body>
      </Card>
      
      {/* Recent Export Activity */}
      <Row className="mt-4">
        <Col xs={12}>
          <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
            <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
              <h5 className="mb-0 fw-bold text-nowrap me-2">Recent Export Activity ({recentActivities.length})</h5>
              <div className="d-flex gap-2 flex-nowrap align-items-center">
                <Button
                  variant="light"
                  size="sm"
                  className="text-primary fw-bold d-flex align-items-center flex-shrink-0"
                  onClick={() => onNavigate('export-invoice')}
                  style={{ width: 'auto' }}
                >
                  <FileText size={14} className="me-1" />
                  <span className="d-none d-sm-inline small">View All Invoices</span>
                  <span className="d-sm-none small">View All</span>
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {/* Desktop Table View */}
              <div className="table-responsive ">
                <Table hover className="mb-0 align-middle">
                  <thead>
                    <tr className="table-light text-muted small text-uppercase">
                      <th className="ps-4">SR. NO.</th>
                      <th>Status</th>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th>Client</th>
                      <th className="pe-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="6" className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></td></tr>
                    ) : recentActivities.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-4 text-muted">No recent export activity found</td></tr>
                    ) : recentActivities.map((inv, index) => (
                      <tr key={inv.id}>
                        <td className="ps-4 text-center">{index + 1}</td>
                        <td>
                          <Badge 
                            bg={inv.status === 'Finalized' ? 'success' : inv.status === 'Draft' ? 'secondary' : 'warning'}
                            className="rounded-pill px-3"
                          >
                            {inv.status || 'Draft'}
                          </Badge>
                        </td>
                        <td className="fw-medium text-primary">{inv.invoice_no || inv.invoiceNo}</td>
                        <td className="text-muted small">{new Date(inv.invoice_date || inv.invoiceDate).toLocaleDateString()}</td>
                        <td>{inv.client_name || inv.clientName || '-'}</td>
                        <td className="text-end pe-4">
                          <div className="d-flex justify-content-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-info border-info-subtle"
                              onClick={() => onNavigate('export-invoice')}
                              title="View Details"
                            >
                              <Eye size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="d-lg-none bg-light-subtle p-3">
                {loading ? (
                  <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>
                ) : recentActivities.length === 0 ? (
                  <div className="text-center py-5 text-muted">No recent export activity found</div>
                ) : recentActivities.map((inv, index) => (
                  <Card key={inv.id} className="mb-3 border-0 shadow-sm">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                          <h5 className="fw-bold mb-1 text-dark">{inv.invoice_no || inv.invoiceNo}</h5>
                          <div className="text-muted small">#{index + 1} • {new Date(inv.invoice_date || inv.invoiceDate).toLocaleDateString()}</div>
                        </div>
                        <div className="status-container">
                          <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${
                            inv.status === 'Finalized' ? 'success' :
                            inv.status === 'Draft' ? 'secondary' : 'warning'
                          }`}>
                            {inv.status || 'Draft'}
                          </div>
                        </div>
                      </div>

                      <Row className="g-3 mb-4">
                        <Col xs={12}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                            <div className="text-dark fw-bold">{inv.client_name || inv.clientName || 'N/A'}</div>
                          </div>
                        </Col>
                      </Row>

                      <div className="d-flex gap-2 flex-nowrap pt-3 border-top overflow-auto pb-1">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="flex-fill d-flex align-items-center justify-content-center py-2 px-1 fw-bold"
                          onClick={() => onNavigate('export-invoice')}
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          <Eye size={14} className="me-1" /> View Details
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <style>{`
        .hover-elevate:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
        .transition-all {
          transition: all 0.3s ease;
        }
        .icon-box {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        .bg-primary-light { background-color: rgba(30, 64, 175, 0.1); }
        .bg-warning-light { background-color: rgba(245, 158, 11, 0.1); }
        .bg-info-light { background-color: rgba(6, 182, 212, 0.1); }
        .bg-success-light { background-color: rgba(16, 185, 129, 0.1); }
        .bg-danger-light { background-color: rgba(239, 68, 68, 0.1); }
        .status-box {
          letter-spacing: 0.5px;
          font-size: 0.75rem;
          min-width: 80px;
          text-align: center;
        }
        .detail-item label {
          letter-spacing: 0.5px;
          color: #6c757d;
        }
        .detail-item div {
          font-weight: 500;
          font-size: 0.95rem;
        }
      `}</style>
    </>
  );
}

export default ExportOverviewPage;

