const fs = require('fs');
let c = fs.readFileSync('d:/Dev/143/143/frontend/src/components/proforma-invoice/InvoiceDashboard.jsx', 'utf8');

const regex = /<td data-label="Image">[\s\S]*?<Eye size=\{14\} \/>\s*<\/Button>/;

const replacement = `<td data-label="Image">
  {invoice.image ? (
    <img
      src={invoice.image}
      alt={invoice.clientName}
      style={{
        width: '50px',
        height: '50px',
        objectFit: 'cover',
        borderRadius: '4px',
      }}
    />
  ) : (
    <div
      style={{
        width: '50px',
        height: '50px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FileText size={24} color="#6c757d" />
    </div>
  )}
</td>
<td data-label="Client">{invoice.clientName || invoice.client_name || 'N/A'}</td>
<td data-label="Country">{invoice.country || 'N/A'}</td>
<td data-label="Pallets">{totals.pallets || 0}</td>
<td data-label="Quantity">{formatSQM(totals.sqm)}</td>
<td data-label="Amount">{formatPrice(totals.amount, invoice.currency)}</td>
<td data-label="Workflow" className="text-center">
  <Button
    variant="light"
    size="sm"
    className="text-info fw-bold d-inline-flex align-items-center justify-content-center border-0 shadow-sm"
    onClick={() => handleViewWorkflow(invoice)}
    title="View Workflow"
    style={{ width: '32px', height: '32px', borderRadius: '8px' }}
  >
    <BarChart3 size={16} />
  </Button>
</td>
<td className="text-end pe-4">
  <div className="d-flex justify-content-end gap-1">
    {canEdit && (
      <Button
        variant="outline"
        size="sm"
        className="text-primary border-primary-subtle"
        onClick={() => onEdit(invoice)}
        title={invoice.status === 'Revised' ? 'Cannot edit revised history' : 'Edit'}
        disabled={invoice.status === 'Revised'}
      >
        <Edit size={14} />
      </Button>
    )}
    <Button
      variant="outline"
      size="sm"
      className="text-info border-info-subtle"
      onClick={() => handleViewInvoice(invoice)}
      title="View Details"
    >
      <Eye size={14} />
    </Button>`;

c = c.replace(regex, replacement);
fs.writeFileSync('d:/Dev/143/143/frontend/src/components/proforma-invoice/InvoiceDashboard.jsx', c);
