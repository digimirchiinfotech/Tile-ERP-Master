import m from './src/config/database.js';
import * as controller from './src/controllers/exportInvoiceAnnexureController.js';

async function test() {
  const req = {
    params: { annexureId: '00000000-0000-0000-0000-000000000000' },
    db: { query: async () => ({ rows: [{
      id: '00000000-0000-0000-0000-000000000000',
      container_details: JSON.stringify([{lr_no: 'MOCK_LR_123'}])
    }] }) }
  };
  const res = {
    status: (code) => ({
      json: (data) => console.log(JSON.stringify(data, null, 2))
    })
  };
  const next = console.error;
  
  // mock ensureAnnexureSchema
  req.db.query = async (q) => {
    if (q.includes('information_schema')) return { rows: [] };
    if (q.includes('export_invoice_annexures a')) return { rows: [{
      id: '00000000-0000-0000-0000-000000000000',
      container_details: JSON.stringify([{lr_no: 'MOCK_LR_123'}])
    }] };
    if (q.includes('companies')) return { rows: [{}] };
    return { rows: [] };
  };

  await controller.getByAnnexureId(req, res, next);
}
test();
