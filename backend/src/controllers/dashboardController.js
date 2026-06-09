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

import { debugLogger } from '../utils/debugLogger.js';
import { successResponse } from '../utils/helpers.js';

const dashboardCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds (short for dev; increase to 5*60*1000 in prod)

/**
 * Get real-time dashboard data for all roles
 * Returns accurate, role-filtered statistics
 */
export const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;
    const companyFilter = req.hasOwnProperty('companyFilter') ? req.companyFilter : 'none';
    const cacheKey = `${userId}-${companyId}-${userRole}-${companyFilter}`;

    if (dashboardCache.has(cacheKey)) {
      const cached = dashboardCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return successResponse(res, cached.data, 'Dashboard data retrieved from cache');
      } else {
        dashboardCache.delete(cacheKey);
      }
    }

    let stats = {};

    // Super Admin - See system-wide data
    if (userRole === 'super_admin') {
      let companyConds = "";
      let vals = [];
      let companiesQuery = "SELECT COUNT(*) as count FROM companies WHERE status IN ('Active', 'active')";
      let usersQuery = "SELECT COUNT(*) as count FROM users WHERE status IN ('Active', 'active')";

      if (req.hasOwnProperty('companyFilter')) {
        if (req.companyFilter !== null) {
          companyConds = "WHERE company_id = $1";
          vals = [req.companyFilter];
          companiesQuery = "SELECT COUNT(*) as count FROM companies WHERE id = $1";
          usersQuery = "SELECT COUNT(*) as count FROM users WHERE status IN ('Active', 'active') AND company_id = $1";
        } else {
          companyConds = "WHERE company_id IS NULL";
          // keep companiesQuery global for super_admin
          usersQuery = "SELECT COUNT(*) as count FROM users WHERE status IN ('Active', 'active') AND company_id IS NULL";
        }
      }

      const [companies, users, invoices, revenue, openOrders, pendingQC, shipmentsInProgress, outstandingPayments, pendingPI, confirmedPI, pendingPO, confirmedPO, readyPO] = await Promise.all([
        req.db.globalQuery(companiesQuery, vals),
        req.db.query(usersQuery, vals),
        req.db.query(`SELECT COUNT(*) as count FROM proforma_invoices ${companyConds}`, vals),
        req.db.query(`SELECT SUM(COALESCE(CAST(total_amount AS DECIMAL), 0)) as total FROM proforma_invoices ${companyConds}`, vals),
        req.db.query(`SELECT COUNT(*) as count FROM proforma_orders WHERE status NOT IN ('Completed', 'Locked', 'Deleted') ${companyConds ? "AND " + companyConds.substring(6) : ""}`, vals),
        req.db.query(`SELECT COUNT(*) as count FROM qc_records WHERE qc_status != 'Passed' ${companyConds ? "AND " + companyConds.substring(6) : ""}`, vals),
        req.db.query(`SELECT COUNT(*) as count FROM export_invoices WHERE status IN ('In Transit', 'Shipped', 'Active') ${companyConds ? "AND " + companyConds.substring(6) : ""}`, vals),
        req.db.query(`SELECT COUNT(*) as count FROM account_entries WHERE status IN ('Pending', 'Overdue') ${companyConds ? "AND " + companyConds.substring(6) : ""}`, vals),
        req.db.query(`SELECT COUNT(*) as count FROM proforma_invoices WHERE status IN ('Draft', 'Pending') ${companyConds ? "AND " + companyConds.substring(6) : ""}`, vals),
        req.db.query(`SELECT COUNT(*) as count FROM proforma_invoices WHERE status = 'Approved' ${companyConds ? "AND " + companyConds.substring(6) : ""}`, vals),
        req.db.query(`SELECT COUNT(*) as count FROM proforma_orders WHERE status IN ('Draft', 'Pending') ${companyConds ? "AND " + companyConds.substring(6) : ""}`, vals),
        req.db.query(`SELECT COUNT(*) as count FROM proforma_orders WHERE status = 'Approved' ${companyConds ? "AND " + companyConds.substring(6) : ""}`, vals),
        req.db.query(`SELECT COUNT(*) as count FROM proforma_orders WHERE qc_status = 'Approved' ${companyConds ? "AND " + companyConds.substring(6) : ""}`, vals)
      ]);

      stats = {
        role: 'super_admin',
        totalCompanies: parseInt(companies.rows[0]?.count || 0),
        totalUsers: parseInt(users.rows[0]?.count || 0),
        totalInvoices: parseInt(invoices.rows[0]?.count || 0),
        totalRevenue: parseFloat(revenue.rows[0]?.total || 0),
        openOrders: parseInt(openOrders.rows[0]?.count || 0),
        pendingQC: parseInt(pendingQC.rows[0]?.count || 0),
        shipmentsInProgress: parseInt(shipmentsInProgress.rows[0]?.count || 0),
        outstandingPayments: parseInt(outstandingPayments.rows[0]?.count || 0),
        overdueInvoices: parseInt(outstandingPayments.rows[0]?.count || 0), // Standardized key for UI alerts
        pendingProformaInvoices: parseInt(pendingPI?.rows[0]?.count || 0),
        confirmedProformaInvoices: parseInt(confirmedPI?.rows[0]?.count || 0),
        pendingProformaOrders: parseInt(pendingPO?.rows[0]?.count || 0),
        confirmedProformaOrders: parseInt(confirmedPO?.rows[0]?.count || 0),
        readyProformaOrders: parseInt(readyPO?.rows[0]?.count || 0),
        dataSource: req.hasOwnProperty('companyFilter') && req.companyFilter !== null ? 'Company data' : 'System-wide'
      };

    }
    // Sales Roles - Company-specific data
    else if (['sales_manager', 'sales_executive', 'company_admin', 'admin'].includes(userRole)) {
      const [invoices, leads, clients, revenue, openOrders, pendingQC, shipmentsInProgress, outstandingPayments, users, pendingPI, confirmedPI, pendingPO, confirmedPO, readyPO, totalQC, monthlyRevenue] = await Promise.all([
        req.db.query("SELECT COUNT(*) as count FROM proforma_invoices WHERE status NOT IN ('Revised') AND company_id = $1", [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM leads WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM clients WHERE company_id = $1', [companyId]),
        req.db.query("SELECT SUM(COALESCE(CAST(total_amount AS DECIMAL), 0)) as total FROM proforma_invoices WHERE status != 'Revised' AND company_id = $1", [companyId]),
        req.db.query("SELECT COUNT(*) as count FROM proforma_orders WHERE status NOT IN ('Revised') AND company_id = $1", [companyId]),
        req.db.query("SELECT COUNT(*) as count FROM qc_records WHERE company_id = $1", [companyId]),
        req.db.query("SELECT COUNT(*) as count FROM export_invoices WHERE status IN ('In Transit', 'Shipped', 'Active') AND company_id = $1", [companyId]),
        req.db.query("SELECT COUNT(*) as count FROM account_entries WHERE status IN ('Pending', 'Overdue') AND company_id = $1", [companyId]),
        // Users live in global DB — must use globalQuery
        req.db.globalQuery("SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND status = 'Active'", [companyId]),
        // Pending PI = Pending invoices
        req.db.query("SELECT COUNT(*) as count FROM proforma_invoices WHERE status IN ('Draft', 'Pending') AND company_id = $1", [companyId]),
        // Confirmed PI = Approved invoices
        req.db.query("SELECT COUNT(*) as count FROM proforma_invoices WHERE status = 'Approved' AND company_id = $1", [companyId]),
        // Pending PO = Pending orders
        req.db.query("SELECT COUNT(*) as count FROM proforma_orders WHERE status IN ('Draft', 'Pending') AND company_id = $1", [companyId]),
        // Confirmed PO = Approved orders
        req.db.query("SELECT COUNT(*) as count FROM proforma_orders WHERE status = 'Approved' AND company_id = $1", [companyId]),
        // Ready PO = qc_status is Approved
        req.db.query("SELECT COUNT(*) as count FROM proforma_orders WHERE qc_status = 'Approved' AND company_id = $1", [companyId]),
        // Total QC records
        req.db.query("SELECT COUNT(*) as count FROM qc_records WHERE company_id = $1", [companyId]),
        // Monthly revenue = current month PI total
        req.db.query("SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM proforma_invoices WHERE status != 'Revised' AND company_id = $1 AND date_trunc('month', created_at) = date_trunc('month', CURRENT_TIMESTAMP)", [companyId])
      ]);

      stats = {
        role: userRole,
        companyId,
        invoices: parseInt(invoices.rows[0]?.count || 0),
        totalInvoices: parseInt(invoices.rows[0]?.count || 0),
        leads: parseInt(leads.rows[0]?.count || 0),
        activeLeads: parseInt(leads.rows[0]?.count || 0),
        clients: parseInt(clients.rows[0]?.count || 0),
        totalClients: parseInt(clients.rows[0]?.count || 0),
        revenue: parseFloat(revenue.rows[0]?.total || 0),
        totalRevenue: parseFloat(monthlyRevenue.rows[0]?.total || 0),
        openOrders: parseInt(openOrders.rows[0]?.count || 0),
        pendingQC: parseInt(totalQC.rows[0]?.count || 0),
        shipmentsInProgress: parseInt(shipmentsInProgress.rows[0]?.count || 0),
        outstandingPayments: parseInt(outstandingPayments.rows[0]?.count || 0),
        overdueInvoices: parseInt(outstandingPayments.rows[0]?.count || 0),
        totalUsers: parseInt(users.rows[0]?.count || 0),
        userActivity: parseInt(users.rows[0]?.count || 0),
        pendingProformaInvoices: parseInt(pendingPI?.rows[0]?.count || 0),
        confirmedProformaInvoices: parseInt(confirmedPI?.rows[0]?.count || 0),
        pendingProformaOrders: parseInt(pendingPO?.rows[0]?.count || 0),
        confirmedProformaOrders: parseInt(confirmedPO?.rows[0]?.count || 0),
        readyProformaOrders: parseInt(readyPO?.rows[0]?.count || 0),
        dataSource: 'Company data'
      };

    }
    // QC Role - QC-specific data
    else if (['qc', 'qc_inspector'].includes(userRole)) {
      const [qcRecords, passed, failed] = await Promise.all([
        req.db.query('SELECT COUNT(*) as count FROM qc_records WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM qc_records WHERE company_id = $1 AND qc_status = $2', [companyId, 'Passed']),
        req.db.query('SELECT COUNT(*) as count FROM qc_records WHERE company_id = $1 AND qc_status = $2', [companyId, 'Failed'])
      ]);

      stats = {
        role: userRole,
        companyId,
        totalQCRecords: parseInt(qcRecords.rows[0]?.count || 0),
        passedQC: parseInt(passed.rows[0]?.count || 0),
        failedQC: parseInt(failed.rows[0]?.count || 0),
        pendingQC: parseInt(qcRecords.rows[0]?.count || 0) - (parseInt(passed.rows[0]?.count || 0) + parseInt(failed.rows[0]?.count || 0)),
        dataSource: 'QC data'
      };
    }
    // Account Role - Financial data
    else if (userRole === 'account') {
      const [invoices, entries, paid, revenue] = await Promise.all([
        req.db.query('SELECT COUNT(*) as count FROM proforma_invoices WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM account_entries WHERE company_id = $1', [companyId]),
        req.db.query("SELECT COUNT(*) as count FROM account_entries WHERE company_id = $1 AND status IN ('Paid', 'paid')", [companyId]),
        req.db.query('SELECT SUM(COALESCE(CAST(total_amount AS DECIMAL), 0)) as total FROM proforma_invoices WHERE company_id = $1', [companyId])
      ]);

      stats = {
        role: userRole,
        companyId,
        totalInvoices: parseInt(invoices.rows[0]?.count || 0),
        totalRevenue: parseFloat(revenue.rows[0]?.total || 0),
        accountEntries: parseInt(entries.rows[0]?.count || 0),
        paidEntries: parseInt(paid.rows[0]?.count || 0),
        pendingPayments: parseInt(entries.rows[0]?.count || 0) - parseInt(paid.rows[0]?.count || 0),
        overdueInvoices: parseInt(entries.rows[0]?.count || 0) - parseInt(paid.rows[0]?.count || 0),
        dataSource: 'Financial data'
      };

    }
    // Purchase Manager - Order/Supplier data
    else if (userRole === 'purchase_manager') {
      const [orders, suppliers, products] = await Promise.all([
        req.db.query('SELECT COUNT(*) as count FROM proforma_orders WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM suppliers WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM products WHERE company_id = $1', [companyId])
      ]);

      stats = {
        role: userRole,
        companyId,
        orders: parseInt(orders.rows[0]?.count || 0),
        pendingPOs: parseInt(orders.rows[0]?.count || 0),
        suppliers: parseInt(suppliers.rows[0]?.count || 0),
        supplierDeadlines: 0, // Placeholder
        products: parseInt(products.rows[0]?.count || 0),
        dataSource: 'Purchase data'
      };
    }
    // Administration - Product/Catalogue data
    else if (userRole === 'administration') {
      const [products, catalogues, categories] = await Promise.all([
        req.db.query('SELECT COUNT(*) as count FROM products WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM catalogues WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(DISTINCT category) as count FROM products WHERE company_id = $1', [companyId])
      ]);

      stats = {
        role: userRole,
        companyId,
        totalProducts: parseInt(products.rows[0]?.count || 0),
        catalogues: parseInt(catalogues.rows[0]?.count || 0),
        categories: parseInt(categories.rows[0]?.count || 0),
        catalogueAlerts: 0, // Placeholder
        dataSource: 'Product data'
      };
    }
    // Client - Order data
    else if (userRole === 'client') {
      const [orders, invoices, spend] = await Promise.all([
        req.db.query('SELECT COUNT(*) as count FROM client_orders WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM proforma_invoices WHERE company_id = $1', [companyId]),
        req.db.query('SELECT SUM(COALESCE(CAST(total_amount AS DECIMAL), 0)) as total FROM proforma_invoices WHERE company_id = $1', [companyId])
      ]);

      stats = {
        role: userRole,
        companyId,
        myOrders: parseInt(orders.rows[0]?.count || 0),
        myInvoices: parseInt(invoices.rows[0]?.count || 0),
        totalSpend: parseFloat(spend.rows[0]?.total || 0),
        totalRevenue: parseFloat(spend.rows[0]?.total || 0),
        dataSource: 'Client data'
      };
    }
    // Export Documents Role
    else if (userRole === 'export_documents') {
      const [invoices, packingLists, vgms, annexures, shippingInstructions] = await Promise.all([
        req.db.query('SELECT COUNT(*) as count FROM export_invoices WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM packing_lists WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM vgm_documents WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM export_invoice_annexures WHERE company_id = $1', [companyId]),
        req.db.query('SELECT COUNT(*) as count FROM shipping_instructions WHERE company_id = $1', [companyId])
      ]);

      stats = {
        role: userRole,
        companyId,
        exportInvoices: parseInt(invoices.rows[0]?.count || 0),
        packingLists: parseInt(packingLists.rows[0]?.count || 0),
        vgms: parseInt(vgms.rows[0]?.count || 0),
        annexures: parseInt(annexures.rows[0]?.count || 0),
        shippingInstructions: parseInt(shippingInstructions.rows[0]?.count || 0),
        totalExports: parseInt(invoices.rows[0]?.count || 0),
        dataSource: 'Export data'
      };
    }

    // --- ENHANCEMENT: Fetch Real-Time Charts & Activities ---
    // This provides the "Live" data for the dashboard visuals
    if (req.db && typeof req.db.query === 'function') {
      try {
        let chartConds = "";
        let chartVals = [];
        if (userRole !== 'super_admin' || (req.hasOwnProperty('companyFilter') && req.companyFilter !== null)) {
          const targetId = userRole === 'super_admin' ? req.companyFilter : companyId;
          chartConds = "WHERE company_id = $1";
          chartVals = [targetId];
        }

        const [activityTrend, systemHealth, monthlyGrowth, recentUsers, recentInvoices, recentLeads] = await Promise.all([
          // Activity Trend (Revenue over last 6 months)
          req.db.query(`
            SELECT TO_CHAR(date_trunc('month', created_at), 'Mon') as name, 
                  COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as value
            FROM proforma_invoices 
            ${chartConds}
            GROUP BY date_trunc('month', created_at)
            ORDER BY date_trunc('month', created_at) ASC
            LIMIT 6
          `, chartVals).catch(() => ({ rows: [] })),

          // System Health (Status distribution)
          req.db.query(`
            SELECT status as name, COUNT(*) as value
            FROM (
              SELECT CASE 
                WHEN qc_status IN ('Passed', 'Passed with conditions') THEN 'Good'
                WHEN qc_status IN ('Pending', 'Not Ready') THEN 'Warning'
                ELSE 'Critical'
              END as status FROM qc_records ${chartConds}
            ) s
            GROUP BY status
          `, chartVals).catch(() => ({ rows: [] })),

          // Monthly Growth (Current vs Previous Month)
          req.db.query(`
            WITH monthly_rev AS (
              SELECT date_trunc('month', created_at) as month, SUM(CAST(total_amount AS DECIMAL)) as rev
              FROM proforma_invoices 
              ${chartConds}
              GROUP BY 1
            )
            SELECT 
              (SELECT rev FROM monthly_rev ORDER BY month DESC LIMIT 1) as current_month,
              (SELECT rev FROM monthly_rev ORDER BY month DESC LIMIT 1 OFFSET 1) as prev_month
          `, chartVals).catch(() => ({ rows: [{ current_month: 0, prev_month: 0 }] })),

          // Recent Activities - Users
          req.db.query(`SELECT 'New User' as action, name as client, created_at as time, 'success' as status FROM users ${chartConds} ORDER BY created_at DESC LIMIT 3`, chartVals).catch(() => ({ rows: [] })),
          // Recent Activities - Invoices
          req.db.query(`SELECT 'Invoice Created' as action, invoice_no as client, created_at as time, 'info' as status FROM proforma_invoices ${chartConds} ORDER BY created_at DESC LIMIT 3`, chartVals).catch(() => ({ rows: [] })),
          // Recent Activities - Leads
          req.db.query(`SELECT 'Lead Created' as action, name as client, created_at as time, 'success' as status FROM leads ${chartConds} ORDER BY created_at DESC LIMIT 3`, chartVals).catch(() => ({ rows: [] }))
        ]);

        // Calculate growth percentage
        const currentRev = parseFloat(monthlyGrowth.rows[0]?.current_month || 0);
        const prevRev = parseFloat(monthlyGrowth.rows[0]?.prev_month || 0);
        const growthPercent = prevRev > 0 ? ((currentRev - prevRev) / prevRev * 100).toFixed(1) : 0;

        stats.charts = {
          userActivity: activityTrend.rows,
          systemHealth: systemHealth.rows.length > 0 ? systemHealth.rows : [{ name: 'N/A', value: 1 }],
          monthlyGrowth: [
            { name: 'Last Month', value: prevRev },
            { name: 'Current Month', value: currentRev }
          ],
          growthPercent: `${growthPercent > 0 ? '+' : ''}${growthPercent}%`
        };

        // Consolidate recent activities
        const allActivities = [
          ...recentUsers.rows,
          ...recentInvoices.rows,
          ...recentLeads.rows
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

        stats.recentActivities = allActivities.map(row => ({
          ...row,
          time: row.time ? new Date(row.time).toISOString() : new Date().toISOString()
        }));
      } catch (error) {
        debugLogger.error('[Dashboard Enhancement Error]:', error);
        // Ensure defaults are present even if enhancement fails
        stats.charts = stats.charts || { userActivity: [], systemHealth: [], monthlyGrowth: [], growthPercent: '0%' };
        stats.recentActivities = stats.recentActivities || [];
      }
    }

    dashboardCache.set(cacheKey, { timestamp: Date.now(), data: stats });
    return successResponse(res, stats, 'Dashboard data retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default getDashboardData;
