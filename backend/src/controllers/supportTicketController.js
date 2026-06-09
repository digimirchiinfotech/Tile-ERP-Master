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
import { AppError } from '../middleware/errorHandler.js';
import { 
  successResponse, 
  generateSequentialId, 
  getPagination, 
  paginationResponse 
} from '../utils/helpers.js';
import { notifyRoles, notifyUser } from '../services/notificationService.js';

/**
 * Self-healing helper: ensures support ticket tables exist in the current tenant database.
 */
const ensureSupportTablesExist = async (db) => {
  // No-op: Table creation and schema checks are strictly managed via migrations
};

export const getAll = async (req, res, next) => {
  try {
    // Ensure tables exist before querying
    await ensureSupportTablesExist(req.db);

    const { 
      page = 1, 
      limit = 50, 
      search, 
      status,
      category,
      priority,
      assigned_to
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    // Use companyFilter which correctly handles super_admin global vs specific company views
    // If super_admin, ALWAYS show all tickets globally regardless of selected company in top bar
    if (req.companyFilter !== null && req.user.role !== 'super_admin') {
      conditions.push(`t.company_id = $${paramCount}`);
      values.push(req.companyFilter);
      paramCount++;
    }

    // For super_admin, company_admin, and admin: show all tickets in company
    // For other roles: show tickets created by user OR assigned to user
    if (!['super_admin', 'company_admin', 'admin'].includes(req.user.role)) {
      conditions.push(`(t.created_by = $${paramCount} OR t.assigned_to = $${paramCount})`);
      values.push(req.user.id);
      paramCount++;
    }

    if (search) {
      conditions.push(`(t.ticket_id ILIKE $${paramCount} OR t.subject ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`t.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (category) {
      conditions.push(`t.category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (priority) {
      conditions.push(`t.priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (assigned_to) {
      conditions.push(`t.assigned_to = $${paramCount}`);
      values.push(assigned_to);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.globalQuery(
      `SELECT COUNT(*) FROM public.support_tickets t ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.globalQuery(
      `SELECT t.*
       FROM public.support_tickets t
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    const userIds = [...new Set(result.rows.flatMap(t => [t.created_by, t.assigned_to]).filter(Boolean))];
    let usersMap = {};
    if (userIds.length > 0) {
      const usersResult = await req.db.globalQuery(
        `SELECT id, name, email_id FROM public.users WHERE id = ANY($1)`,
        [userIds]
      );
      usersResult.rows.forEach(u => {
        usersMap[u.id] = u;
      });
    }

    const mappedRows = result.rows.map(t => ({
      ...t,
      userName: usersMap[t.created_by]?.name || null,
      email: usersMap[t.created_by]?.email_id || null,
      assignedToName: usersMap[t.assigned_to]?.name || null
    }));

    return successResponse(
      res,
      paginationResponse(mappedRows, total, page, limit),
      'Support tickets retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE t.id = $1';
    let queryParams = [id];

    // For super_admin, ALWAYS allow viewing any ticket globally regardless of selected company in top bar
    if (req.companyFilter !== null && req.user.role !== 'super_admin') {
      whereConditions += ` AND t.company_id = $${queryParams.length + 1}`;
      queryParams.push(req.companyFilter);
    }

    if (!['super_admin', 'company_admin', 'admin'].includes(req.user.role)) {
      whereConditions += ' AND (t.created_by = $2 OR t.assigned_to = $2)';
      queryParams.push(req.user.id);
    }

    const result = await req.db.globalQuery(
      `SELECT t.*
       FROM public.support_tickets t
       ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Support ticket not found', 404));
    }

    const ticket = result.rows[0];

    const userIds = [ticket.created_by, ticket.assigned_to].filter(Boolean);
    if (userIds.length > 0) {
      const usersResult = await req.db.globalQuery(
        `SELECT id, name, email_id FROM public.users WHERE id = ANY($1)`,
        [userIds]
      );
      const usersMap = {};
      usersResult.rows.forEach(u => {
        usersMap[u.id] = u;
      });
      ticket.userName = usersMap[ticket.created_by]?.name || null;
      ticket.email = usersMap[ticket.created_by]?.email_id || null;
      ticket.assignedToName = usersMap[ticket.assigned_to]?.name || null;
    } else {
      ticket.userName = null;
      ticket.email = null;
      ticket.assignedToName = null;
    }

    // Fetch comments for this ticket
    const commentsResult = await req.db.globalQuery(
      `SELECT * FROM public.ticket_comments 
       WHERE ticket_id = $1 
       ORDER BY created_at ASC`,
      [id]
    );
    
    ticket.comments = commentsResult.rows;

    return successResponse(
      res,
      ticket,
      'Support ticket retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req, res, next) => {
  try {
    let statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Open') as open,
        COUNT(*) FILTER (WHERE status = 'In Progress') as "inProgress",
        COUNT(*) FILTER (WHERE status = 'Resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'Closed') as closed,
        COUNT(*) FILTER (WHERE priority = 'High') as high,
        COUNT(*) FILTER (WHERE priority = 'Critical') as critical
      FROM public.support_tickets
    `;
    let queryParams = [];

    if (req.companyFilter !== null && req.user.role !== 'super_admin') {
      statsQuery += ` WHERE company_id = $1`;
      queryParams.push(req.companyFilter);
    }
    
    const result = await req.db.globalQuery(statsQuery, queryParams);
    
    return successResponse(res, result.rows[0], 'Ticket statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    // Ensure tables exist before creation
    await ensureSupportTablesExist(req.db);

    const {
      subject, description, category, priority = 'Medium', status = 'Open', assigned_to
    } = req.body;

    const companyId = req.user.companyId || req.companyFilter;
    if (!companyId && req.user.role !== 'super_admin') {
      return next(new AppError('Company context required to create ticket', 400));
    }
    // Sequential ID generation should be from global DB if tickets are global
    const ticketId = await generateSequentialId('TKT', 'support_tickets', 'ticket_id', companyId, { query: req.db.globalQuery });

    const result = await req.db.globalQuery(
      `INSERT INTO public.support_tickets 
       (company_id, ticket_id, subject, description, category, priority, status,
        assigned_to, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId, ticketId, subject, description, category || null,
        priority, status, assigned_to || null, req.user.id
      ]
    );

    const newTicket = result.rows[0];

    // Notify admins about the new ticket
    await notifyRoles(
      companyId,
      ['super_admin', 'admin', 'company_admin'],
      {
        title: 'New Support Ticket',
        message: `A new support ticket (${ticketId}) has been raised: ${subject}`,
        type: 'info',
        redirect_url: `/support-tickets`,
        module: 'Support',
        reference_id: newTicket.id,
        priority: priority.toLowerCase() === 'high' || priority.toLowerCase() === 'critical' ? 'high' : 'normal'
      },
      req.db
    );

    return successResponse(
      res,
      result.rows[0],
      'Support ticket created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      subject, description, category, priority, status, assigned_to, resolved_date
    } = req.body;

    let whereConditions = 'WHERE id = $1';
    let checkParams = [id];

    if (!['super_admin', 'company_admin', 'admin'].includes(req.user.role)) {
      whereConditions += ' AND (created_by = $2 OR assigned_to = $2)';
      checkParams.push(req.user.id);
    }

    const existingTicket = await req.db.globalQuery(
      `SELECT id, assigned_to, company_id, ticket_id FROM public.support_tickets ${whereConditions}`,
      checkParams
    );

    if (existingTicket.rows.length === 0) {
      return next(new AppError('Support ticket not found', 404));
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (subject !== undefined) {
      updates.push(`subject = $${paramCount}`);
      values.push(subject);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount}`);
      values.push(assigned_to);
      paramCount++;
    }

    if (resolved_date !== undefined) {
      updates.push(`resolved_date = $${paramCount}`);
      values.push(resolved_date);
      paramCount++;
    }

    if (updates.length === 0) {
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    if (!['super_admin', 'company_admin', 'admin'].includes(req.user.role)) {
      values.push(req.user.id);
      whereConditions = `WHERE id = $${paramCount} AND (created_by = $${paramCount + 1} OR assigned_to = $${paramCount + 1})`;
    } else {
      whereConditions = `WHERE id = $${paramCount}`;
    }

    const result = await req.db.globalQuery(
      `UPDATE public.support_tickets 
       SET ${updates.join(', ')}
       ${whereConditions}
       RETURNING *`,
      values
    );

    // If assigned_to changed, notify the newly assigned user
    const prevAssignee = existingTicket.rows[0].assigned_to;
    if (assigned_to !== undefined && assigned_to !== null && assigned_to !== prevAssignee) {
      await notifyUser(result.rows[0].company_id, assigned_to, {
        title: 'Ticket Assigned to You',
        message: `Support ticket (${result.rows[0].ticket_id}) has been assigned to you.`,
        type: 'info',
        redirect_url: `/support-tickets`,
        module: 'Support',
        reference_id: result.rows[0].id
      }, req.db);
    }

    return successResponse(
      res,
      result.rows[0],
      'Support ticket updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (!['super_admin', 'company_admin', 'admin'].includes(req.user.role)) {
      whereConditions += ' AND created_by = $2';
      queryParams.push(req.user.id);
    }

    const existingTicket = await req.db.globalQuery(
      `SELECT id FROM public.support_tickets ${whereConditions}`,
      queryParams
    );

    if (existingTicket.rows.length === 0) {
      return next(new AppError('Support ticket not found', 404));
    }

    const result = await req.db.globalQuery(
      `DELETE FROM public.support_tickets ${whereConditions} RETURNING id, ticket_id`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      'Support ticket deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (req.hasOwnProperty('companyFilter') && req.user.role !== 'super_admin') {
      if (req.companyFilter === null) {
        whereConditions += ` AND company_id IS NULL`;
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    if (!['super_admin', 'company_admin', 'admin'].includes(req.user.role)) {
      whereConditions += ` AND created_by = $${queryParams.length + 1}`;
      queryParams.push(req.user.id);
    }

    const existingTicket = await req.db.globalQuery(
      `SELECT id, ticket_id FROM public.support_tickets ${whereConditions}`,
      queryParams
    );

    if (existingTicket.rows.length === 0) {
      return next(new AppError('Support Ticket not found', 404));
    }

    await req.db.globalQuery(
      `DELETE FROM public.support_tickets ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingTicket.rows[0].id, ticket_id: existingTicket.rows[0].ticket_id },
      'Support Ticket permanently deleted'
    );
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const result = await req.db.globalQuery(
      `UPDATE public.support_tickets 
       SET status = $1, resolved_date = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, status === 'Resolved' || status === 'Closed' ? new Date() : null, id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Support ticket not found', 404));
    }

    const updatedTicket = result.rows[0];

    // Notify the creator about the status change
    await notifyUser(
      updatedTicket.company_id,
      updatedTicket.created_by,
      {
        title: `Ticket Status Updated`,
        message: `Your support ticket (${updatedTicket.ticket_id}) status is now ${status}`,
        type: 'info',
        redirect_url: `/support-tickets`,
        module: 'Support',
        reference_id: updatedTicket.id,
      },
      req.db
    );

    // Add status change comment if provided
    if (comment) {
      await req.db.globalQuery(
        `INSERT INTO public.ticket_comments (ticket_id, user_id, comment, author_name)
         VALUES ($1, $2, $3, $4)`,
        [id, req.user.id, `Status changed to ${status}: ${comment}`, req.user.name]
      );
    }

    return successResponse(res, result.rows[0], `Ticket status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, author_name } = req.body;

    // Fetch existing ticket to check status and routing
    const ticketResult = await req.db.globalQuery('SELECT * FROM public.support_tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      return next(new AppError('Support ticket not found', 404));
    }
    const ticket = ticketResult.rows[0];

    const result = await req.db.globalQuery(
      `INSERT INTO public.ticket_comments (ticket_id, user_id, comment, author_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.user.id, content, author_name || req.user.name]
    );

    let newStatus = ticket.status;
    // If the ticket is resolved and the creator (user) replies, reopen it
    if (ticket.status === 'Resolved' && req.user.id === ticket.created_by) {
      newStatus = 'Reopened';
    }

    // Update ticket's updated_at and potentially status
    await req.db.globalQuery(
      'UPDATE public.support_tickets SET updated_at = CURRENT_TIMESTAMP, status = $1 WHERE id = $2',
      [newStatus, id]
    );

    // Notifications logic
    try {
      // If user replies, notify super_admin or assigned_to
      if (req.user.id === ticket.created_by) {
        // notify super admins / assignees (for simplicity, we notify assignee if exists)
        if (ticket.assigned_to) {
          await notifyUser(ticket.company_id, ticket.assigned_to, {
            title: `New Reply on Ticket ${ticket.ticket_id}`,
            message: `${author_name || req.user.name} replied to the ticket.`,
            type: 'info',
            redirect_url: `/support-tickets`,
            module: 'Support',
            reference_id: ticket.id,
          }, req.db);
        }
      } else {
        // Admin replies, notify user
        await notifyUser(ticket.company_id, ticket.created_by, {
          title: `Admin Reply on Ticket ${ticket.ticket_id}`,
          message: `${author_name || req.user.name} responded to your ticket.`,
          type: 'success',
          redirect_url: `/support`,
          module: 'Support',
          reference_id: ticket.id,
        }, req.db);
      }
    } catch(err) { console.error('Notification error in addComment', err); }

    try {
      const { default: socketService } = await import('../services/socketService.js');
      if (socketService.getIo()) {
        socketService.getIo().emit('ticket_updated', { ticketId: ticket.ticket_id, id: ticket.id });
      }
    } catch(err) { console.error('Socket emit error in addComment', err); }

    return successResponse(res, result.rows[0], 'Comment added successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await req.db.globalQuery(
      `SELECT * FROM public.ticket_comments 
       WHERE ticket_id = $1 
       ORDER BY created_at ASC`,
      [id]
    );

    return successResponse(res, result.rows, 'Comments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  hardDelete,
  updateStatus,
  addComment,
  getComments,
  getStats
};
