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

import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Alert } from 'react-bootstrap';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, DollarSign, Users, Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { formatDisplayDate } from '../../utils/formatters.js';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    summary: {
      totalRevenue: 0,
      totalExports: 0,
      totalShipments: 0,
      totalClients: 0,
      pendingPayments: 0,
      completedExports: 0
    },
    charts: {
      revenueByMonth: [],
      exportsByStatus: [],
      topClients: [],
      shipmentMetrics: []
    },
    recentActivity: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/dashboard');
      const data = response.data?.data || response.data;
      
      setAnalytics({
        summary: data.summary || {},
        charts: data.charts || {},
        recentActivity: data.recentActivity || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-5">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading analytics...</p>
        </div>
      </Container>
    );
  }

  const COLORS = ['#1e3a8a', '#059669', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <Container fluid className="py-5">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">Business Intelligence Dashboard</h2>
          <p className="text-muted">Real-time insights into your export operations and business metrics</p>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4 g-3">
        <Col md={6} lg={3}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-shrink-0 me-3">
                <div className="bg-primary bg-opacity-10 p-3 rounded" style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign className="text-primary" size={24} />
                </div>
              </div>
              <div>
                <p className="text-muted mb-1">Total Revenue</p>
                <h4 className="mb-0">${(analytics.summary.totalRevenue || 0).toLocaleString()}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-shrink-0 me-3">
                <div className="bg-success bg-opacity-10 p-3 rounded" style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package className="text-success" size={24} />
                </div>
              </div>
              <div>
                <p className="text-muted mb-1">Total Exports</p>
                <h4 className="mb-0">{analytics.summary.totalExports || 0}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-shrink-0 me-3">
                <div className="bg-info bg-opacity-10 p-3 rounded" style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users className="text-info" size={24} />
                </div>
              </div>
              <div>
                <p className="text-muted mb-1">Active Clients</p>
                <h4 className="mb-0">{analytics.summary.totalClients || 0}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-shrink-0 me-3">
                <div className="bg-warning bg-opacity-10 p-3 rounded" style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock className="text-warning" size={24} />
                </div>
              </div>
              <div>
                <p className="text-muted mb-1">Pending Payments</p>
                <h4 className="mb-0">{analytics.summary.pendingPayments || 0}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="mb-4 g-3">
        <Col lg={8}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-start border-0">
              <h6 className="mb-0 fw-bold text-white">
                <TrendingUp size={18} className="me-2 text-white" />
                Monthly Revenue Trend
              </h6>
            </Card.Header>
            <Card.Body>
              {analytics.charts.revenueByMonth && analytics.charts.revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0} debounce={100}>
                  <LineChart data={analytics.charts.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#1e3a8a" strokeWidth={2} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted text-center py-5">No data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-start border-0">
              <h6 className="mb-0 fw-bold text-white">Export Status Distribution</h6>
            </Card.Header>
            <Card.Body>
              {analytics.charts.exportsByStatus && analytics.charts.exportsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0} debounce={100}>
                  <PieChart>
                    <Pie
                      data={analytics.charts.exportsByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.charts.exportsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted text-center py-5">No data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Clients */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-start border-0">
              <h6 className="mb-0 fw-bold text-white">Top Clients by Revenue</h6>
            </Card.Header>
            <Card.Body>
              {analytics.charts.topClients && analytics.charts.topClients.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0} debounce={100}>
                  <BarChart data={analytics.charts.topClients}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#059669" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted text-center py-5">No data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-start border-0">
              <h6 className="mb-0 fw-bold text-white">Shipment Performance</h6>
            </Card.Header>
            <Card.Body>
              {analytics.charts.shipmentMetrics && analytics.charts.shipmentMetrics.length > 0 ? (
                <Table striped bordered hover size="sm">
                  <thead className="bg-light">
                    <tr>
                      <th>Metric</th>
                      <th>Count</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.charts.shipmentMetrics.map((metric, idx) => (
                      <tr key={idx}>
                        <td>{metric.name}</td>
                        <td className="fw-bold">{metric.value}</td>
                        <td>
                          {metric.value > 0 ? (
                            <span className="badge bg-success">Active</span>
                          ) : (
                            <span className="badge bg-secondary">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted text-center py-5">No data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm overflow-hidden mb-4">
            <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
              <h5 className="mb-0 fw-bold text-nowrap me-2">Recent Activity</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {analytics.recentActivity && analytics.recentActivity.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="table-responsive d-none d-lg-block">
                    <Table hover className="mb-0 align-middle">
                      <thead>
                        <tr className="table-light text-muted small text-uppercase">
                          <th className="ps-4">Date</th>
                          <th>Event</th>
                          <th>Invoice</th>
                          <th>Client</th>
                          <th className="pe-4 text-end">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recentActivity.map((activity, idx) => (
                          <tr key={idx}>
                            <td className="ps-4">{formatDisplayDate(activity.createdAt)}</td>
                            <td>{activity.eventType}</td>
                            <td className="fw-bold text-primary">{activity.invoiceNo}</td>
                            <td>{activity.clientName}</td>
                            <td className="pe-4 text-end">
                              <Badge bg={activity.status === 'completed' ? 'success' : activity.status === 'pending' ? 'warning' : 'danger'}>
                                {activity.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="d-lg-none bg-light-subtle p-3">
                    {analytics.recentActivity.map((activity, idx) => (
                      <Card key={idx} className="mb-3 border-0 shadow-sm activity-mobile-card">
                        <Card.Body className="p-4">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <h6 className="fw-bold mb-1 text-dark">{activity.invoiceNo}</h6>
                              <div className="text-muted small">{formatDisplayDate(activity.createdAt)}</div>
                            </div>
                            <div className="status-container">
                              <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${
                                activity.status === 'completed' ? 'success' : activity.status === 'pending' ? 'warning' : 'danger'
                              }`}>
                                {activity.status}
                              </div>
                            </div>
                          </div>
                          <div className="detail-item mb-2">
                            <label className="text-muted small fw-bold mb-1 d-block">Event:</label>
                            <div className="text-dark small">{activity.eventType}</div>
                          </div>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Client:</label>
                            <div className="text-dark fw-bold small">{activity.clientName}</div>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted mb-0">No recent activity</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <style>{`
        .activity-mobile-card {
          border-radius: 12px;
        }
        .status-box {
          letter-spacing: 0.5px;
          font-size: 0.75rem;
          min-width: 80px;
          text-align: center;
        }
        .bg-light-subtle {
          background-color: #f8f9fa;
        }
      `}</style>
    </Container>
  );
};

export default AnalyticsDashboard;




