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
import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Table, Badge, Form, InputGroup, Tabs, Tab } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import {
  Building,
  IndianRupee,
  TrendingUp,
  CheckCircle,
  Clock,
  Eye,
  Calendar,
  Users,
  RefreshCcw,
  Bell,
  AlertTriangle,
  Settings,
  Activity,
  HelpCircle,
  BarChart2,
  PieChart as PieChartIcon,
  Download,
  Filter,
  Search,
  TrendingDown,
  FileCheck} from 'lucide-react';
import {
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { exportCompanies } from '../../utils/exportUtils';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { useCompanies } from '../../hooks/useCompanies';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { formatDisplayDate } from '../../utils/formatters.js';

function SuperAdminDashboard({ currentUser, onNavigate }) {
  const [dateFilter, setDateFilter] = useState('This Month');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('revenue');
  
  const [revenueData, setRevenueData] = useState([]);
  const [subscriptionDistribution, setSubscriptionDistribution] = useState([]);
  const [companyGrowthData, setCompanyGrowthData] = useState([]);
  
  const { companies, loading: companiesLoading } = useCompanies();
  const { fetchAnalytics } = useSubscriptions();
  const { stats: ticketStats } = useSupportTickets();
  
  const [systemStats, setSystemStats] = useState({
    totalCompanies: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    totalRevenue: 0,
    renewalRate: 0,
    upcomingExpirations: 0,
    pendingRenewals: 0,
    mrr: 0,
    arr: 0,
    churnRate: 0,
    totalUsers: 0,
    systemVersion: 'v2.0.1',
    openTickets: 0,
    resolvedTickets: 0,
    totalTickets: 0,
    failedPayments: 0,
    trialsExpiringSoon: 0,
  });

  useEffect(() => {
    if (ticketStats && ticketStats.total !== undefined) {
      setSystemStats(prev => ({
        ...prev,
        openTickets: (ticketStats.open || 0) + (ticketStats.inProgress || 0),
        resolvedTickets: (ticketStats.resolved || 0) + (ticketStats.closed || 0),
        totalTickets: ticketStats.total || 0
      }));
    }
  }, [ticketStats]);

  useEffect(() => {
    if (companies.length > 0) {
      const activeCompanies = companies.filter(c => c.status === 'Active' || c.subscriptionPlan).length;
      const expiredCompanies = companies.filter(c => c.status === 'Expired').length;
      const expiringSoon = companies.filter(c => c.status === 'Expiring Soon').length;
      const trialsExpiring = companies.filter(c => c.subscriptionPlan === 'Free Trial' && c.status === 'Expiring Soon').length;
      setSystemStats(prev => ({
        ...prev,
        totalCompanies: companies.length,
        activeSubscriptions: activeCompanies,
        expiredSubscriptions: expiredCompanies,
        renewalRate: companies.length > 0 ? Math.round((activeCompanies / companies.length) * 100) : 0,
        churnRate: companies.length > 0 ? Math.round((expiredCompanies / companies.length) * 100) : 0,
        pendingRenewals: expiringSoon,
        trialsExpiringSoon: trialsExpiring,
        failedPayments: 0,
        totalUsers: companies.reduce((sum, c) => sum + (parseInt(c.totalUsers) || 0), 0)
      }));
    }
  }, [companies]);

  useEffect(() => {
    fetchAnalytics().then(analytics => {
      if (analytics && analytics.financials) {
        setSystemStats(prev => ({
          ...prev,
          totalRevenue: analytics.financials.mrr || 0,
          mrr: analytics.financials.mrr || 0,
          arr: analytics.financials.arr || 0
        }));
      }
      
      if (analytics && analytics.monthly_revenue_trend) {
        // Map backend trend to chart format, reversing to show chronological order
        const trend = analytics.monthly_revenue_trend.map(item => {
          const date = new Date(item.month);
          return {
            month: date.toLocaleString('default', { month: 'short' }),
            revenue: parseFloat(item.revenue) || 0,
            companies: parseInt(item.new_subscriptions) || 0
          };
        }).reverse();
        setRevenueData(trend);
        setCompanyGrowthData(trend);
      }

      if (analytics && analytics.revenue_by_plan) {
        const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6610f2'];
        const dist = analytics.revenue_by_plan.map((item, idx) => ({
          name: item.plan_name,
          value: parseInt(item.subscription_count) || 0,
          color: colors[idx % colors.length]
        }));
        setSubscriptionDistribution(dist);
      }
    }).catch(console.error);
  }, []);

  const arpu = systemStats.totalCompanies > 0 ? systemStats.totalRevenue / systemStats.totalCompanies : 0;

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Active': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', icon: '🟢' },
      'Expiring Soon': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', icon: '🟡' },
      'Expired': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', icon: '🔴' },
    };
    const config = statusConfig[status] || { color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.2)', icon: '⚪' };
    return (
      <div 
        className="d-inline-flex align-items-center px-2 py-1 rounded fw-bold" 
        style={{ 
          color: config.color,
          background: config.bg,
          border: `1px solid ${config.border}`,
          fontSize: '0.75rem',
          letterSpacing: '0.3px'
        }}
      >
        <span className="me-1" style={{ fontSize: '0.6rem' }}>{config.icon}</span>
        {status}
      </div>
    );
  };

  const filteredCompanies = useMemo(() => (companies || []).filter((company) => {
    if (!company) return false;
    const matchesSearch = (company.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || company.status === statusFilter;
    const matchesPlan = planFilter === 'All' || company.subscriptionPlan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  }), [companies, searchTerm, statusFilter, planFilter]);

  const handleExport = () => {
    const result = exportCompanies(filteredCompanies);
    if (result.success) {
      alert('Companies exported successfully!');
    } else {
      alert('Export failed: ' + result.message);
    }
  };

  return (
    <>
      {/* Premium Dashboard Header */}
      <div className="dashboard-header-premium mb-4">
        <Row className="align-items-center g-3">
          <Col md={12} lg={8}>
            <div className="d-flex align-items-center mb-1">
              <Badge bg="white" text="primary" className="me-2 px-2 py-1 rounded-pill extra-small fw-800" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9) !important' }}>
                SUPER ADMIN
              </Badge>
              <div className="text-white-50 extra-small fw-bold text-uppercase" style={{ letterSpacing: '1px', opacity: 0.8 }}>System Overview</div>
            </div>
            <h2 className="fw-800 text-white mb-1">Super Admin Dashboard</h2>
            <p className="text-white-50 small mb-0" style={{ opacity: 0.9 }}>
              Comprehensive overview of ERP system performance, subscriptions and global health.
            </p>
          </Col>
          <Col md={12} lg={4} className="text-lg-end">
            <div className="d-inline-flex align-items-center p-2 bg-white rounded-3 shadow-sm border">
              <div className="me-3 ps-2 border-start-0">
                <div className="text-muted extra-small fw-bold text-uppercase mb-0" style={{ fontSize: '0.6rem' }}>Date Filter:</div>
                <Form.Select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border-0 p-0 fw-bold text-primary bg-transparent shadow-none"
                  style={{ width: 'auto', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  <option>Today</option>
                  <option>This Week</option>
                  <option>This Month</option>
                  <option>Custom Range</option>
                </Form.Select>
              </div>
              <div className="bg-primary-light p-2 rounded-2 text-primary ms-2">
                <Calendar size={18} />
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Unified Stats Row */}
      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        {[
          { icon: Building, label: 'Total Companies', value: systemStats.totalCompanies, color: 'primary', suffix: '' },
          { icon: CheckCircle, label: 'Active Subs', value: systemStats.activeSubscriptions, color: 'success', suffix: '' },
          { icon: AlertTriangle, label: 'Expired', value: systemStats.expiredSubscriptions, color: 'danger', suffix: '' },
          { icon: IndianRupee, label: 'MRR', value: systemStats.mrr.toLocaleString('en-IN'), color: 'success', prefix: '₹' },
          { icon: TrendingUp, label: 'ARR', value: systemStats.arr.toLocaleString('en-IN'), color: 'info', prefix: '₹' },
          { icon: Clock, label: 'Renewals Due', value: systemStats.pendingRenewals, color: 'warning', suffix: '' },
          { icon: Users, label: 'ARPU', value: arpu.toFixed(2), color: 'info', prefix: '₹' },
          { icon: HelpCircle, label: 'Open Tickets', value: systemStats.openTickets, color: 'danger', suffix: '' }
        ].map((stat, idx) => (
          <Col key={idx} className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
            <Card className="text-center h-100 shadow-sm border-0 stats-card hover-lift">
              <Card.Body className="p-2 d-flex flex-column align-items-center justify-content-center">
                <div className={`icon-box bg-${stat.color}-light mb-1 mx-auto`} style={{ width: '32px', height: '32px' }}>
                  <stat.icon size={16} className={`text-${stat.color}`} />
                </div>
                <h5 className={`fw-bold mb-0 text-${stat.color}`}>{stat.prefix || ''}{stat.value}{stat.suffix || ''}</h5>
                <p className="text-muted extra-small mb-0 text-nowrap">{stat.label}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>



      {/* Notifications & Alerts Section */}
      <Row className="mb-4">
        <Col>
          <div className="premium-alerts-container">
            <div className="d-flex align-items-center mb-3">
              <div className="premium-icon-box me-3">
                <Bell size={20} className="text-primary" />
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-dark">Notifications & Alerts</h5>
                <p className="text-muted small mb-0">Stay updated with critical system events and required actions</p>
              </div>
            </div>
            
            <Row className="g-3">
              <Col lg={3} md={6}>
                <Card className="alert-card warning border-0 h-100">
                  <Card.Body className="p-0 h-100 d-flex flex-column">
                    <div className="alert-card-content">
                      <div className="alert-icon">
                        <Clock size={22} />
                      </div>
                      <div className="alert-details">
                        <span className="alert-label">Upcoming Renewals</span>
                        <div className="alert-value">
                          <span className="count">{systemStats.pendingRenewals}</span>
                          <span className="unit">Companies</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto alert-footer">
                      <span>Action Required</span>
                      <TrendingUp size={14} />
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3} md={6}>
                <Card className="alert-card danger border-0 h-100">
                  <Card.Body className="p-0 h-100 d-flex flex-column">
                    <div className="alert-card-content">
                      <div className="alert-icon">
                        <IndianRupee size={22} />
                      </div>
                      <div className="alert-details">
                        <span className="alert-label">Failed Payments</span>
                        <div className="alert-value">
                          <span className="count">{systemStats.failedPayments}</span>
                          <span className="unit">Failed</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto alert-footer">
                      <span>Immediate Attention</span>
                      <AlertTriangle size={14} />
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3} md={6}>
                <Card className="alert-card info border-0 h-100">
                  <Card.Body className="p-0 h-100 d-flex flex-column">
                    <div className="alert-card-content">
                      <div className="alert-icon">
                        <Activity size={22} />
                      </div>
                      <div className="alert-details">
                        <span className="alert-label">Trial Expiry</span>
                        <div className="alert-value">
                          <span className="count">{systemStats.trialsExpiringSoon}</span>
                          <span className="unit">Expiring Soon</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto alert-footer">
                      <span>Conversion Opportunity</span>
                      <FileCheck size={14} />
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3} md={6}>
                <Card className="alert-card success border-0 h-100">
                  <Card.Body className="p-0 h-100 d-flex flex-column">
                    <div className="alert-card-content">
                      <div className="alert-icon">
                        <Download size={22} />
                      </div>
                      <div className="alert-details">
                        <span className="alert-label">System Reports</span>
                        <div className="alert-value">
                          <span className="count">Export</span>
                          <span className="unit">Data</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto alert-footer">
                      <span>Available for Download</span>
                      <CheckCircle size={14} />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>

      {/* Visual Analytics Section */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
            <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-start border-0 p-3">
              <h5 className="mb-0 fw-bold text-white">
                <BarChart2 size={20} className="me-2 text-white" />
                Analytics & Insights
              </h5>
            </Card.Header>
            <Card.Body>
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                <Tab eventKey="revenue" title="Revenue Trend">
                  <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0} debounce={100}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#0d6efd" 
                        strokeWidth={2}
                        name="Revenue (₹)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Tab>
                
                <Tab eventKey="subscription" title="Subscription Distribution">
                  <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0} debounce={100}>
                    <PieChart>
                      <Pie
                        data={subscriptionDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {subscriptionDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Tab>

                <Tab eventKey="growth" title="Company Growth">
                  <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0} debounce={100}>
                    <BarChart data={companyGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="companies" fill="#198754" name="New Companies" />
                    </BarChart>
                  </ResponsiveContainer>
                </Tab>

                <Tab eventKey="churn" title="Renewal vs Churn">
                  <Row className="text-center pt-4">
                    <Col md={6}>
                      <Card className="border-success">
                        <Card.Body>
                          <RefreshCcw size={48} className="text-success mb-3" />
                          <h2 className="text-success mb-2">{systemStats.renewalRate}%</h2>
                          <p className="dashboard-label mb-1">Renewal Rate</p>
                          <small className="text-success">
                            <TrendingUp size={14} className="me-1" />
                            Up from last month
                          </small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="border-danger">
                        <Card.Body>
                          <TrendingDown size={48} className="text-danger mb-3" />
                          <h2 className="text-danger mb-2">{systemStats.churnRate}%</h2>
                          <p className="dashboard-label mb-1">Churn Rate</p>
                          <small className="text-danger">
                            <TrendingDown size={14} className="me-1" />
                            Down from last month
                          </small>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Administrative Management Center */}
      <Row className="mb-4">
        <Col>
          <div className="management-center-container">
            <div className="d-flex align-items-center mb-4">
              <div className="management-icon-box me-3">
                <Settings size={20} className="text-primary" />
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-dark">Management Center</h5>
                <p className="text-muted small mb-0">Direct access to core system administrative modules</p>
              </div>
              <div className="ms-auto d-none d-md-block">
                 <Badge bg="success-light" text="success" className="px-3 py-2 rounded-pill fw-700">SYSTEM STATUS: ONLINE</Badge>
              </div>
            </div>

            <Row className="g-3">
              {[
                { id: 'dashboard', label: 'Company Analytics', icon: Activity, color: '#0dcaf0', bg: 'rgba(13, 202, 240, 0.08)', desc: 'Growth & usage metrics' },
                { id: 'user-management', label: 'User Control', icon: Users, color: '#0d6efd', bg: 'rgba(13, 110, 253, 0.08)', desc: 'Global user permissions' },
                { id: 'subscription-management', label: 'Plan Management', icon: IndianRupee, color: '#198754', bg: 'rgba(25, 135, 84, 0.08)', desc: 'Subscription & pricing' },
                { id: 'audit-logs', label: 'Audit Logs', icon: FileCheck, color: '#ffc107', bg: 'rgba(255, 193, 7, 0.08)', desc: 'Security & activity tracking' },
                { id: 'master-data-management', label: 'Master Data', icon: PieChartIcon, color: '#6610f2', bg: 'rgba(102, 16, 242, 0.08)', desc: 'Global lookup tables' },
                { id: 'super-admin-tickets', label: 'Support Queue', icon: HelpCircle, color: '#dc3545', bg: 'rgba(220, 53, 69, 0.08)', desc: `${systemStats.openTickets} pending tickets`, badge: systemStats.openTickets > 0 ? 'DANGER' : null },
                { id: 'system-settings', label: 'System Config', icon: Settings, color: '#6c757d', bg: 'rgba(108, 117, 125, 0.08)', desc: 'Global ERP settings' },
                { id: 'consistency-check', label: 'Data Health', icon: RefreshCcw, color: '#20c997', bg: 'rgba(32, 201, 151, 0.08)', desc: 'Run integrity checks', nav: 'system-settings', navData: { activeTab: 'consistency' } }
              ].map((tool, idx) => (
                <Col key={idx} lg={3} md={6}>
                  <Card 
                    className="admin-premium-card h-100 border-0 shadow-sm hover-lift"
                    onClick={() => onNavigate && onNavigate(tool.nav || tool.id, tool.navData)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body className="p-3">
                      <div className="d-flex align-items-start gap-3">
                        <div className="tool-icon-wrapper" style={{ background: tool.bg, color: tool.color }}>
                          <tool.icon size={20} />
                        </div>
                        <div className="tool-info">
                          <div className="d-flex align-items-center mb-1">
                            <h6 className="fw-bold mb-0 text-dark small">{tool.label}</h6>
                            {tool.badge === 'DANGER' && <span className="ms-2 badge-dot bg-danger"></span>}
                          </div>
                          <p className="text-muted extra-small mb-0" style={{ textTransform: 'none', letterSpacing: '0' }}>{tool.desc}</p>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </Col>
      </Row>


      {/* Companies Table Section */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
            <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
              <h5 className="mb-0 fw-bold text-nowrap me-2">Company Management ({companies.length})</h5>
              <div className="d-flex gap-2 flex-nowrap align-items-center">
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={handleExport}
                  className="border-white text-white d-flex align-items-center flex-shrink-0"
                  style={{ width: 'auto' }}
                >
                  <Download size={14} className="me-1" />
                  <span className="d-none d-md-inline small">Export</span>
                </Button>
                <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={() => onNavigate('company-management')} style={{ width: 'auto' }}>
                  <Building size={16} className="me-1" /> 
                  <span className="d-none d-sm-inline small">View All</span>
                  <span className="d-sm-none small">View</span>
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {/* Filters and Search */}
              <Row className="mb-3">
                <Col md={4}>
                  <InputGroup>
                    <InputGroup.Text>
                      <Search size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Search company name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <InputGroup>
                    <InputGroup.Text>
                      <Filter size={16} />
                    </InputGroup.Text>
                    <Form.Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option>All</option>
                      <option>Active</option>
                      <option>Expiring Soon</option>
                      <option>Expired</option>
                    </Form.Select>
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <InputGroup>
                    <InputGroup.Text>
                      <PieChartIcon size={16} />
                    </InputGroup.Text>
                    <Form.Select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                    >
                      <option>All</option>
                      <option>Basic</option>
                      <option>Professional</option>
                      <option>Premium</option>
                      <option>Enterprise</option>
                    </Form.Select>
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Button
                    variant="outline"
                    className="w-100"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('All');
                      setPlanFilter('All');
                    }}
                  >
                    Clear Filters
                  </Button>
                </Col>
              </Row>

              {/* Table */}
              {/* Table (Desktop) */}
              <div className="table-responsive d-none d-lg-block">
                <Table hover className="mb-0 border-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 px-3 py-3 text-muted extra-small">SR. NO.</th>
                      <th className="border-0 px-3 py-3 text-muted extra-small">Company Name</th>
                      <th className="border-0 px-3 py-3 text-muted extra-small">Contact Person</th>
                      <th className="border-0 px-3 py-3 text-muted extra-small">Subscription Plan</th>
                      <th className="border-0 px-3 py-3 text-muted extra-small">Last Payment</th>
                      <th className="border-0 px-3 py-3 text-muted extra-small">Monthly Revenue</th>
                      <th className="border-0 px-3 py-3 text-muted extra-small">Renewal Date</th>
                      <th className="border-0 px-3 py-3 text-muted extra-small">Status</th>
                      <th className="border-0 px-3 py-3 text-muted extra-small text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companiesLoading ? (
                      <tr>
                        <td colSpan="9" className="text-center text-muted py-5">
                          <div className="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>
                          Loading companies...
                        </td>
                      </tr>
                    ) : filteredCompanies.length > 0 ? (
                      filteredCompanies.map((company, index) => (
                        <tr key={company.id} className="align-middle">
                          <td className="text-center text-muted small">{index + 1}</td>
                          <td>
                            <div className="fw-bold text-dark">{company.name}</div>
                            <small className="text-muted">ID: {company.id.substring(0, 8)}...</small>
                          </td>
                          <td>{company.contactPersonName || 'N/A'}</td>
                          <td>
                            <div 
                              className="d-inline-block px-2 py-1 rounded text-primary fw-bold" 
                              style={{ 
                                background: 'rgba(30, 64, 175, 0.1)', 
                                border: '1px solid rgba(30, 64, 175, 0.2)',
                                fontSize: '0.75rem',
                                letterSpacing: '0.3px'
                              }}
                            >
                              {company.subscriptionPlan || 'N/A'}
                            </div>
                          </td>
                          <td className="small text-muted">{company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}</td>
                          <td className="text-success fw-bold">
                            ₹{(parseFloat(company.monthlyRevenue) || 0).toLocaleString()}
                          </td>
                          <td className="small text-muted">{company.updatedAt ? new Date(company.updatedAt).toLocaleDateString() : 'N/A'}</td>
                          <td>{getStatusBadge(company.status || 'Inactive')}</td>
                          <td className="text-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="btn-action"
                              onClick={() => onNavigate && onNavigate('company-management')}
                            >
                              <Eye size={14} className="me-1" />
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center text-muted py-5">
                          <AlertTriangle size={32} className="text-warning mb-2" />
                          <p className="mb-0">No companies found matching the current filters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Cards (Mobile) */}
              <div className="d-block d-lg-none">
                {companiesLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-2" role="status"></div>
                    <p className="text-muted">Loading companies...</p>
                  </div>
                ) : filteredCompanies.length > 0 ? (
                  <Row className="g-3">
                    {filteredCompanies.map((company, index) => (
                      <Col key={company.id} xs={12}>
                        <Card className="company-mobile-card border-0 shadow-sm overflow-hidden">
                          <div className="card-accent-bar" style={{ background: company.status === 'Active' ? '#10b981' : company.status === 'Expiring Soon' ? '#f59e0b' : '#ef4444' }}></div>
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div>
                                <div className="text-muted extra-small fw-bold mb-1">#{index + 1}</div>
                                <h6 className="fw-bold mb-0 text-dark">{company.name}</h6>
                                <small className="text-muted">{company.contactPersonName || 'No Contact Person'}</small>
                              </div>
                              <div className="text-end">
                                {getStatusBadge(company.status || 'Inactive')}
                                <div className="mt-2 fw-bold text-success">
                                  ₹{(parseFloat(company.monthlyRevenue) || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <Row className="g-2 mb-3 bg-light rounded p-2 mx-0">
                              <Col xs={6}>
                                <div className="text-muted extra-small">PLAN</div>
                                <div className="fw-bold small text-primary d-inline-block px-2 py-0.5 rounded" style={{ background: 'rgba(30, 64, 175, 0.1)', border: '1px solid rgba(30, 64, 175, 0.15)' }}>
                                  {company.subscriptionPlan || 'N/A'}
                                </div>
                              </Col>
                              <Col xs={6} className="text-end">
                                <div className="text-muted extra-small">RENEWAL</div>
                                <div className="fw-bold small">{company.updatedAt ? new Date(company.updatedAt).toLocaleDateString() : 'N/A'}</div>
                              </Col>
                            </Row>

                            <Button 
                              variant="outline-primary" 
                              className="w-100 py-2 d-flex align-items-center justify-content-center"
                              onClick={() => onNavigate && onNavigate('company-management')}
                            >
                              <Eye size={16} className="me-2" />
                              View Company Details
                            </Button>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center py-5 bg-light rounded-3">
                    <AlertTriangle size={48} className="text-warning mb-3" />
                    <h5>No Results Found</h5>
                    <p className="text-muted">Try adjusting your search or filters.</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>


      <style>{`
        .management-center-container {
          background: #f8fafc;
          padding: 2rem;
          border-radius: 20px;
          border: 1px solid rgba(0, 0, 0, 0.03);
        }
        .management-icon-box {
          width: 48px;
          height: 48px;
          background: #fff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
        }
        .badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .bg-success-light { background: rgba(16, 185, 129, 0.1); }
        .fw-700 { font-weight: 700; }
        .tool-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .premium-alerts-container {
          background: #fff;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }
        .premium-icon-box {
          width: 44px;
          height: 44px;
          background: rgba(30, 64, 175, 0.08);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .alert-card {
          border-radius: 14px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: 1px solid transparent;
          background: #fff;
          height: 100%;
        }
        .alert-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .alert-card-content {
          padding: 1.25rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .alert-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .alert-details {
          flex: 1;
        }
        .alert-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          display: block;
          margin-bottom: 0.25rem;
        }
        .alert-value {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        .alert-value .count {
          font-size: 1.5rem;
          font-weight: 800;
        }
        .alert-value .unit {
          font-size: 0.875rem;
          font-weight: 500;
          color: #94a3b8;
        }
        .alert-footer {
          padding: 0.75rem 1.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(0, 0, 0, 0.03);
        }

        /* Card Variations */
        .alert-card.warning { border-color: rgba(245, 158, 11, 0.15); }
        .alert-card.warning .alert-icon { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .alert-card.warning .count { color: #d97706; }
        .alert-card.warning .alert-footer { background: rgba(245, 158, 11, 0.03); color: #b45309; }

        .alert-card.danger { border-color: rgba(239, 68, 68, 0.15); }
        .alert-card.danger .alert-icon { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .alert-card.danger .count { color: #dc2626; }
        .alert-card.danger .alert-footer { background: rgba(239, 68, 68, 0.03); color: #b91c1c; }

        .alert-card.info { border-color: rgba(59, 130, 246, 0.15); }
        .alert-card.info .alert-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .alert-card.info .count { color: #2563eb; }
        .alert-card.info .alert-footer { background: rgba(59, 130, 246, 0.03); color: #1d4ed8; }

        .alert-card.success { border-color: rgba(16, 185, 129, 0.15); }
        .alert-card.success .alert-icon { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .alert-card.success .count { color: #059669; }
        .alert-card.success .alert-footer { background: rgba(16, 185, 129, 0.03); color: #047857; }

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
        .company-mobile-card {
          border-radius: 12px;
          position: relative;
          background: #fff;
          transition: transform 0.2s ease;
        }
        .card-accent-bar {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
        }
        .btn-action {
          border-radius: 8px;
          font-weight: 600;
          padding: 0.4rem 1rem;
        }
        .stat-icon-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .fw-800 { font-weight: 800; }
        .fw-600 { font-weight: 600; }
      `}</style>
    </>
  );
}

export default SuperAdminDashboard;
