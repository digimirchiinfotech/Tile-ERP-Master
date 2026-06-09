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

import ActivityTimeline from './ActivityTimeline.jsx';
import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Badge, Table } from 'react-bootstrap';
import Button from './Button.jsx';
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, AlertCircle, CheckCircle, Clock, Eye, Calendar, BarChart3, ShoppingCart, Search, Package, Truck, Target, Activity, Send } from 'lucide-react';
import api from '../../services/api';
import { useUserContext } from '../../contexts/UserContext';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  LineChart, 
  Line, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

/**
 * Enhanced Role-Based Personalized Dashboard Component
 * Displays key insights with visual charts and KPIs for each role:
 * - Sales → Pending invoices, leads, PI status with trend charts
 * - Accounts → Pending payments, overdue invoices with financial charts
 * - QC → Pending inspections, failed checks with quality metrics
 * - Purchase → Pending POs, supplier deadlines with procurement analytics
 * - Admin → User activity, product catalogue alerts with system charts
 */
function RoleBasedDashboard({ currentUser, onNavigate }) {
  const { selectedCompanyId } = useUserContext();
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real dashboard data from API
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard/stats');
        const apiData = response.data?.data || response.data || {};
        
        // Use real API data with fallbacks to defaults
        const baseData = {
          totalInvoices: apiData.totalInvoices || apiData.invoices || 0,
          totalClients: apiData.totalClients || 0,
           totalRevenue: apiData.totalRevenue || apiData.revenue || 0,
          pendingInvoices: apiData.activeInvoices || apiData.invoices || 0,
          overdueInvoices: apiData.overdueInvoices || apiData.outstandingPayments || 0,
          activeLeads: apiData.activeLeads || apiData.leads || 0,
          pendingPayments: apiData.pendingPayments || apiData.outstandingPayments || 0,
          systemAlerts: apiData.systemAlerts || 0,

          pendingInspections: apiData.totalQCRecords || apiData.pendingQC || 0,
          failedChecks: apiData.failedQC || 0,
          pendingPOs: apiData.orders || 0,
          supplierDeadlines: apiData.suppliers || 0,
          userActivity: apiData.totalUsers || 0,
          catalogueAlerts: apiData.products || 0,
          openOrders: apiData.openOrders || 0,
          pendingQC: apiData.pendingQC || 0,
          shipmentsInProgress: apiData.shipmentsInProgress || 0,
          outstandingPayments: apiData.outstandingPayments || 0,
          pendingProformaInvoices: apiData.pendingProformaInvoices || 0,
          confirmedProformaInvoices: apiData.confirmedProformaInvoices || 0,
          pendingProformaOrders: apiData.pendingProformaOrders || 0,
          confirmedProformaOrders: apiData.confirmedProformaOrders || 0,
          readyProformaOrders: apiData.readyProformaOrders || 0,
          totalUsers: apiData.totalUsers || 0,
          exportInvoices: apiData.exportInvoices || 0,
          packingLists: apiData.packingLists || 0,
          vgms: apiData.vgms || 0,
          annexures: apiData.annexures || 0,
          shippingInstructions: apiData.shippingInstructions || 0,
          totalExports: apiData.totalExports || 0,
          totalProducts: apiData.totalProducts || 0,
          catalogues: apiData.catalogues || 0,
          categories: apiData.categories || 0,
          myOrders: apiData.myOrders || 0,
          myInvoices: apiData.myInvoices || 0,
          totalSpend: apiData.totalSpend || 0,
          charts: apiData.charts || null,
          recentActivities: apiData.recentActivities || null
        };
        
        setDashboardData(generateDashboardData(baseData));
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        // Use default fallback data if API fails
        setDashboardData(generateDashboardData());
      } finally {
        setLoading(false);
      }
    };

    const generateDashboardData = (overrideData = null) => {
      const baseData = overrideData || {
        totalInvoices: 0,
        totalClients: 0,
        totalRevenue: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        activeLeads: 0,
        pendingPayments: 0,
        systemAlerts: 0,
        pendingInspections: 0,
        failedChecks: 0,
        pendingPOs: 0,
        supplierDeadlines: 0,
        userActivity: 0,
        catalogueAlerts: 0,
        openOrders: 0,
        pendingQC: 0,
        shipmentsInProgress: 0,
        outstandingPayments: 0,
        pendingProformaInvoices: 0,
        confirmedProformaInvoices: 0,
        pendingProformaOrders: 0,
        confirmedProformaOrders: 0,
        readyProformaOrders: 0,
        totalUsers: 0,
        charts: null,
        recentActivities: null
      };

      // Chart data generators
      const generateTrendData = () => baseData.charts?.userActivity || [
        { name: 'Jan', value: 0 }, { name: 'Feb', value: 0 },
        { name: 'Mar', value: 0 }, { name: 'Apr', value: 0 },
        { name: 'May', value: 0 }, { name: 'Jun', value: 0 }
      ];

      const generatePieData = (data) => {
        return Object.entries(data).map(([name, value], index) => ({
          name, value, color: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#16a34a', '#f97316'][index % 7]
        }));
      };

      const generateBarData = () => baseData.charts?.monthlyGrowth || [
        { name: 'Last Month', value: 0 }, { name: 'Current Month', value: 0 }
      ];

      const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
      };

      const activities = baseData.recentActivities?.map(a => ({
        ...a,
        time: timeAgo(a.time)
      })) || [
        { action: 'Profile updated', client: 'Personal', time: '1 hour ago', status: 'success' },
        { action: 'Invoice viewed', client: 'Client Portal', time: '3 hours ago', status: 'info' },
        { action: 'Password changed', client: 'Security', time: '1 day ago', status: 'success' },
      ];

      switch (currentUser?.role) {
        case 'sales_manager':
          return {
            ...baseData,
            keyMetrics: [
              { label: 'Active Leads', value: baseData.activeLeads, trend: '', color: 'success', icon: Users },
              { label: 'Pending Invoices', value: baseData.pendingInvoices, trend: '', color: 'warning', icon: FileText },
              { label: 'PI Status (Approved)', value: '85%', trend: '', color: 'success', icon: CheckCircle },
              { label: 'This Month Revenue', value: `$${baseData.totalRevenue.toLocaleString()}`, trend: baseData.charts?.growthPercent || '', color: 'success', icon: DollarSign },
            ],
            charts: {
              leadsTrend: generateTrendData(),
              invoiceStatus: generatePieData({ Pending: 0, Approved: 0, Rejected: 0 }),
              monthlyPerformance: generateBarData()
            },
            quickActions: [
              { label: 'Create Invoice', action: 'invoice-form', color: 'primary' },
              { label: 'Create Lead', action: 'lead-form', color: 'success' },
              { label: 'View Reports', action: 'reports-analytics', color: 'info' },
            ],
            recentActivities: activities,
          };
        
        case 'sales_executive':
          return {
            ...baseData,
            keyMetrics: [
              { label: 'My Leads', value: baseData.activeLeads, trend: '', color: 'success', icon: Users },
              { label: 'Open Orders', value: baseData.openOrders, trend: '', color: 'info', icon: ShoppingCart },
              { label: 'Client Base', value: baseData.totalClients, trend: '', color: 'primary', icon: Users },
              { label: 'Tasks', value: '5', trend: '', color: 'warning', icon: CheckCircle },
            ],
            charts: {
              leadsTrend: generateTrendData(),
              orderStatus: generatePieData({ Pending: 0, Processing: 0, Completed: 0 }),
              dailyActivity: generateBarData()
            },
            quickActions: [
              { label: 'Create Lead', action: 'lead-form', color: 'success' },
              { label: 'Create Order', action: 'order-form', color: 'primary' },
              { label: 'View Clients', action: 'client-management', color: 'info' },
            ],
            recentActivities: activities,
          };
        
        case 'account':
          return {
            ...baseData,
            keyMetrics: [
              { label: 'Pending Payments', value: baseData.pendingPayments, trend: '', color: 'warning', icon: Clock },
              { label: 'Overdue Invoices', value: baseData.overdueInvoices, trend: '', color: 'danger', icon: AlertCircle },
              { label: 'Total Revenue', value: `$${baseData.totalRevenue.toLocaleString()}`, trend: baseData.charts?.growthPercent || '', color: 'success', icon: DollarSign },
              { label: 'Payment Rate', value: '94%', trend: '', color: 'success', icon: CheckCircle },
            ],
            charts: {
              paymentTrend: generateTrendData(),
              invoiceStatus: generatePieData({ Paid: 0, Pending: 0, Overdue: 0 }),
              monthlyRevenue: generateBarData()
            },
            quickActions: [
              { label: 'Process Payment', action: 'account-form', color: 'success' },
              { label: 'Send Reminder', action: 'notifications', color: 'warning' },
              { label: 'Financial Report', action: 'reports-analytics', color: 'info' },
            ],
            recentActivities: activities,
          };

        case 'qc':
          return {
            ...baseData,
            keyMetrics: [
              { label: 'Pending Inspections', value: baseData.pendingInspections, trend: '', color: 'warning', icon: Search },
              { label: 'Failed Checks', value: baseData.failedChecks, trend: '', color: 'danger', icon: AlertCircle },
              { label: 'Quality Score', value: '96.8%', trend: '', color: 'success', icon: CheckCircle },
              { label: 'Completed Today', value: '12', trend: '', color: 'success', icon: Activity },
            ],
            charts: {
              qualityTrend: generateTrendData(),
              inspectionStatus: generatePieData({ Passed: 0, Failed: 0, Pending: 0 }),
              defectTypes: generateBarData()
            },
            quickActions: [
              { label: 'Start Inspection', action: 'qc-management', color: 'primary' },
              { label: 'View Records', action: 'qc-management', color: 'info' },
              { label: 'QC Dashboard', action: 'qc-management', color: 'success' },
            ],
            recentActivities: activities,
          };

        case 'purchase':
          return {
            ...baseData,
            keyMetrics: [
              { label: 'Pending POs', value: baseData.pendingPOs, trend: '', color: 'warning', icon: ShoppingCart },
              { label: 'Supplier Deadlines', value: baseData.supplierDeadlines, trend: '', color: 'danger', icon: Clock },
              { label: 'Create Pallet', value: '$45K', trend: '', color: 'success', icon: DollarSign },
              { label: 'On-Time Delivery', value: '92%', trend: '', color: 'success', icon: Truck },
            ],
            charts: {
              purchaseTrend: generateTrendData(),
              supplierPerformance: generatePieData({ 'On Time': 0, 'Delayed': 0, 'Critical': 0 }),
              orderValue: generateBarData()
            },
            quickActions: [
              { label: 'Create PO', action: 'order-dashboard', color: 'primary' },
              { label: 'Supplier List', action: 'supplier-management', color: 'info' },
              { label: 'Export Status', action: 'export-management', color: 'success' },
            ],
            recentActivities: activities,
          };

        case 'company_admin':
        case 'super_admin':
          // If super_admin has a company selected, show the company_admin dashboard view
          if (currentUser.role === 'super_admin' && selectedCompanyId) {
            return {
              ...baseData,
              keyMetrics: [
                { label: 'Pending Proforma Invoices', value: baseData.pendingProformaInvoices, trend: '', color: 'warning', icon: FileText },
                { label: 'Confirm Proforma Invoices', value: baseData.confirmedProformaInvoices, trend: '', color: 'success', icon: CheckCircle },
                { label: 'Pending Proforma Orders', value: baseData.pendingProformaOrders, trend: '', color: 'warning', icon: ShoppingCart },
                { label: 'Confirm Proforma Orders', value: baseData.confirmedProformaOrders, trend: '', color: 'success', icon: CheckCircle },
                { label: 'Ready Proforma Orders', value: baseData.readyProformaOrders, trend: '', color: 'info', icon: Package },
                { label: 'Total QC', value: baseData.pendingQC, trend: '', color: 'danger', icon: AlertCircle },
                { label: 'Total Users', value: baseData.totalUsers, trend: '', color: 'primary', icon: Users },
                { label: 'Monthly Revenue', value: `$${baseData.totalRevenue.toLocaleString()}`, trend: baseData.charts?.growthPercent || '', color: 'success', icon: DollarSign },
              ],
              charts: {
                leadsTrend: generateTrendData(),
                orderStatus: generatePieData({ Pending: 0, Processing: 0, Completed: 0 }),
                monthlyGrowth: generateBarData()
              },
              quickActions: [
                { label: 'User Management', action: 'user-management', color: 'primary' },
                { label: 'Create Order', action: 'order-form', color: 'success' },
                { label: 'View Reports', action: 'reports-analytics', color: 'info' },
              ],
              recentActivities: activities,
            };
          }
          return {
            ...baseData,
            keyMetrics: [
              { label: 'Pending Proforma Invoices', value: baseData.pendingProformaInvoices, trend: '', color: 'warning', icon: FileText },
              { label: 'Confirm Proforma Invoices', value: baseData.confirmedProformaInvoices, trend: '', color: 'success', icon: CheckCircle },
              { label: 'Pending Proforma Orders', value: baseData.pendingProformaOrders, trend: '', color: 'warning', icon: ShoppingCart },
              { label: 'Confirm Proforma Orders', value: baseData.confirmedProformaOrders, trend: '', color: 'success', icon: CheckCircle },
              { label: 'Ready Proforma Orders', value: baseData.readyProformaOrders, trend: '', color: 'info', icon: Package },
              { label: 'Total QC', value: baseData.pendingQC, trend: '', color: 'danger', icon: AlertCircle },
              { label: 'Total Users', value: baseData.totalUsers, trend: '', color: 'primary', icon: Users },
              { label: 'Monthly Revenue', value: `$${baseData.totalRevenue.toLocaleString()}`, trend: baseData.charts?.growthPercent || '', color: 'success', icon: DollarSign },
            ],
            charts: {
              userActivity: generateTrendData(),
              systemHealth: baseData.charts?.systemHealth ? 
                baseData.charts.systemHealth.map((entry, index) => ({
                  ...entry, color: ['#16a34a', '#f97316', '#dc2626', '#2563eb'][index % 4]
                })) : 
                generatePieData({ 'Good': 85, 'Warning': 12, 'Critical': 3 }),
              monthlyGrowth: generateBarData()
            },
            quickActions: [
              { label: 'User Management', action: 'user-management', color: 'primary' },
              { label: 'System Settings', action: 'system-settings', color: 'secondary' },
              { label: 'Analytics', action: 'reports-analytics', color: 'info' },
            ],
            recentActivities: activities,
          };

        case 'administration':
          return {
            ...baseData,
            keyMetrics: [
              { label: 'Products in Catalogue', value: baseData.totalProducts.toLocaleString(), trend: '', color: 'success', icon: Package },
              { label: 'Pending Catalogue Updates', value: baseData.catalogueAlerts, trend: '', color: 'warning', icon: AlertCircle },
              { label: 'Categories', value: baseData.categories, trend: '', color: 'info', icon: Target },
              { label: 'Catalogues', value: baseData.catalogues, trend: '', color: 'success', icon: Eye },
            ],
            charts: {
              catalogueTrend: generateTrendData(),
              categoryDistribution: generatePieData({ 'Glazed Vitrified Tiles': 650, 'Porcelain Slabs': 395, 'Decorative Tiles': 200 }),
              productAdds: generateBarData()
            },
            quickActions: [
              { label: 'Create Product', action: 'product-management', color: 'primary' },
              { label: 'Manage Exports', action: 'export-management', color: 'success' },
              { label: 'Manage Catalogue', action: 'catalogue-management', color: 'info' },
              { label: 'Product Reports', action: 'reports-analytics', color: 'secondary' },
            ],
            recentActivities: activities,
          };

        case 'client':
          return {
            ...baseData,
            keyMetrics: [
              { label: 'My Orders', value: baseData.myOrders, trend: '', color: 'info', icon: ShoppingCart },
              { label: 'Pending Invoices', value: baseData.myInvoices, trend: '', color: 'warning', icon: FileText },
              { label: 'Total Spend', value: `$${baseData.totalSpend.toLocaleString()}`, trend: '', color: 'success', icon: DollarSign },
              { label: 'Order Status', value: 'Active', trend: '', color: 'info', icon: Truck },
            ],
            charts: {
              orderTrend: generateTrendData(),
              orderStatus: generatePieData({ Delivered: 0, 'In Transit': 0, Processing: 0 }),
              monthlySpend: generateBarData()
            },
            quickActions: [
              { label: 'New Order', action: 'client-order-management', color: 'primary' },
              { label: 'View Invoices', action: 'invoice-dashboard', color: 'success' },
              { label: 'Track Shipment', action: 'export-management', color: 'info' },
            ],
            recentActivities: activities,
          };

        case 'export_documents':
          return {
            ...baseData,
            keyMetrics: [
              { label: 'Pending Exports', value: baseData.totalExports, trend: '', color: 'warning', icon: Ship },
              { label: 'Export Invoices', value: baseData.exportInvoices, trend: '', color: 'info', icon: FileText },
              { label: 'Packing Lists', value: baseData.packingLists, trend: '', color: 'success', icon: Package },
              { label: 'VGM Ready', value: baseData.vgms, trend: '', color: 'success', icon: CheckCircle },
              { label: 'Annexures', value: baseData.annexures, trend: '', color: 'info', icon: Package },
              { label: 'Shipping Docs', value: baseData.shippingInstructions, trend: '', color: 'success', icon: FileText },
            ],
            charts: {
              exportTrend: generateTrendData(),
              documentStatus: generatePieData({ 'Export Invoices': 0, 'Packing Lists': 0, 'Annexures': 0, 'VGM': 0 }),
              monthlyExports: generateBarData()
            },
            quickActions: [
              { label: 'Export Invoice', action: 'export-invoice', color: 'primary' },
              { label: 'Proforma Invoice', action: 'invoice-dashboard', color: 'info' },
              { label: 'Packing List', action: 'packing-list-management', color: 'success' },
              { label: 'Annexure', action: 'export-invoice-annexure', color: 'warning' },
              { label: 'Invoice Backside', action: 'invoice-backside', color: 'info' },
              { label: 'VGM', action: 'vgm', color: 'success' },
              { label: 'Shipping Instructions', action: 'export-shipping-instructions', color: 'secondary' },
            ],
            recentActivities: activities,
          };

        default:
          return {
            ...baseData,
            keyMetrics: [
              { label: 'My Invoices', value: baseData.totalInvoices, trend: '', color: 'info', icon: FileText },
              { label: 'Revenue', value: `$${baseData.totalRevenue.toLocaleString()}`, trend: baseData.charts?.growthPercent || '', color: 'success', icon: DollarSign },
              { label: 'Clients', value: baseData.totalClients, trend: '', color: 'success', icon: Users },
              { label: 'Tasks', value: '8', trend: '', color: 'warning', icon: CheckCircle },
            ],
            quickActions: [
              { label: 'View Profile', action: 'profile-settings', color: 'primary' },
              { label: 'Create Invoice', action: 'invoice-form', color: 'success' },
              { label: 'Support', action: 'support', color: 'info' },
            ],
            recentActivities: activities,
          };
      }
    };

    fetchDashboardData();

    // Live update polling - 60 seconds
    const pollInterval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(pollInterval);
  }, [currentUser?.id, selectedCompanyId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = currentUser?.name || 'User';
    
    if (hour < 12) return `Good Morning, ${name}`;
    if (hour < 17) return `Good Afternoon, ${name}`;
    return `Good Evening, ${name}`;
  };

  const getRoleTitle = () => {
    const roleMap = {
      'super_admin': 'Super Administrator',
      'company_admin': 'Company Administrator', 
      'sales_manager': 'Sales Manager',
      'sales_executive': 'Sales Executive',
      'account': 'Account Manager',
      'qc': 'Quality Control Manager',
      'purchase': 'Purchase Manager',
      'administration': 'Administration Manager',
      'client': 'Client User',
    };
    return roleMap[currentUser?.role] || 'Team Member';
  };

  return (
    <Container fluid className="role-based-dashboard">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <Row className="align-items-center">
          <Col md={12}>
            <h2 className="dashboard-greeting mb-2 text-white">{getGreeting()}</h2>
            <div className="header-subtitle text-white">Welcome back! Here's what's happening with your enterprise today.</div>
          </Col>
        </Row>
      </div>


      {/* Operational KPI Cards */}
      {(() => {
        const isModuleEnabled = (moduleKey) => {
          if (!currentUser) return false;
          if (currentUser.role === 'super_admin') return true;
          if (!currentUser.enabledModules || !Array.isArray(currentUser.enabledModules)) return true;
          return currentUser.enabledModules.includes(moduleKey);
        };

        if (!['admin', 'sales_manager'].includes(currentUser?.role)) return null;

        return (
          <Row className="mb-4">
            {isModuleEnabled('proforma_order') && (
              <Col lg={3} md={6} className="mb-3">

                <Card
                  className="kpi-card h-100"
                  style={{ cursor: 'pointer', borderLeft: '4px solid #2563eb' }}
                  onClick={() => onNavigate('order-dashboard')}
                >
                  <Card.Body className="d-flex align-items-center p-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '48px', height: '48px', backgroundColor: '#2563eb15', color: '#2563eb' }}
                    >
                      <ShoppingCart size={24} />
                    </div>
                    <div>
                      <div className="h3 mb-0 fw-bold">{dashboardData.openOrders ?? 0}</div>
                      <div className="text-muted small">Open Orders</div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {isModuleEnabled('qc_management') && (
              <Col lg={3} md={6} className="mb-3">
                <Card
                  className="kpi-card h-100"
                  style={{ cursor: 'pointer', borderLeft: '4px solid #f97316' }}
                  onClick={() => onNavigate('qc-management')}
                >
                  <Card.Body className="d-flex align-items-center p-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '48px', height: '48px', backgroundColor: '#f9731615', color: '#f97316' }}
                    >
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <div className="h3 mb-0 fw-bold">{dashboardData.pendingQC ?? 0}</div>
                      <div className="text-muted small">Pending QC</div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {isModuleEnabled('export_management') && (
              <Col lg={3} md={6} className="mb-3">
                <Card
                  className="kpi-card-premium h-100 shadow-sm"
                  style={{ cursor: 'pointer', borderLeft: '4px solid #16a34a' }}
                  onClick={() => onNavigate('export-management')}
                >
                  <Card.Body className="d-flex align-items-center p-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '48px', height: '48px', backgroundColor: '#16a34a15', color: '#16a34a' }}
                    >
                      <Truck size={24} />
                    </div>
                    <div>
                      <div className="h3 mb-0 fw-bold">{dashboardData.shipmentsInProgress ?? 0}</div>
                      <div className="text-muted small">Shipments in Progress</div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {isModuleEnabled('account_finance') && (
              <Col lg={3} md={6} className="mb-3">
                <Card
                  className="kpi-card-premium h-100 shadow-sm"
                  style={{ cursor: 'pointer', borderLeft: '4px solid #dc2626' }}
                  onClick={() => onNavigate('account-finance-management')}
                >
                  <Card.Body className="d-flex align-items-center p-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '48px', height: '48px', backgroundColor: '#dc262615', color: '#dc2626' }}
                    >
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <div className="h3 mb-0 fw-bold">{dashboardData.outstandingPayments ?? 0}</div>
                      <div className="text-muted small">Outstanding Payments</div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        );
      })()}

      {/* Quick Glance Metrics - Color Coded */}
      <Row className="mb-4">
        {dashboardData.keyMetrics?.map((metric, index) => {
          const palette = [
            { border: '#f97316', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', iconBg: '#f97316', iconColor: '#fff', valueColor: '#c2410c' }, // Pending PI – Orange
            { border: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', iconBg: '#16a34a', iconColor: '#fff', valueColor: '#166534' }, // Confirmed PI – Green
            { border: '#f59e0b', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', iconBg: '#f59e0b', iconColor: '#fff', valueColor: '#92400e' }, // Pending PO – Amber
            { border: '#2563eb', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', iconBg: '#2563eb', iconColor: '#fff', valueColor: '#1e40af' }, // Confirmed PO – Blue
            { border: '#0ea5e9', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', iconBg: '#0ea5e9', iconColor: '#fff', valueColor: '#0369a1' }, // Ready PO – Sky
            { border: '#8b5cf6', bg: 'linear-gradient(135deg,#faf5ff,#ede9fe)', iconBg: '#8b5cf6', iconColor: '#fff', valueColor: '#6d28d9' }, // Total QC – Purple
            { border: '#06b6d4', bg: 'linear-gradient(135deg,#ecfeff,#cffafe)', iconBg: '#06b6d4', iconColor: '#fff', valueColor: '#0e7490' }, // Total Users – Cyan
            { border: '#10b981', bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', iconBg: 'linear-gradient(135deg,#059669,#10b981)', iconColor: '#fff', valueColor: '#065f46' }, // Revenue – Emerald
          ];
          const p = palette[index] || palette[0];
          const Icon = metric.icon;
          return (
            <Col lg={3} md={6} key={index} className="mb-4">
              <Card
                className="h-100 border-0 shadow-sm"
                style={{
                  background: p.bg,
                  borderLeft: `4px solid ${p.border} !important`,
                  borderRadius: '14px',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  overflow: 'hidden',
                  cursor: 'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${p.border}33`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.08)'; }}
              >
                <Card.Body className="p-3" style={{ borderLeft: `4px solid ${p.border}` }}>
                  <div className="d-flex align-items-start justify-content-between">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 me-3 flex-shrink-0"
                      style={{ width: '46px', height: '46px', background: p.iconBg, color: p.iconColor, boxShadow: `0 4px 12px ${p.border}55` }}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-grow-1">
                      <div style={{ fontSize: '1.9rem', fontWeight: 800, color: p.valueColor, lineHeight: 1.1 }}>
                        {metric.value}
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: p.border, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                        {metric.label}
                      </div>
                    </div>
                    {metric.trend && (
                      <span
                        className="ms-2 px-2 py-1 rounded-pill"
                        style={{ fontSize: '0.7rem', fontWeight: 700, background: p.border, color: '#fff', whiteSpace: 'nowrap' }}
                      >
                        {metric.trend}
                      </span>
                    )}
                  </div>
                  {/* Decorative accent bar at bottom */}
                  <div style={{ height: '3px', background: `linear-gradient(90deg, ${p.border}, transparent)`, marginTop: '14px', borderRadius: '2px', opacity: 0.5 }} />
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Visual Charts Section */}
      {dashboardData.charts && !['company_admin', 'super_admin'].includes(currentUser?.role) && (
        <Row className="mb-4">
          <Col lg={4} className="mb-3">
            <Card className="chart-card-premium h-100">
              <Card.Header className="bg-white border-bottom-0 pt-3 px-3">
                <h6 className="chart-title-premium mb-0">
                  {currentUser?.role === 'sales_manager' || currentUser?.role === 'sales_executive' ? 'Leads Trend' :
                   currentUser?.role === 'account' ? 'Payment Trend' :
                   currentUser?.role === 'qc' ? 'Quality Trend' :
                   currentUser?.role === 'purchase' ? 'Purchase Trend' : 'Activity Trend'}
                </h6>
              </Card.Header>
              <Card.Body className="p-2">
                <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0} debounce={100}>
                  <AreaChart data={Object.values(dashboardData.charts)[0]}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#2563eb" fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4} className="mb-3">
            <Card className="chart-card h-100">
              <Card.Header>
                <h6 className="chart-title mb-0">
                  {currentUser?.role === 'sales_manager' || currentUser?.role === 'sales_executive' ? 'Invoice Status' :
                   currentUser?.role === 'account' ? 'Payment Status' :
                   currentUser?.role === 'qc' ? 'Inspection Status' :
                   currentUser?.role === 'purchase' ? 'Supplier Performance' : 'System Health'}
                </h6>
              </Card.Header>
              <Card.Body className="p-2 d-flex justify-content-center align-items-center">
                <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0} debounce={100}>
                  <PieChart>
                    <Pie
                      data={Object.values(dashboardData.charts)[1]}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, value}) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {Object.values(dashboardData.charts)[1].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4} className="mb-3">
            <Card className="chart-card h-100">
              <Card.Header>
                <h6 className="chart-title mb-0">
                  {currentUser?.role === 'sales_manager' || currentUser?.role === 'sales_executive' ? 'Monthly Performance' :
                   currentUser?.role === 'account' ? 'Monthly Revenue' :
                   currentUser?.role === 'qc' ? 'Defect Types' :
                   currentUser?.role === 'purchase' ? 'Order Value' : 'Monthly Growth'}
                </h6>
              </Card.Header>
              <Card.Body className="p-2">
                <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0} debounce={100}>
                  <BarChart data={Object.values(dashboardData.charts)[2]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Quick Actions & Recent Activities */}
      <Row className="g-4">
        {!['company_admin', 'super_admin'].includes(currentUser?.role) && (
          <Col lg={4}>
            <Card className="dashboard-card quick-actions-card h-100">
            <div className="card-header-vibrant bg-primary text-white py-2 px-3">
              <h6 className="mb-0 fw-bold text-white">Quick Actions</h6>
            </div>
            <Card.Body className="p-3">
              <div className="d-grid gap-2">
                {dashboardData.quickActions?.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.color}
                    onClick={() => onNavigate(action.action)}
                    className={`quick-action-btn-premium btn-${action.color}`}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
        )}

        <Col lg={['company_admin', 'super_admin'].includes(currentUser?.role) ? 12 : 8}>
          <Card className="dashboard-card recent-activities-card h-100">
            <div className="card-header-vibrant bg-primary text-white py-2 px-3">
              <h6 className="mb-0 fw-bold text-white">Recent Activities</h6>
            </div>
            <Card.Body className="p-0">
              <div className="activities-list-container">
                {dashboardData.recentActivities && dashboardData.recentActivities.length > 0 ? (
                  dashboardData.recentActivities.map((activity, index) => (
                    <div key={index} className="activity-item-premium">
                      <div className="activity-content-left">
                        <div className="activity-action-text">{activity.action}</div>
                        <div className="activity-client-text">{activity.client}</div>
                      </div>
                      <div className="activity-content-right text-end">
                        <div className={`activity-status-badge status-${activity.status || 'info'}`}>
                          {(activity.status || 'INFO').toUpperCase()}
                        </div>
                        <div className="activity-time-text">{activity.time}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-5 text-muted">
                    <Clock size={40} className="mb-2 opacity-25" />
                    <p>No recent activities found</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Dashboard Alerts (if any) */}
      {currentUser?.role === 'account' && dashboardData.overdueInvoices > 0 && (
        <Alert variant="warning" className="dashboard-alert">
          <AlertCircle size={20} className="me-2" />
          You have {dashboardData.overdueInvoices} overdue invoices requiring attention.
          <Button variant="outline" size="sm" className="ms-2" onClick={() => onNavigate('account-finance-management')}>
            View Details
          </Button>
        </Alert>
      )}

      <style>{`
        .role-based-dashboard {
          padding: 1rem 0;
        }

        .dashboard-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%);
          border-radius: 16px;
          color: white;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.3);
        }

        .dashboard-header::after {
          content: '';
          position: absolute;
          top: -10%;
          right: -5%;
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          filter: blur(60px);
        }

        .dashboard-header::before {
          content: '';
          position: absolute;
          bottom: -20%;
          left: -5%;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
          filter: blur(40px);
        }

        .dashboard-greeting {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .dashboard-role-title {
          font-size: 1.2rem;
          opacity: 0.9;
          margin-bottom: 0;
        }

        .role-badge {
          font-size: 0.8rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
        }

        .kpi-card {
          background: #ffffff;
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .metric-card {
          background: #ffffff;
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: transform 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
        }

        .metric-icon {
          margin-bottom: 1rem;
        }

        .metric-value {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .metric-label {
          color: #6b7280;
          font-size: 0.9rem;
          margin-bottom: 0;
        }

        .metric-trend {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .dashboard-card {
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          background: #ffffff;
        }

        .card-header-vibrant {
          background: #2563eb !important;
          border-bottom: none;
        }

        .quick-action-btn-premium {
          padding: 0.5rem;
          font-weight: 700;
          font-size: 0.85rem;
          border-radius: 12px;
          transition: all 0.2s ease;
          border: none;
          text-transform: none;
          letter-spacing: 0.01em;
        }

        .quick-action-btn-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .btn-secondary { background-color: #475569 !important; }
        .btn-info { background-color: #06b6d4 !important; color: white !important; }
        .btn-success { background-color: #16a34a !important; }
        .btn-warning { background-color: #f59e0b !important; color: white !important; }

        .activities-list-container {
          max-height: 250px;
          overflow-y: auto;
        }

        .activity-item-premium {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.2s;
        }

        .activity-item-premium:hover {
          background-color: #f8fafc;
        }

        .activity-item-premium:last-child {
          border-bottom: none;
        }

        .activity-action-text {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
        }

        .activity-client-text {
          color: #64748b;
          font-size: 0.85rem;
        }

        .activity-status-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.25rem 0.65rem;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 0.35rem;
          letter-spacing: 0.05em;
        }

        .status-success { background: #dcfce7; color: #166534; }
        .status-info { background: #e0f2fe; color: #0369a1; }
        .status-warning { background: #fef3c7; color: #92400e; }
        .status-danger { background: #fee2e2; color: #991b1b; }

        .activity-time-text {
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .dashboard-alert {
          border: none;
          border-radius: 16px;
          display: flex;
          align-items: center;
        }

        .chart-card {
          background: #ffffff;
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: transform 0.2s ease;
        }

        .chart-card:hover {
          transform: translateY(-2px);
        }

        .chart-title {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }

        .chart-card .card-header {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.5rem 1rem;
        }

        .chart-card .card-body {
          padding: 0.5rem;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .dashboard-greeting {
            font-size: 1.8rem;
          }

          .dashboard-role-title {
            font-size: 1rem;
          }

          .metric-value {
            font-size: 2rem;
          }
        }
      `}</style>
    </Container>
  );
}

export default RoleBasedDashboard;




