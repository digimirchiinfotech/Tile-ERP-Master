const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'backend', 'src', 'controllers');

function injectLogAction(file, matchFunc) {
  const filePath = path.join(controllersDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  if (!content.includes("import { logAction }")) {
    content = content.replace(/(import .*;\n)/, `$1import { logAction } from '../services/auditService.js';\n`);
    modified = true;
  }

  content = matchFunc(content);
  
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Injected logAction into ${file}`);
  }
}

// 1. packingListController
injectLogAction('packingListController.js', (content) => {
  return content
    // createOrUpdate
    .replace(/return successResponse\(res, result\.rows\[0\], 'Packing List saved successfully'\);/g, 
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: isUpdate ? 'UPDATE' : 'CREATE', entityType: 'packing_list', entityId: result.rows[0].id, newValue: { packing_list_no: result.rows[0].packing_list_no }, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, result.rows[0], 'Packing List saved successfully');`)
    // updateById
    .replace(/return successResponse\(res, result\.rows\[0\], 'Packing List updated successfully'\);/g,
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: 'UPDATE', entityType: 'packing_list', entityId: result.rows[0].id, newValue: { packing_list_no: result.rows[0].packing_list_no }, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, result.rows[0], 'Packing List updated successfully');`)
    // create
    .replace(/return successResponse\(res, result\.rows\[0\], 'Packing List created successfully'\);/g,
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: 'CREATE', entityType: 'packing_list', entityId: result.rows[0].id, newValue: { packing_list_no: result.rows[0].packing_list_no }, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, result.rows[0], 'Packing List created successfully');`)
    // remove
    .replace(/return successResponse\(res, null, 'Packing List deleted successfully'\);/g,
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: 'DELETE', entityType: 'packing_list', entityId: id, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, null, 'Packing List deleted successfully');`)
});

// 2. accountEntryController
injectLogAction('accountEntryController.js', (content) => {
  return content
    // create
    .replace(/return successResponse\(res, newEntry, 'Account entry created successfully'\);/g,
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: 'CREATE', entityType: 'account_entry', entityId: newEntry.id, newValue: { entry_number: newEntry.entry_number }, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, newEntry, 'Account entry created successfully');`)
    // update
    .replace(/return successResponse\(res, updatedEntry, 'Account entry updated successfully'\);/g,
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: 'UPDATE', entityType: 'account_entry', entityId: updatedEntry.id, newValue: { entry_number: updatedEntry.entry_number }, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, updatedEntry, 'Account entry updated successfully');`)
    // delete
    .replace(/return successResponse\(res, null, 'Account entry deleted successfully'\);/g,
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: 'DELETE', entityType: 'account_entry', entityId: req.params.id, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, null, 'Account entry deleted successfully');`)
});

// 3. purchaseOrderController
injectLogAction('purchaseOrderController.js', (content) => {
  return content
    // create
    .replace(/return successResponse\(res, result\.rows\[0\], 'Purchase order created successfully', 201\);/g,
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: 'CREATE', entityType: 'purchase_order', entityId: result.rows[0].id, newValue: { po_number: result.rows[0].po_number }, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, result.rows[0], 'Purchase order created successfully', 201);`)
    // update
    .replace(/return successResponse\(res, result\.rows\[0\], 'Purchase order updated successfully'\);/g,
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: 'UPDATE', entityType: 'purchase_order', entityId: result.rows[0].id, newValue: { po_number: result.rows[0].po_number }, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, result.rows[0], 'Purchase order updated successfully');`)
    // delete
    .replace(/return successResponse\(res, null, 'Purchase order deleted successfully'\);/g,
      `logAction({ userId: req.user?.id, companyId: req.companyFilter, action: 'DELETE', entityType: 'purchase_order', entityId: id, ipAddress: req.ip, userAgent: req.get('User-Agent'), method: req.method, url: req.originalUrl }, req.db).catch(e => console.error('Audit fail', e));\n    return successResponse(res, null, 'Purchase order deleted successfully');`)
});
