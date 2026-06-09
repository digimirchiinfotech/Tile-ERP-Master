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

/**
 * Analytics Controller
 * Provides dashboard data, metrics, and insights
 */

import debugLogger from '../utils/debugLogger.js';

const CONTEXT = 'AnalyticsController';

/**
 * GET /analytics/dashboard
 * Get comprehensive dashboard analytics
 */
export const getDashboardAnalytics = async (req, res, next) => {
  try {
    let { companyId } = req.user;
    if (req.hasOwnProperty('companyFilter')) {
      companyId = req.companyFilter;
    }

    // Summary metrics
    const summaryQuery = `
      SELECT
        COALESCE(SUM(ei.total_amount), 0) as total_revenue,
        COUNT(DISTINCT ei.id) as total_exports,
        COUNT(DISTINCT pl.id) as total_shipments,
        COUNT(DISTINCT ei.client_name) as total_clients,
        SUM(CASE WHEN ei.status = 'Draft' OR ei.status = 'Pending' THEN 1 ELSE 0 END) as pending_payments,
        SUM(CASE WHEN ei.status = 'completed' THEN 1 ELSE 0 END) as completed_exports
      FROM export_invoices ei
      LEFT JOIN packing_lists pl ON ei.id = pl.export_invoice_id
      WHERE ei.company_id = $1
    `;

    const summaryResult = await req.db.query(summaryQuery, [companyId]);
    const summary = summaryResult.rows[0] || {};

    // Revenue by month (group by month start, order by month desc)
    const revenueByMonthSQL = `
      SELECT
        TO_CHAR(date_trunc('month', ei.created_at), 'Mon YY') as month,
        COALESCE(SUM(ei.total_amount), 0) as revenue,
        date_trunc('month', ei.created_at) as month_start
      FROM export_invoices ei
      WHERE ei.company_id = $1
      GROUP BY date_trunc('month', ei.created_at)
      ORDER BY month_start DESC
      LIMIT 12
    `;

    const revenueByMonthResult = await req.db.query(revenueByMonthSQL, [companyId]);
    const revenueByMonth = (revenueByMonthResult.rows || []).map(r => ({ month: r.month, revenue: r.revenue })).reverse();

    // Export status distribution
    const exportsByStatusQuery = `
      SELECT
        status as name,
        COUNT(*) as value
      FROM export_invoices
      WHERE company_id = $1
      GROUP BY status
    `;

    const exportsByStatusResult = await req.db.query(exportsByStatusQuery, [companyId]);
    const exportsByStatus = exportsByStatusResult.rows;

    // Top clients
    const topClientsQuery = `
      SELECT
        client_name as name,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as invoice_count
      FROM export_invoices
      WHERE company_id = $1
      GROUP BY client_name
      ORDER BY revenue DESC
      LIMIT 5
    `;

    const topClientsResult = await req.db.query(topClientsQuery, [companyId]);
    const topClients = topClientsResult.rows;

    // Shipment metrics
    const shipmentMetricsQuery = `
      SELECT
        CASE
          WHEN status = 'In Transit' THEN 'In Transit'
          WHEN status = 'Delivered' THEN 'Delivered'
          WHEN status = 'Pending' THEN 'Pending'
          ELSE 'Other'
        END as name,
        COUNT(*) as value
      FROM shipping_instructions
      WHERE company_id = $1
      GROUP BY name
    `;

    const shipmentMetricsResult = await req.db.query(shipmentMetricsQuery, [companyId]);
    const shipmentMetrics = shipmentMetricsResult.rows;

    // Recent activity
    const recentActivityQuery = `
      SELECT
        ei.id,
        ei.invoice_no as "invoiceNo",
        ei.client_name as "clientName",
        ei.status,
        ei.created_at as "createdAt",
        'Invoice Created' as "eventType"
      FROM export_invoices ei
      WHERE ei.company_id = $1
      ORDER BY ei.created_at DESC
      LIMIT 10
    `;

    const recentActivityResult = await req.db.query(recentActivityQuery, [companyId]);
    const recentActivity = recentActivityResult.rows;

    debugLogger.info(CONTEXT, 'Dashboard analytics retrieved', { companyId });

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: Number(summary.total_revenue) || 0,
          totalExports: parseInt(summary.total_exports) || 0,
          totalShipments: parseInt(summary.total_shipments) || 0,
          totalClients: parseInt(summary.total_clients) || 0,
          pendingPayments: parseInt(summary.pending_payments) || 0,
          completedExports: parseInt(summary.completed_exports) || 0
        },
        charts: {
          revenueByMonth,
          exportsByStatus,
          topClients,
          shipmentMetrics
        },
        recentActivity
      }
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'Error retrieving dashboard analytics', { error: error.message });
    next(error);
  }
};

/**
 * GET /analytics/revenue?period=month|year
 * Get revenue analytics with granular breakdown
 */
export const getRevenueAnalytics = async (req, res, next) => {
  try {
    let { companyId } = req.user;
    if (req.hasOwnProperty('companyFilter')) {
      companyId = req.companyFilter;
    }
    const { period = 'month' } = req.query;

    const dateFormat = period === 'year' ? 'YYYY' : 'YYYY-MM';

    const revenueSQL = `
      SELECT
        TO_CHAR(ei.created_at, '${dateFormat}') as period,
        COUNT(*) as invoice_count,
        COALESCE(SUM(ei.total_amount), 0) as total_revenue,
        AVG(ei.total_amount) as avg_invoice_amount,
        COUNT(DISTINCT ei.client_name) as unique_clients
      FROM export_invoices ei
      WHERE ei.company_id = $1
      GROUP BY TO_CHAR(ei.created_at, '${dateFormat}')
      ORDER BY period DESC
    `;

    const result = await req.db.query(revenueSQL, [companyId]);

    debugLogger.info(CONTEXT, 'Revenue analytics retrieved', { companyId, period });

    res.json({
      success: true,
      data: {
        period,
        analytics: result.rows
      }
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'Error retrieving revenue analytics', { error: error.message });
    next(error);
  }
};

/**
 * GET /analytics/clients?limit=10
 * Get client performance metrics
 */
export const getClientAnalytics = async (req, res, next) => {
  try {
    let { companyId } = req.user;
    if (req.hasOwnProperty('companyFilter')) {
      companyId = req.companyFilter;
    }
    const { limit = 10 } = req.query;

    const clientSQL = `
      SELECT
        client_name as "clientName",
        COUNT(*) as invoice_count,
        COALESCE(SUM(ei.total_amount), 0) as total_spent,
        AVG(ei.total_amount) as avg_invoice_amount,
        MAX(ei.created_at) as last_order,
        COUNT(DISTINCT ei.country) as destinations
      FROM export_invoices ei
      WHERE ei.company_id = $1
      GROUP BY client_name
      ORDER BY total_spent DESC
      LIMIT $2
    `;

    const result = await req.db.query(clientSQL, [companyId, parseInt(limit)]);

    debugLogger.info(CONTEXT, 'Client analytics retrieved', { companyId });

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'Error retrieving client analytics', { error: error.message });
    next(error);
  }
};

/**
 * GET /analytics/export-status
 * Get detailed export status breakdown
 */
export const getExportStatusAnalytics = async (req, res, next) => {
  try {
    let { companyId } = req.user;
    if (req.hasOwnProperty('companyFilter')) {
      companyId = req.companyFilter;
    }

    const exportStatusSQL = `
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM export_invoices
      WHERE company_id = $1
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await req.db.query(exportStatusSQL, [companyId]);

    debugLogger.info(CONTEXT, 'Export status analytics retrieved', { companyId });

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'Error retrieving export status analytics', { error: error.message });
    next(error);
  }
};

/**
 * GET /analytics/payment-status
 * Get payment collection metrics
 */
export const getPaymentAnalytics = async (req, res, next) => {
  try {
    let { companyId } = req.user;
    if (req.hasOwnProperty('companyFilter')) {
      companyId = req.companyFilter;
    }

    const paymentQuery = `
      SELECT
        status as "paymentStatus",
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage,
        AVG(total_amount) as avg_amount
      FROM export_invoices
      WHERE company_id = $1
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await req.db.query(paymentQuery, [companyId]);

    debugLogger.info(CONTEXT, 'Payment analytics retrieved', { companyId });

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'Error retrieving payment analytics', { error: error.message });
    next(error);
  }
};

/**
 * GET /analytics/salesperson/:userId
 * Get performance metrics for a specific salesperson
 */
export const getSalespersonPerformance = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let { companyId } = req.user;
    if (req.hasOwnProperty('companyFilter')) {
      companyId = req.companyFilter;
    }

    // 1. Leads Metrics
    const leadsQuery = `
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status ILIKE 'won' OR status ILIKE 'Converted' THEN 1 END) as won_leads
      FROM leads
      WHERE assigned_to = $1 AND company_id = $2
    `;
    const leadsResult = await req.db.query(leadsQuery, [userId, companyId]);
    const { total_leads = 0, won_leads = 0 } = leadsResult.rows[0] || {};

    // 2. Sales Value Metrics (Invoices created by this user)
    const salesQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_TIMESTAMP) THEN total_amount ELSE 0 END), 0) as sales_this_month
      FROM export_invoices
      WHERE created_by = $1 AND company_id = $2
    `;
    const salesResult = await req.db.query(salesQuery, [userId, companyId]);
    const { total_sales = 0, sales_this_month = 0 } = salesResult.rows[0] || {};

    const conversionRate = total_leads > 0 ? ((won_leads / total_leads) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        leadsCreated: parseInt(total_leads),
        leadsConverted: parseInt(won_leads),
        conversionRate: `${conversionRate}%`,
        totalSales: parseFloat(total_sales),
        salesThisMonth: parseFloat(sales_this_month)
      }
    });
  } catch (error) {
    debugLogger.error(CONTEXT, 'Error retrieving salesperson performance', { error: error.message });
    next(error);
  }
};

export default {
  getDashboardAnalytics,
  getRevenueAnalytics,
  getClientAnalytics,
  getExportStatusAnalytics,
  getPaymentAnalytics,
  getSalespersonPerformance
};
