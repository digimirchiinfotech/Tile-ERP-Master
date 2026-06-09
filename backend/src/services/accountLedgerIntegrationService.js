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
 */
export const createReceivableFromInvoice = async (invoice, db) => {
  try {
    // Check if a receivable already exists for this invoice
    const existing = await db.query(
      'SELECT id FROM account_entries WHERE invoice_ref = $1 AND company_id = $2',
      [invoice.invoice_no, invoice.company_id]
    );

    if (existing.rows.length > 0) {
      debugLogger.info(CONTEXT, 'Receivable already exists for invoice', { invoiceNo: invoice.invoice_no });
      return existing.rows[0];
    }

    const docResult = await generateDocumentNumber('ACC', invoice.company_id, db);
    const entryNo = docResult.baseNumber;

    const result = await db.query(
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

    debugLogger.info(CONTEXT, 'Receivable created from invoice', { invoiceNo: invoice.invoice_no, entryNo });
    return result.rows[0];
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to create receivable from invoice', { error: error.message, invoiceNo: invoice?.invoice_no });
    // Don't throw to prevent breaking the invoice creation flow
    return null;
  }
};

/**
 * Mark a receivable as paid based on payment details
 */
export const recordPaymentAgainstInvoice = async (invoiceId, paymentDetails, db) => {
  try {
    const invoiceResult = await db.query(
      'SELECT * FROM export_invoices WHERE id = $1',
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) return null;
    const invoice = invoiceResult.rows[0];

    // Try to find existing entry
    const entryResult = await db.query(
      'SELECT id FROM account_entries WHERE invoice_ref = $1 AND company_id = $2',
      [invoice.invoice_no, invoice.company_id]
    );

    if (entryResult.rows.length > 0) {
      // Update existing entry
      await db.query(
        `UPDATE account_entries 
         SET status = 'Paid', payment_method = $1, updated_at = CURRENT_TIMESTAMP, notes = notes || $2
         WHERE id = $3`,
        [paymentDetails.method || 'Online', `\nPayment recorded: ${paymentDetails.ref || ''}`, entryResult.rows[0].id]
      );
      debugLogger.info(CONTEXT, 'Existing account entry marked as Paid', { invoiceNo: invoice.invoice_no });
    } else {
      // Create new paid entry
      const docResult = await generateDocumentNumber('ACC', invoice.company_id, db);
      const entryNo = docResult.baseNumber;

      await db.query(
        `INSERT INTO account_entries 
         (company_id, entry_no, date, entry_type, party_name, amount, currency, invoice_ref, status, payment_method, notes, created_at, updated_at)
         VALUES ($1, $2, CURRENT_DATE, 'Receivable', $3, $4, $5, $6, 'Paid', $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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
      debugLogger.info(CONTEXT, 'New Paid account entry created for payment', { invoiceNo: invoice.invoice_no, entryNo });
    }
  } catch (error) {
    debugLogger.error(CONTEXT, 'Failed to record payment in ledger', { error: error.message, invoiceId });
  }
};
