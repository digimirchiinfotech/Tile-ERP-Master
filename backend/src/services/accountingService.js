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

/**
 * ERP Accounting Service - Phase 1 Implementation
 * Handles double-entry ledger postings, transaction boundaries, and balance calculation.
 */

export const postInvoiceFinalized = async (db, companyId, invoiceId, clientId, amount, currency, userId) => {
    // Requires a DB transaction block wrapping this call from the controller
    
    // 1. Get Accounts
    const salesAccountRes = await db.query(
        `SELECT id FROM master_accounts WHERE company_id = $1 AND code = 'SALES' LIMIT 1`,
        [companyId]
    );
    const receivablesAccountRes = await db.query(
        `SELECT id FROM master_accounts WHERE company_id = $1 AND code = 'AR' LIMIT 1`,
        [companyId]
    );

    if (salesAccountRes.rows.length === 0 || receivablesAccountRes.rows.length === 0) {
        throw new AppError('Chart of Accounts not configured properly for Sales/AR', 500);
    }

    const salesAccountId = salesAccountRes.rows[0].id;
    const arAccountId = receivablesAccountRes.rows[0].id;

    // 2. Post to General Ledger (Double Entry)
    // Debit AR
    await db.query(`
        INSERT INTO general_ledger 
        (company_id, account_id, transaction_date, voucher_type, voucher_ref, debit, credit, currency, created_by)
        VALUES ($1, $2, CURRENT_DATE, 'SalesInvoice', $3, $4, 0, $5, $6)
    `, [companyId, arAccountId, invoiceId, amount, currency, userId]);

    // Credit Sales
    await db.query(`
        INSERT INTO general_ledger 
        (company_id, account_id, transaction_date, voucher_type, voucher_ref, debit, credit, currency, created_by)
        VALUES ($1, $2, CURRENT_DATE, 'SalesInvoice', $3, 0, $4, $5, $6)
    `, [companyId, salesAccountId, invoiceId, amount, currency, userId]);

    // 3. Post to Customer Ledger
    // Fetch previous running balance
    const lastBalanceRes = await db.query(`
        SELECT running_balance FROM customer_ledgers 
        WHERE company_id = $1 AND client_id = $2
        ORDER BY created_at DESC LIMIT 1
    `, [companyId, clientId]);

    let previousBalance = 0;
    if (lastBalanceRes.rows.length > 0) {
        previousBalance = parseFloat(lastBalanceRes.rows[0].running_balance);
    }

    const newBalance = previousBalance + parseFloat(amount); // Debit increases customer balance

    await db.query(`
        INSERT INTO customer_ledgers
        (company_id, client_id, transaction_date, voucher_type, voucher_ref, debit, credit, running_balance, currency, created_by)
        VALUES ($1, $2, CURRENT_DATE, 'SalesInvoice', $3, $4, 0, $5, $6, $7)
    `, [companyId, clientId, invoiceId, amount, newBalance, currency, userId]);
};

export const postPaymentReceived = async (db, companyId, paymentId, clientId, bankAccountId, amount, currency, userId) => {
    // Requires a DB transaction block wrapping this call from the controller

    // 1. Get Accounts
    const receivablesAccountRes = await db.query(
        `SELECT id FROM master_accounts WHERE company_id = $1 AND code = 'AR' LIMIT 1`,
        [companyId]
    );

    if (receivablesAccountRes.rows.length === 0) {
        throw new AppError('Chart of Accounts not configured properly for AR', 500);
    }
    const arAccountId = receivablesAccountRes.rows[0].id;

    // 2. Post to General Ledger (Double Entry)
    // Debit Bank/Cash
    await db.query(`
        INSERT INTO general_ledger 
        (company_id, account_id, transaction_date, voucher_type, voucher_ref, debit, credit, currency, created_by)
        VALUES ($1, $2, CURRENT_DATE, 'Receipt', $3, $4, 0, $5, $6)
    `, [companyId, bankAccountId, paymentId, amount, currency, userId]);

    // Credit AR
    await db.query(`
        INSERT INTO general_ledger 
        (company_id, account_id, transaction_date, voucher_type, voucher_ref, debit, credit, currency, created_by)
        VALUES ($1, $2, CURRENT_DATE, 'Receipt', $3, 0, $4, $5, $6)
    `, [companyId, arAccountId, paymentId, amount, currency, userId]);

    // 3. Post to Customer Ledger
    const lastBalanceRes = await db.query(`
        SELECT running_balance FROM customer_ledgers 
        WHERE company_id = $1 AND client_id = $2
        ORDER BY created_at DESC LIMIT 1
    `, [companyId, clientId]);

    let previousBalance = 0;
    if (lastBalanceRes.rows.length > 0) {
        previousBalance = parseFloat(lastBalanceRes.rows[0].running_balance);
    }

    const newBalance = previousBalance - parseFloat(amount); // Credit decreases customer balance

    await db.query(`
        INSERT INTO customer_ledgers
        (company_id, client_id, transaction_date, voucher_type, voucher_ref, debit, credit, running_balance, currency, created_by)
        VALUES ($1, $2, CURRENT_DATE, 'Receipt', $3, 0, $4, $5, $6, $7)
    `, [companyId, clientId, paymentId, amount, newBalance, currency, userId]);
};
