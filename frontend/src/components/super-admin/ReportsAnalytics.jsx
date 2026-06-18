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
import { Row, Col, Card, Button, Table, Badge, Form, Spinner, Alert } from 'react-bootstrap';
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Award,
  AlertCircle,
  FileText,
  Users,
  Globe,
  Package,
  UserCheck,
  Box,
  Clock,
  BarChart,
  PieChart} from 'lucide-react';
import api from '../../services/api';
import SalesAnalytics from '../analytics/SalesAnalytics.jsx';
import { exportToCSV } from '../../utils/exportUtils.js';
import './ReportsAnalytics.css';

function ReportsAnalytics({ currentUser }) {
  const [activeReport, setActiveReport] = useState('analytics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Real data states
  const [salesReports, setSalesReports] = useState([]);
  const [operationalReports, setOperationalReports] = useState([]);
  const [financialReports, setFinancialReports] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [productPerformance, setProductPerformance] = useState({
    topProducts: [],
    topCountries: []
  });

  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState({
    start: `${currentYear}-01-01`,
    end: `${currentYear}-12-31`,
  });

  const handleExportSales = () => {
    if (salesReports.length === 0) return alert('No sales data to export');
    const exportData = salesReports.map(r => ({
      Company: r.company,
      'Revenue (USD)': r.revenue,
      Orders: r.orders,
      Leads: r.leads,
      'Conversion Rate': `${r.conversion}%`,
      Growth: `${r.growth}%`
    }));
    exportToCSV(exportData, 'sales_performance_report');
  };

  const handleExportProducts = () => {
    if (productPerformance.topProducts.length === 0) return alert('No product data to export');
    const exportData = productPerformance.topProducts.map(p => ({
      Product: p.name,
      Orders: p.orders,
      Revenue: p.revenue
    }));
    exportToCSV(exportData, 'product_performance_report');
  };

  const handleExportAll = () => {
    // Basic implementation: Export current active view
    if (activeReport === 'sales') handleExportSales();
    else if (activeReport === 'products') handleExportProducts();
    else alert('Export not available for this view. Switch to Sales or Products.');
  };

  const handleAdvancedReportExport = async (report) => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/advanced/download/${report.id}`);
      const data = res.data?.data;
      if (!data || data.length === 0) {
        alert(`No data available for ${report.title}`);
        return;
      }
      exportToCSV(data, `${report.id}_report_${new Date().toISOString().split('T')[0]}`);
    } catch (err) {
      console.error(`Error exporting ${report.title}:`, err);
      alert(`Failed to export ${report.title}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        dateFrom: dateRange.start,
        dateTo: dateRange.end
      };

      const [salesRes, operationalRes, financialRes, productsRes, statsRes] = await Promise.all([
        api.get('/reports/sales', { params }),
        api.get('/reports/operational', { params }),
        api.get('/reports/financial', { params }),
        api.get('/reports/products', { params }),
        api.get('/dashboard/stats')
      ]);

      setSalesReports(salesRes.data?.data || []);
      setOperationalReports(operationalRes.data?.data || []);
      setFinancialReports(financialRes.data?.data || []);
      setProductPerformance(productsRes.data?.data || { topProducts: [], topCountries: [] });
      setDashboardStats(statsRes.data?.data || null);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.response?.data?.message || 'Failed to fetch reports.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    fetchAllReports();
  }, [dateRange]);

  const getStatusBadge = (status) => {
    const variants = {
      success: 'success',
      warning: 'warning',
      danger: 'danger',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <>
      <Card className="border-0 shadow-sm overflow-hidden mb-4 bg-primary text-white" style={{ borderRadius: '16px' }}>
        <Card.Body className="p-4">
          <Row className="align-items-center flex-nowrap">
            <Col className="overflow-hidden me-2">
              <h2 className="mb-1 fw-bold text-white text-nowrap">Business Intelligence</h2>
              <p className="text-white text-opacity-75 mb-0 text-nowrap d-none d-sm-block">Real-time performance metrics and visual analytics</p>
            </Col>
            <Col xs="auto" className="flex-shrink-0 d-flex gap-2">
              <Button variant="light" className="text-primary fw-bold shadow-sm d-flex align-items-center" onClick={handlePrint}>
                <Award size={18} className="me-2" /> 
                <span className="d-none d-md-inline small">Print</span>
              </Button>
              <Button variant="light" className="text-primary fw-bold shadow-sm d-flex align-items-center" onClick={handleExportAll}>
                <Download size={18} className="me-2" /> 
                <span className="d-none d-md-inline small">Export All</span>
                <span className="d-md-none small">Export</span>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="mb-4 d-flex align-items-center">
          <AlertCircle size={20} className="me-2" />
          <div>
            <strong>Error:</strong> {error}
            <Button variant="link" className="p-0 ms-2 text-danger text-decoration-none fw-bold" onClick={fetchAllReports}>
              Try Again
            </Button>
          </div>
        </Alert>
      )}

      <div className="report-nav-premium mb-4 bg-white p-2 rounded-3 shadow-sm d-flex gap-2">
        <button
          className={`report-nav-btn ${activeReport === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveReport('analytics')}
        >
          <TrendingUp size={18} />
          <span>Visual Insights</span>
        </button>
        <button
          className={`report-nav-btn ${activeReport === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveReport('sales')}
        >
          <DollarSign size={18} />
          <span>Sales Performance</span>
        </button>
        <button
          className={`report-nav-btn ${activeReport === 'products' ? 'active' : ''}`}
          onClick={() => setActiveReport('products')}
        >
          <Award size={18} />
          <span>Product Performance</span>
        </button>
        <button
          className={`report-nav-btn ${activeReport === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveReport('advanced')}
        >
          <FileText size={18} />
          <span>Advanced Reports</span>
        </button>
      </div>

      {activeReport === 'analytics' && (
        <SalesAnalytics 
          stats={dashboardStats} 
          financialData={financialReports} 
          productData={productPerformance} 
        />
      )}
      
      {!loading && activeReport === 'sales' && (
        <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
          <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-between p-3 border-0">
            <h5 className="mb-0 fw-bold">Sales Performance Report ({salesReports.length})</h5>
            <Button variant="outline-light" size="sm" className="fw-bold d-flex align-items-center" onClick={handleExportSales}>
              <Download size={16} className="me-1" />
              <span className="d-none d-sm-inline small">Export CSV</span>
              <span className="d-sm-none small">Export</span>
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {/* Desktop View */}
            <div className="table-responsive d-none d-lg-block">
              <Table hover className="mb-0 align-middle">
                <thead>
                  <tr className="table-light text-muted small text-uppercase">
                    <th className="ps-4">Company</th>
                    <th>Revenue (USD)</th>
                    <th>Orders</th>
                    <th>Leads</th>
                    <th>Conv. Rate</th>
                    <th>Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReports.length > 0 ? (
                    salesReports.map((report, index) => (
                      <tr key={index}>
                        <td className="ps-4 fw-bold text-primary">{report.company}</td>
                        <td className="fw-medium">{formatCurrency(report.revenue)}</td>
                        <td>{report.orders}</td>
                        <td>{report.leads}</td>
                        <td>
                          <Badge bg={report.conversion > 50 ? 'success' : 'warning'} className="px-3 py-2 rounded-pill">
                            {report.conversion}%
                          </Badge>
                        </td>
                        <td>
                          <div className={`d-flex align-items-center fw-bold text-${report.growth > 0 ? 'success' : 'danger'}`}>
                            {report.growth > 0 ? <TrendingUp size={14} className="me-1" /> : null}
                            {report.growth > 0 ? '+' : ''}{report.growth}%
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">No sales data found</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="d-lg-none bg-light-subtle p-3">
              <Row className="g-3">
                {salesReports.map((report, index) => (
                  <Col xs={12} md={6} key={index}>
                    <Card className="border-0 shadow-sm report-mobile-card">
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h6 className="fw-bold mb-0 text-dark">{report.company}</h6>
                            <div className="text-primary fw-bold small mt-1">{formatCurrency(report.revenue)}</div>
                          </div>
                          <Badge bg={report.growth > 0 ? 'success' : 'danger'} className="rounded-pill">
                            {report.growth > 0 ? '+' : ''}{report.growth}%
                          </Badge>
                        </div>
                        <Row className="g-2 text-center border-top pt-2">
                          <Col xs={4}>
                            <div className="text-muted extra-small">Orders</div>
                            <div className="fw-bold small">{report.orders}</div>
                          </Col>
                          <Col xs={4}>
                            <div className="text-muted extra-small">Leads</div>
                            <div className="fw-bold small">{report.leads}</div>
                          </Col>
                          <Col xs={4}>
                            <div className="text-muted extra-small">Conv.</div>
                            <div className="fw-bold small">{report.conversion}%</div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </Card.Body>
        </Card>
      )}

      {!loading && activeReport === 'products' && (
        <Row className="g-4">
          <Col lg={6}>
            <Card className="border-0 shadow-sm overflow-hidden h-100" style={{ borderRadius: '16px' }}>
              <Card.Header className="bg-primary text-white p-3 border-0">
                <h5 className="mb-0 fw-bold">Top Products</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive d-none d-lg-block">
                  <Table hover className="mb-0 align-middle">
                    <thead>
                      <tr className="table-light text-muted small text-uppercase">
                        <th className="ps-4">Product</th>
                        <th>Orders</th>
                        <th className="pe-4 text-end">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPerformance.topProducts.map((p, i) => (
                        <tr key={i}>
                          <td className="ps-4 fw-medium">{p.name}</td>
                          <td>{p.orders}</td>
                          <td className="pe-4 text-end fw-bold text-primary">{formatCurrency(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                {/* Mobile View Products */}
                <div className="d-lg-none bg-light-subtle p-3">
                  <Row className="g-3">
                    {productPerformance.topProducts.map((p, i) => (
                      <Col xs={12} key={i}>
                        <Card className="border-0 shadow-sm report-mobile-card">
                          <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="fw-bold mb-0">{p.name}</h6>
                              <div className="text-muted small">{p.orders} Orders</div>
                            </div>
                            <div className="text-primary fw-bold">{formatCurrency(p.revenue)}</div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={6}>
            <Card className="border-0 shadow-sm overflow-hidden h-100" style={{ borderRadius: '16px' }}>
              <Card.Header className="bg-primary text-white p-3 border-0">
                <h5 className="mb-0 fw-bold">Top Countries</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive d-none d-lg-block">
                  <Table hover className="mb-0 align-middle">
                    <thead>
                      <tr className="table-light text-muted small text-uppercase">
                        <th className="ps-4">Country</th>
                        <th>Orders</th>
                        <th className="pe-4 text-end">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPerformance.topCountries.map((c, i) => (
                        <tr key={i}>
                          <td className="ps-4 fw-medium">{c.country}</td>
                          <td>{c.orders}</td>
                          <td className="pe-4 text-end fw-bold text-primary">{formatCurrency(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                {/* Mobile View Countries */}
                <div className="d-lg-none bg-light-subtle p-3">
                  <Row className="g-3">
                    {productPerformance.topCountries.map((c, i) => (
                      <Col xs={12} key={i}>
                        <Card className="border-0 shadow-sm report-mobile-card">
                          <Card.Body className="p-3 d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="fw-bold mb-0">{c.country}</h6>
                              <div className="text-muted small">{c.orders} Orders</div>
                            </div>
                            <div className="text-primary fw-bold">{formatCurrency(c.revenue)}</div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {!loading && activeReport === 'advanced' && (
        <Row className="g-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
              <Card.Header className="bg-primary text-white p-3 border-0 d-flex align-items-center">
                <FileText size={20} className="me-2" />
                <h5 className="mb-0 fw-bold">Advanced Reports Library</h5>
              </Card.Header>
              <Card.Body className="p-4 bg-light-subtle">
                <Row className="g-4">
                  {[
                    { id: 'customer_sales', title: 'Customer Wise Sales', desc: 'Breakdown of revenue and orders by each customer', icon: <Users size={24} className="text-primary" /> },
                    { id: 'country_sales', title: 'Country Wise Sales', desc: 'Geographical distribution of sales and shipments', icon: <Globe size={24} className="text-success" /> },
                    { id: 'product_sales', title: 'Product Wise Sales', desc: 'Performance metrics for individual products', icon: <Package size={24} className="text-warning" /> },
                    { id: 'salesperson', title: 'Sales Person Wise Sales', desc: 'Revenue generated per sales representative', icon: <UserCheck size={24} className="text-info" /> },
                    { id: 'container_utilization', title: 'Container Utilization', desc: 'Metrics on container packing efficiency and CBM', icon: <Box size={24} className="text-secondary" /> },
                    { id: 'outstanding_aging', title: 'Outstanding Aging', desc: 'Aging analysis of pending customer payments', icon: <Clock size={24} className="text-danger" /> },
                    { id: 'monthly_revenue', title: 'Monthly Revenue', desc: 'Detailed month-over-month revenue comparison', icon: <BarChart size={24} className="text-primary" /> },
                    { id: 'yearly_revenue', title: 'Yearly Revenue', desc: 'Annual revenue trends and year-over-year growth', icon: <PieChart size={24} className="text-success" /> },
                  ].map(report => (
                    <Col lg={3} md={4} sm={6} key={report.id}>
                      <Card className="h-100 border-0 shadow-sm advanced-report-card">
                        <Card.Body className="d-flex flex-column text-center p-4">
                          <div className="report-icon-wrapper mx-auto mb-3">
                            {report.icon}
                          </div>
                          <h6 className="fw-bold mb-2 text-dark">{report.title}</h6>
                          <p className="text-muted small mb-4 flex-grow-1">{report.desc}</p>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="w-100 fw-bold rounded-pill"
                            onClick={() => handleAdvancedReportExport(report)}
                            disabled={loading}
                          >
                            {loading ? <Spinner size="sm" className="me-2" /> : <Download size={14} className="me-2" />}
                            Export CSV
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Loading report data...</p>
        </div>
      )}
      <style>{`
        .report-nav-premium {
          border: 1px solid #e2e8f0;
          overflow-x: auto;
        }
        .report-nav-btn {
          border: none;
          background: transparent;
          padding: 10px 20px;
          border-radius: 8px;
          color: #64748b;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .report-nav-btn.active {
          background-color: #0d6efd;
          color: white;
          box-shadow: 0 4px 6px -1px rgba(13, 110, 253, 0.2);
        }
        .report-nav-btn:hover:not(.active) {
          background-color: #f1f5f9;
          color: #1e293b;
        }
        .report-mobile-card {
          border-radius: 12px;
          transition: transform 0.2s ease;
        }
        .bg-light-subtle {
          background-color: #f8f9fa;
        }
        .extra-small {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .advanced-report-card {
          border-radius: 12px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          background: white;
        }
        .advanced-report-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important;
        }
        .report-icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </>
  );
}

export default ReportsAnalytics;
