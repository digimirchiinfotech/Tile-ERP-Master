import { AppError } from '../middleware/errorHandler.js';

/**
 * GST & Compliance Controller
 */

export const generateGSTR1 = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user.companyId;
    const { filing_period } = req.query; // format: '2026-06'
    
    // Aggregates B2B and Export invoices for the period
    const result = await req.db.query(
      `SELECT invoice_type, SUM(taxable_value) as total_taxable, SUM(igst_amount) as total_igst 
       FROM gstr1_records 
       WHERE company_id = $1 AND filing_period = $2 
       GROUP BY invoice_type`,
      [companyId, filing_period]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getActiveLUT = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user.companyId;
    const result = await req.db.query(
      `SELECT * FROM lut_tracking 
       WHERE company_id = $1 AND valid_to >= CURRENT_DATE 
       ORDER BY valid_to DESC LIMIT 1`,
      [companyId]
    );
    
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    next(error);
  }
};

export const getRODTEPRate = async (req, res, next) => {
  try {
    const { hs_code } = req.query;
    
    const result = await req.db.query(
      `SELECT * FROM rodtep_rates 
       WHERE hs_code = $1 AND CURRENT_DATE BETWEEN effective_from AND COALESCE(effective_to, '9999-12-31')`,
      [hs_code]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active RODTEP rate found for this HS Code' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
