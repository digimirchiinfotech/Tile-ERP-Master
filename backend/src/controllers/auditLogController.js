import { successResponse, getPagination, paginationResponse } from '../utils/helpers.js';
import { debugLogger } from '../utils/debugLogger.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      resource_type,
      action,
      date_from,
      date_to,
      user_id
    } = req.query;

    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    // Must be bound to a company
    if (req.companyFilter !== undefined) {
      if (req.companyFilter === null) {
        conditions.push(`al.company_id IS NULL`);
      } else {
        conditions.push(`al.company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (resource_type) {
      conditions.push(`al.resource_type = $${paramCount}`);
      values.push(resource_type);
      paramCount++;
    }

    if (action) {
      conditions.push(`al.action = $${paramCount}`);
      values.push(action);
      paramCount++;
    }

    if (user_id) {
      conditions.push(`al.user_id = $${paramCount}`);
      values.push(user_id);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`al.created_at >= $${paramCount}`);
      values.push(date_from);
      paramCount++;
    }

    if (date_to) {
      // Add time to make it end of day if only date is provided
      const dateToValue = date_to.includes(':') ? date_to : `${date_to} 23:59:59`;
      conditions.push(`al.created_at <= $${paramCount}`);
      values.push(dateToValue);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // We use the globalQuery to access audit_logs, which is on the master DB
    const db = req.db.globalQuery || req.db.query;

    const countResult = await db(
      `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    if (total === 0) {
      return successResponse(res, paginationResponse([], 0, page, limit), 'No audit logs found');
    }

    const result = await db(
      `SELECT al.*, 
              u.first_name, u.last_name, u.email, u.role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    const enrichedLogs = result.rows.map(log => ({
      ...log,
      user_name: log.first_name ? `${log.first_name} ${log.last_name || ''}`.trim() : (log.email || 'System')
    }));

    return successResponse(
      res,
      paginationResponse(enrichedLogs, total, page, limit),
      'Audit logs retrieved successfully'
    );
  } catch (error) {
    debugLogger.error('AuditLogController: getAuditLogs failed', error.message);
    next(error);
  }
};
