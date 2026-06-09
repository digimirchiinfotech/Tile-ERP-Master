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

export const validateData = async (req, res, next) => {
  try {
    const { table } = req.params;
    const companyId = req.user.companyId;

    const allowedTables = ['products', 'clients', 'proforma_invoices'];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ success: false, message: 'Invalid table' });
    }

    // Example validation: Check for missing critical fields
    let validationQuery;
    switch (table) {
      case 'products':
        validationQuery = `SELECT id, name FROM products WHERE (name IS NULL OR product_code IS NULL) AND company_id = $1`;
        break;
      case 'clients':
        validationQuery = `SELECT id, name FROM clients WHERE (name IS NULL OR email IS NULL) AND company_id = $1`;
        break;
      default:
        return res.json({ success: true, message: 'No validation rules for this table' });
    }

    const result = await req.db.query(validationQuery, [companyId]);
    
    res.json({
      success: true,
      valid: result.rows.length === 0,
      issues: result.rows,
      message: result.rows.length === 0 ? 'Data is accurate' : `Found ${result.rows.length} issues`
    });
  } catch (error) {
    next(error);
  }
};
