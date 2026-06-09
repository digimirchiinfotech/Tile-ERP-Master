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

import React, { useMemo } from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, ShoppingCart, Users, Globe } from 'lucide-react';
import './SalesAnalytics.css';

const data = [
  { name: 'Jan', sales: 4000, orders: 2400, leads: 400 },
  { name: 'Feb', sales: 3000, orders: 1398, leads: 300 },
  { name: 'Mar', sales: 2000, orders: 9800, leads: 200 },
  { name: 'Apr', sales: 2780, orders: 3908, leads: 278 },
  { name: 'May', sales: 1890, orders: 4800, leads: 189 },
  { name: 'Jun', sales: 2390, orders: 3800, leads: 239 },
];

const countryData = [
  { name: 'USA', value: 400 },
  { name: 'Germany', value: 300 },
  { name: 'UAE', value: 300 },
  { name: 'Australia', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SalesAnalytics = ({ stats, financialData = [], productData = { topProducts: [], topCountries: [] } }) => {
  // Memoize data transformations to prevent expensive re-calculations on every render
  const growthData = useMemo(() => {
    return Array.isArray(financialData) 
      ? [...financialData].reverse().map(item => ({
          name: (item.month || 'Jan').split(' ')[0], 
          sales: parseFloat(item.netRevenue || 0),
          orders: parseInt(item.transactions || 0)
        }))
      : [];
  }, [financialData]);

  const countryChartData = useMemo(() => {
    return (productData?.topCountries || []).map(item => ({
      name: item.country || 'Unknown',
      value: parseInt(item.orders || 0)
    }));
  }, [productData]);

  // Helper to format currency
  const formatValue = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const totalRevenue = stats?.totalRevenue || stats?.revenue || 0;
  const totalOrders = stats?.totalInvoices || stats?.invoices || stats?.orders || 0;
  const totalLeads = stats?.leads || 0;
  const countryCount = productData.topCountries.length || stats?.totalCountries || 0;

  return (
    <div className="analytics-container">
      {/* Unified Stats Row */}
      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <TrendingUp size={18} className="text-primary" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Sales</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{formatValue(totalRevenue)}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <ShoppingCart size={18} className="text-success" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Orders</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{totalOrders.toLocaleString()}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Users size={18} className="text-info" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>New Leads</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{totalLeads.toLocaleString()}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Globe size={18} className="text-warning" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Countries</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{countryCount}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="g-3">
        {/* Growth Overview Chart */}
        <Col lg={8}>
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '16px' }}>
            <Card.Body>
              <Card.Title className="fw-bold mb-3">Growth Overview</Card.Title>
              <div className="chart-container" style={{ height: 350, minWidth: 0 }}>
                {growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value} />
                      <Area type="monotone" dataKey="sales" name="Revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorSales)" />
                      <Area type="monotone" dataKey="orders" name="Orders" stroke="#82ca9d" fillOpacity={0.3} fill="#82ca9d" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                    No historical data available for selected range
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Market Share Chart */}
        <Col lg={4}>
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '16px' }}>
            <Card.Body className="d-flex flex-column">
              <Card.Title className="fw-bold mb-3">Market Share (by Destination)</Card.Title>
              
              {/* Pie Chart */}
              <div className="chart-container" style={{ height: 250, marginBottom: '20px', minWidth: 0 }}>
                {countryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <PieChart>
                      <Pie
                        data={countryChartData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {countryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                    No country data available
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="legend-container mt-auto">
                {countryChartData.map((item, idx) => (
                  <div key={idx} className="legend-item">
                    <div className="legend-color-dot" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="legend-label">{item.name}</span>
                    <span className="legend-value">{item.value}</span>
                  </div>
                ))}
              </div>

            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style>{`
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
        .extra-small {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stats-row-container::-webkit-scrollbar {
          height: 4px;
        }
        .stats-row-container::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.85rem;
        }
        .legend-color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .legend-label { flex: 1; color: #64748b; }
        .legend-value { font-weight: 700; color: #1e293b; }
      `}</style>
    </div>
  );
};

export default SalesAnalytics;
