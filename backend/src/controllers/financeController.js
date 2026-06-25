import { AppError } from '../middleware/errorHandler.js';
import { debugLogger } from '../utils/debugLogger.js';

/**
 * Finance Controller - Core Double Entry System
 */

export const getChartOfAccounts = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user.companyId;
    const result = await req.db.query(
      `SELECT * FROM chart_of_accounts WHERE company_id = $1 AND is_active = TRUE ORDER BY code ASC`,
      [companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const createJournalEntry = async (req, res, next) => {
  const client = await req.db.getClient();
  try {
    const companyId = req.companyFilter || req.user.companyId;
    const { date, reference_type, reference_id, narration, lines } = req.body;
    
    // Validate Double-Entry logic: sum(debit) == sum(credit)
    const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return next(new AppError('Debits and Credits must balance', 400));
    }

    await client.query('BEGIN');
    
    // Create header
    const entryRes = await client.query(
      `INSERT INTO journal_entries (company_id, date, reference_type, reference_id, narration, posted_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [companyId, date, reference_type, reference_id, narration, req.user.id]
    );
    
    const entryId = entryRes.rows[0].id;

    // Create lines
    for (const line of lines) {
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, currency, exchange_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [entryId, line.account_id, line.debit || 0, line.credit || 0, line.currency || 'INR', line.exchange_rate || 1]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: entryRes.rows[0], message: 'Journal entry posted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const recordForexTransaction = async (req, res, next) => {
  try {
    const companyId = req.companyFilter || req.user.companyId;
    const { invoice_id, currency, amount, booking_rate, settlement_rate } = req.body;
    
    const gainLoss = (settlement_rate - booking_rate) * amount;
    
    const result = await req.db.query(
      `INSERT INTO forex_transactions (company_id, invoice_id, currency, amount, booking_rate, settlement_rate, gain_loss, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Settled') RETURNING *`,
      [companyId, invoice_id, currency, amount, booking_rate, settlement_rate, gainLoss]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
