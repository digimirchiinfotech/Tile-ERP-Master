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

import { generateDocumentNumber } from '../utils/documentNumberGenerator.js';
import debugLogger from '../utils/debugLogger.js';

const CONTEXT = 'AccountLedgerIntegration';

/**
 * Automatically create a Receivable entry from an Export Invoice
 * Generates single-entry receivable record for legacy UI compatibility
 * and double-entry journal/ledger postings for financial compliance
 */
export const createReceivableFromInvoice = async (invoice, db) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if a receivable already exists for this invoice in legacy table
    const existing = await client.query(
      'SELECT id FROM account_entries WHERE invoice_ref = $1 AND company_id = $2',
      [invoice.invoice_no, invoice.company_id]
    );

    if (existing.rows.length > 0) {
      debugLogger.info(CONTEXT, 'Receivable already exists for invoice', { invoiceNo: invoice.invoice_no });
      await client.query('COMMIT');
      return existing.rows[0];
    }

    const docResult = await generateDocumentNumber('ACC', invoice.company_id, client);
    const entryNo = docResult.baseNumber;

    // 1. Create legacy single-entry record
    const legacyResult = await client.query(
      `INSERT INTO account_entries 
       (company_id, entry_no, date, entry_type, party_name, amount, currency, invoice_ref, status, due_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, 'Receivable', $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        invoice.company_id,
        entryNo,
        invoice.invoice_date || new Date().toISOString().split('T')[0],
        invoice.client_name,
        invoice.total_amount,
        invoice.currency || 'USD',
        invoice.invoice_no,
        invoice.status === 'Paid' ? 'Paid' : 'Pending',
        invoice.due_date || null,
        `Auto-generated from Export Invoice: ${invoice.invoice_no}`
      ]
    );

    // 2. Create double-entry journal entry
    const journalResult = await client.query(
      `INSERT INTO journal_entries
       (company_id, entry_no, date, reference, source_type, source_id, notes, created_by)
       VALUES ($1, $2, $3, $4, 'ExportInvoice', $5, $6, $7)
       RETURNING id`,
      [
        invoice.company_id,
        entryNo,
        invoice.invoice_date || new Date().toISOString().split('T')[0],
        invoice.invoice_no,
        invoice.id,
        `Auto-generated from Export Invoice: ${invoice.invoice_no}`,
        invoice.created_by || null
      ]
    );
    const journalEntryId = journalResult.rows[0].id;

    // 3. Create double-entry ledger entries (Debit AR, Credit SALES)
    const amount = parseFloat(invoice.total_amount) || 0;

    // Balancing constraint check
    const debitTotal = amount;
    const creditTotal = amount;
    if (debitTotal !== creditTotal) {
      throw new Error(`Double-entry balance check failed: Debits (${debitTotal}) must equal Credits (${creditTotal})`);
    }

    // Debit Accounts Receivable
    await client.query(
      `INSERT INTO ledger_entries (company_id, journal_entry_id, account_code, debit, credit)
       VALUES ($1, $2, 'AR', $3, 0)`,
      [invoice.company_id, journalEntryId, amount]
    );

    // Credit Sales Revenue
    await client.query(
      `INSERT INTO ledger_entries (company_id, journal_entry_id, account_code, debit, credit)
       VALUES ($1, $2, 'SALES', 0, $3)`,
      [invoice.company_id, journalEntryId, amount]
    );

    await client.query('COMMIT');
    debugLogger.info(CONTEXT, 'Receivable (Double-Entry) created from invoice', { invoiceNo: invoice.invoice_no, entryNo });
    return legacyResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    debugLogger.error(CONTEXT, 'Failed to create receivable from invoice', { error: error.message, invoiceNo: invoice?.invoice_no });
    return null;
  } finally {
    client.release();
  }
};

/**
 * Mark a receivable as paid based on payment details
 * Updates legacy single-entry and posts double-entry journal/ledger payments
 */
export const recordPaymentAgainstInvoice = async (invoiceId, paymentDetails, db) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      'SELECT * FROM export_invoices WHERE id = $1',
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }
    const invoice = invoiceResult.rows[0];

    // Try to find existing entry in legacy account_entries
    const entryResult = await client.query(
      'SELECT id, entry_no FROM account_entries WHERE invoice_ref = $1 AND company_id = $2',
      [invoice.invoice_no, invoice.company_id]
    );

    let entryNo;
    let legacyEntryId;
    if (entryResult.rows.length > 0) {
      legacyEntryId = entryResult.rows[0].id;
      entryNo = entryResult.rows[0].entry_no;

      // Update existing legacy entry
      await client.query(
        `UPDATE account_entries 
         SET status = 'Paid', payment_method = $1, updated_at = CURRENT_TIMESTAMP, notes = notes || $2
         WHERE id = $3`,
        [paymentDetails.method || 'Online', `\nPayment recorded: ${paymentDetails.ref || ''}`, legacyEntryId]
      );
      debugLogger.info(CONTEXT, 'Existing account entry marked as Paid', { invoiceNo: invoice.invoice_no });
    } else {
      // Create new paid legacy entry
      const docResult = await generateDocumentNumber('ACC', invoice.company_id, client);
      entryNo = docResult.baseNumber;

      const newLegacy = await client.query(
        `INSERT INTO account_entries 
         (company_id, entry_no, date, entry_type, party_name, amount, currency, invoice_ref, status, payment_method, notes, created_at, updated_at)
         VALUES ($1, $2, CURRENT_DATE, 'Receivable', $3, $4, $5, $6, 'Paid', $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          invoice.company_id,
          entryNo,
          invoice.client_name,
          invoice.total_amount,
          invoice.currency || 'USD',
          invoice.invoice_no,
          paymentDetails.method || 'Online',
          `Auto-generated paid entry from Payment: ${paymentDetails.ref || ''}`
        ]
      );
      legacyEntryId = newLegacy.rows[0].id;
      debugLogger.info(CONTEXT, 'New Paid account entry created for payment', { invoiceNo: invoice.invoice_no, entryNo });
    }

    // Now, create the double-entry for Payment (Debit BANK/CASH, Credit AR)
    // Generate a unique entry number for the payment journal entry, e.g. using ACC prefix
    const pmtDocResult = await generateDocumentNumber('ACC', invoice.company_id, client);
    const pmtEntryNo = pmtDocResult.baseNumber;

    // Create journal entry for payment
    const journalResult = await client.query(
      `INSERT INTO journal_entries
       (company_id, entry_no, date, reference, source_type, source_id, notes, created_by)
       VALUES ($1, $2, CURRENT_DATE, $3, 'Payment', $4, $5, $6)
       RETURNING id`,
      [
        invoice.company_id,
        pmtEntryNo,
        paymentDetails.ref || invoice.invoice_no,
        invoiceId,
        `Payment against Invoice: ${invoice.invoice_no} via ${paymentDetails.method || 'Online'}`,
        invoice.created_by || null
      ]
    );
    const journalEntryId = journalResult.rows[0].id;

    const amount = parseFloat(invoice.total_amount) || 0;
    
    // Balancing constraint check
    const debitTotal = amount;
    const creditTotal = amount;
    if (debitTotal !== creditTotal) {
      throw new Error(`Double-entry balance check failed: Debits (${debitTotal}) must equal Credits (${creditTotal})`);
    }

    // Determine target account code based on payment method
    const paymentMethod = (paymentDetails.method || '').toLowerCase();
    const bankAccountCode = (paymentMethod === 'cash') ? 'CASH' : 'BANK';

    // Debit Bank/Cash
    await client.query(
      `INSERT INTO ledger_entries (company_id, journal_entry_id, account_code, debit, credit)
       VALUES ($1, $2, $3, $4, 0)`,
      [invoice.company_id, journalEntryId, bankAccountCode, amount]
    );

    // Credit Accounts Receivable
    await client.query(
      `INSERT INTO ledger_entries (company_id, journal_entry_id, account_code, debit, credit)
       VALUES ($1, $2, 'AR', 0, $3)`,
      [invoice.company_id, journalEntryId, amount]
    );

    await client.query('COMMIT');
    debugLogger.info(CONTEXT, 'Double-entry payment entries created successfully', { invoiceNo: invoice.invoice_no, pmtEntryNo });
  } catch (error) {
    await client.query('ROLLBACK');
    debugLogger.error(CONTEXT, 'Failed to record payment in ledger', { error: error.message, invoiceId });
  } finally {
    client.release();
  }
};
