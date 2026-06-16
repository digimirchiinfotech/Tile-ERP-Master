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

import { AppError } from '../middleware/errorHandler.js';
import { 
  successResponse, 
  generateSequentialId, 
  getPagination, 
  paginationResponse,
  normalizeEmptyToNull 
} from '../utils/helpers.js';
import { notificationService } from '../services/notificationService.js';

export const getAll = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      status, 
      source, 
      priority, 
      assigned_to 
    } = req.query;
    const { limit: pageLimit, offset } = getPagination(page, limit);

    let conditions = [];
    let values = [];
    let paramCount = 1;

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        conditions.push(`l.company_id IS NULL`);
      } else {
        conditions.push(`l.company_id = $${paramCount}`);
        values.push(req.companyFilter);
        paramCount++;
      }
    }

    if (search) {
      conditions.push(`(l.company_name ILIKE $${paramCount} OR l.contact_person_name ILIKE $${paramCount} OR l.email_id ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`l.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (source) {
      conditions.push(`l.source = $${paramCount}`);
      values.push(source);
      paramCount++;
    }

    if (priority) {
      conditions.push(`l.priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (assigned_to) {
      conditions.push(`l.assigned_to = $${paramCount}`);
      values.push(assigned_to);
      paramCount++;
    }

    // Exclude soft-deleted records unless explicitly requesting deleted records
    if (status !== 'Deleted') {
      conditions.push(`l.status != 'Deleted'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM leads l ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await req.db.query(
      `SELECT 
        l.*,
        u.name as assigned_to_name
       FROM leads l
       LEFT JOIN public.users u ON l.assigned_to = u.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, pageLimit, offset]
    );

    return successResponse(
      res,
      paginationResponse(result.rows, total, page, limit),
      'Leads retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE l.id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND l.company_id IS NULL';
      } else {
        whereConditions += ' AND l.company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const result = await req.db.query(
      `SELECT 
        l.*,
        u.name as assigned_to_name
       FROM leads l
       LEFT JOIN public.users u ON l.assigned_to = u.id
       ${whereConditions}`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Lead not found', 404));
    }

    return successResponse(
      res,
      result.rows[0],
      'Lead retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const {
      company_name, contact_person_name, email_id, contact_number, address, city, country,
      source, priority = 'Medium', status = 'New', product_interest,
      expected_value, timeline, assigned_to, notes
    } = req.body;

    // Use req.companyFilter which is already validated by auth middleware
    const companyId = req.companyFilter;

    if (!companyId) {
      return next(new AppError('Company context is required. Please select a company.', 400));
    }

    const leadId = await generateSequentialId('LEAD', 'leads', 'lead_id', companyId, req.db);

    const insertResult = await req.db.query(
      `INSERT INTO leads 
       (company_id, lead_id, name, company_name, contact_person_name, email_id, contact_number, address, 
        city, country, source, priority, status, product_interest, expected_value,
        timeline, assigned_to, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        companyId, leadId, normalizeEmptyToNull(company_name), normalizeEmptyToNull(contact_person_name), normalizeEmptyToNull(email_id),
        normalizeEmptyToNull(contact_number), normalizeEmptyToNull(address), normalizeEmptyToNull(city), normalizeEmptyToNull(country), normalizeEmptyToNull(source),
        priority || 'Medium', status || 'New', normalizeEmptyToNull(product_interest), normalizeEmptyToNull(expected_value),
        normalizeEmptyToNull(timeline), normalizeEmptyToNull(assigned_to), normalizeEmptyToNull(notes), req.user.id
      ]
    );

    const insertedId = insertResult.rows[0].id;
    const result = await req.db.query(
      `SELECT l.*, u.name as assigned_to_name 
       FROM leads l 
       LEFT JOIN public.users u ON l.assigned_to = u.id 
       WHERE l.id = $1`,
      [insertedId]
    );

    // Notify assigned salesperson
    if (assigned_to) {
      await notificationService.notifyUser(companyId, assigned_to, {
        title: 'New Lead Assigned',
        message: `New lead ${leadId} (${company_name}) has been assigned to you`,
        type: 'info',
        redirect_url: `/leads-dashboard?id=${result.rows[0].id}`,
        module: 'Lead'
      }, req.db);
    }

    return successResponse(
      res,
      result.rows[0],
      'Lead created successfully',
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
      company_name, contact_person_name, email_id, contact_number, address, city, country,
      source, priority, status, product_interest, expected_value,
      timeline, assigned_to, notes
    } = req.body;

    let whereConditions = 'WHERE id = $1';
    let checkParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        checkParams.push(req.companyFilter);
      }
    }

    const existingLead = await req.db.query(
      `SELECT id FROM leads ${whereConditions}`,
      checkParams
    );

    if (existingLead.rows.length === 0) {
      return next(new AppError('Lead not found', 404));
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (company_name !== undefined) {
      updates.push(`company_name = $${paramCount}`);
      updates.push(`name = $${paramCount}`);
      values.push(normalizeEmptyToNull(company_name));
      paramCount++;
    }

    if (contact_person_name !== undefined) {
      updates.push(`contact_person_name = $${paramCount}`);
      values.push(normalizeEmptyToNull(contact_person_name));
      paramCount++;
    }

    if (email_id !== undefined) {
      updates.push(`email_id = $${paramCount}`);
      values.push(normalizeEmptyToNull(email_id));
      paramCount++;
    }

    if (contact_number !== undefined) {
      updates.push(`contact_number = $${paramCount}`);
      values.push(normalizeEmptyToNull(contact_number));
      paramCount++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      values.push(normalizeEmptyToNull(address));
      paramCount++;
    }

    if (city !== undefined) {
      updates.push(`city = $${paramCount}`);
      values.push(normalizeEmptyToNull(city));
      paramCount++;
    }

    if (country !== undefined) {
      updates.push(`country = $${paramCount}`);
      values.push(normalizeEmptyToNull(country));
      paramCount++;
    }

    if (source !== undefined) {
      updates.push(`source = $${paramCount}`);
      values.push(normalizeEmptyToNull(source));
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

    if (product_interest !== undefined) {
      updates.push(`product_interest = $${paramCount}`);
      values.push(normalizeEmptyToNull(product_interest));
      paramCount++;
    }

    if (expected_value !== undefined) {
      updates.push(`expected_value = $${paramCount}`);
      values.push(expected_value);
      paramCount++;
    }

    if (timeline !== undefined) {
      updates.push(`timeline = $${paramCount}`);
      values.push(normalizeEmptyToNull(timeline));
      paramCount++;
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount}`);
      values.push(normalizeEmptyToNull(assigned_to));
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(normalizeEmptyToNull(notes));
      paramCount++;
    }

    if (updates.length === 0) {
      return next(new AppError('No fields to update', 400));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const companyId = req.companyFilter;
    values.push(id);
    
    let companyCondition = '';
    if (companyId === null) {
      companyCondition = 'AND company_id IS NULL';
    } else {
      companyCondition = `AND company_id = $${paramCount + 1}`;
      values.push(companyId);
    }

    await req.db.query(
      `UPDATE leads 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} ${companyCondition}
       RETURNING id`,
      values
    );

    const result = await req.db.query(
      `SELECT l.*, u.name as assigned_to_name 
       FROM leads l 
       LEFT JOIN public.users u ON l.assigned_to = u.id 
       WHERE l.id = $1`,
      [id]
    );

    const updatedLead = result.rows[0];

    // Notify assigned salesperson if changed or newly assigned
    if (assigned_to && updatedLead.assigned_to) {
      await notificationService.notifyUser(companyId, updatedLead.assigned_to, {
        title: 'Lead Updated/Assigned',
        message: `Lead ${updatedLead.lead_id} (${updatedLead.company_name}) has been updated or assigned to you`,
        type: 'info',
        redirect_url: `/leads-dashboard?id=${updatedLead.id}`,
        module: 'Lead'
      }, req.db);
    }

    return successResponse(
      res,
      updatedLead,
      'Lead updated successfully'
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

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingLead = await req.db.query(
      `SELECT id FROM leads ${whereConditions}`,
      queryParams
    );

    if (existingLead.rows.length === 0) {
      return next(new AppError('Lead not found', 404));
    }

    queryParams.push('Lost');
    const result = await req.db.query(
      `UPDATE leads 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING id, lead_id`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      'Lead deleted successfully'
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

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingLead = await req.db.query(
      `SELECT id, lead_id FROM leads ${whereConditions}`,
      queryParams
    );

    if (existingLead.rows.length === 0) {
      return next(new AppError('Lead not found', 404));
    }

    await req.db.query(
      `DELETE FROM leads ${whereConditions}`,
      queryParams
    );

    return successResponse(
      res,
      { id: existingLead.rows[0].id, lead_id: existingLead.rows[0].lead_id },
      'Lead permanently deleted'
    );
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const existingLead = await req.db.query(
      `SELECT id, status FROM leads ${whereConditions}`,
      queryParams
    );

    if (existingLead.rows.length === 0) {
      return next(new AppError('Lead not found', 404));
    }

    const currentStatus = existingLead.rows[0].status;
    const activeStatuses = ['New', 'Contacted', 'Qualified'];
    
    const newStatus = activeStatuses.includes(currentStatus) ? 'Lost' : 'New';

    queryParams.push(newStatus);
    const result = await req.db.query(
      `UPDATE leads 
       SET status = $${queryParams.length}, updated_at = CURRENT_TIMESTAMP
       ${whereConditions}
       RETURNING *`,
      queryParams
    );

    return successResponse(
      res,
      result.rows[0],
      `Lead status changed to ${newStatus}`
    );
  } catch (error) {
    next(error);
  }
};

export const convertToClient = async (req, res, next) => {
  const client = await req.db.getClient();
  
  try {
    const { id } = req.params;
    const { assigned_salesperson } = req.body;

    await client.query('BEGIN');

    let whereConditions = 'WHERE id = $1';
    let queryParams = [id];

    if (Object.hasOwn(req, 'companyFilter')) {
      if (req.companyFilter === null) {
        whereConditions += ' AND company_id IS NULL';
      } else {
        whereConditions += ' AND company_id = $2';
        queryParams.push(req.companyFilter);
      }
    }

    const leadResult = await client.query(
      `SELECT * FROM leads ${whereConditions}`,
      queryParams
    );

    if (leadResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError('Lead not found', 404));
    }

    const lead = leadResult.rows[0];

    if (lead.status === 'Won') {
      await client.query('ROLLBACK');
      return next(new AppError('This lead has already been converted to a client', 400));
    }

    const clientId = await generateSequentialId('CLI', 'clients', 'client_id', lead.company_id, req.db);

    const clientResult = await client.query(
      `INSERT INTO clients 
       (company_id, client_id, client_name, contact_person_name, email_id, contact_number, address, 
        city, country, assigned_salesperson, status, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        lead.company_id, clientId, lead.company_name, lead.contact_person_name,
        lead.email_id, lead.contact_number, lead.address, lead.city, lead.country,
        assigned_salesperson || lead.assigned_to, 'Active',
        `Converted from lead ${lead.lead_id}. ${lead.notes || ''}`.trim(),
        req.user.id
      ]
    );

    await client.query(
      `UPDATE leads 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      ['Won', id]
    );

    // Notify managers about new client conversion
    await notificationService.notifyRoles(lead.company_id, ['company_admin', 'admin'], {
      title: 'Lead Converted to Client',
      message: `Lead ${lead.lead_id} (${lead.company_name}) has been converted to Client ${clientId}`,
      type: 'success',
      redirect_url: `/client-dashboard`,
      module: 'Client'
    }, req.db);

    await client.query('COMMIT');

    return successResponse(
      res,
      {
        client: clientResult.rows[0],
        lead: { id: lead.id, lead_id: lead.lead_id, status: 'Won' }
      },
      'Lead converted to client successfully',
      201
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
