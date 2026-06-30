import { AppError } from '../middleware/errorHandler.js';
import { debugLogger } from '../utils/debugLogger.js';
import { format } from 'date-fns';

/**
 * Escapes XML special characters
 */
const escapeXml = (unsafe) => {
  if (!unsafe) return '';
  return unsafe.toString().replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
};

/**
 * Generates Tally XML for Sales Vouchers
 */
export const exportSalesToTally = async (req, res, next) => {
  try {
    const companyId = req.companyFilter;
    const { from_date, to_date } = req.query;

    if (!from_date || !to_date) {
      return next(new AppError('from_date and to_date are required', 400));
    }

    // Fetch Export Invoices that are Finalized/Approved
    const invoicesRes = await req.db.query(
      `SELECT * FROM export_invoices 
       WHERE company_id = $1 
         AND invoice_date >= $2 AND invoice_date <= $3
         AND status IN ('Finalized', 'Dispatched', 'Sent', 'Active')
         AND deleted_at IS NULL
       ORDER BY invoice_date ASC, invoice_no ASC`,
      [companyId, from_date, to_date]
    );

    const invoices = invoicesRes.rows;

    let tallyXml = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>Export Company</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
`;

    for (const invoice of invoices) {
      const vchDate = format(new Date(invoice.invoice_date), 'yyyyMMdd');
      const vchNumber = escapeXml(invoice.invoice_no);
      const partyName = escapeXml(invoice.client_name);
      
      let amount = parseFloat(invoice.total_amount_inr || invoice.total_amount || 0).toFixed(2);
      
      tallyXml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${vchDate}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${vchNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Export Sales</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
`;
    }

    tallyXml += `      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=tally_sales_${from_date}_to_${to_date}.xml`);
    return res.status(200).send(tallyXml);

  } catch (error) {
    debugLogger.error('TallyExportError', 'Failed to export tally XML', error);
    next(error);
  }
};
