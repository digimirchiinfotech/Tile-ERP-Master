import { eventBus, DomainEvents } from '../utils/eventBus.js';
import { debugLogger } from '../utils/debugLogger.js';
import masterPool from '../config/masterDatabase.js';

export const initFinanceSubscribers = () => {
  eventBus.on(DomainEvents.INVOICE_FINALIZED, async ({ companyId, invoiceId, totalAmount, clientId, userId }) => {
    debugLogger.info('[FinanceSubscriber]', `Processing INVOICE_FINALIZED for invoice: ${invoiceId}`);
    
    // In a real multi-tenant scenario, we should get the tenant's DB pool.
    // For simplicity, we assume we can query via masterPool if we set app.current_company_id,
    // or use a utility function. We will use the masterPool and inject tenant context.
    const client = await masterPool.connect();
    
    try {
      await client.query('BEGIN');
      
      if (companyId) {
        await client.query("SELECT set_config('app.current_company_id', $1, false)", [companyId]);
      }
      
      // Auto-post double entry: Debit Accounts Receivable, Credit Sales Revenue
      // Assuming Account ID 100 = AR, 200 = Sales (these would normally be fetched from chart_of_accounts)
      const narration = `Auto-generated entry for Finalized Invoice ${invoiceId}`;
      
      const entryRes = await client.query(
        `INSERT INTO journal_entries (company_id, date, reference_type, reference_id, narration, posted_by)
         VALUES ($1, CURRENT_DATE, 'EXPORT_INVOICE', $2, $3, $4) RETURNING id`,
        [companyId, invoiceId, narration, userId]
      );
      
      const entryId = entryRes.rows[0].id;

      // AR Debit
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, currency, exchange_rate)
         VALUES ($1, 100, $2, 0, 'INR', 1)`,
        [entryId, totalAmount]
      );

      // Sales Credit
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, currency, exchange_rate)
         VALUES ($1, 200, 0, $2, 'INR', 1)`,
        [entryId, totalAmount]
      );
      
      await client.query('COMMIT');
      debugLogger.info('[FinanceSubscriber]', `Journal Entry ${entryId} posted for invoice ${invoiceId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      debugLogger.error('[FinanceSubscriber]', `Failed to post Journal Entry for invoice ${invoiceId}: ${error.message}`);
    } finally {
      if (companyId) {
         await client.query(`RESET app.current_company_id`).catch(e => console.error('[SILENT_CATCH_FIXED]', e.message));
      }
      client.release();
    }
  });
};
