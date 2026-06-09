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

export const getTemplate = async (req, res, next) => {
  try {
    const { templateType } = req.params;
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID not found' });

    const result = await req.db.query('SELECT * FROM pdf_templates WHERE company_id = $1 AND template_type = $2', [companyId, templateType]);
    if (result.rows.length === 0) return res.json({ success: true, data: getDefaultTemplate(templateType), message: 'Using default template' });

    res.json({ success: true, data: result.rows[0].template_config, message: 'Template retrieved successfully' });
  } catch (error) {
    next(error);
  }
};

export const saveTemplate = async (req, res, next) => {
  try {
    const { templateType } = req.params;
    const { templateConfig } = req.body;
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID not found' });

    const result = await req.db.query(
      `INSERT INTO pdf_templates (company_id, template_type, template_config)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id, template_type) 
       DO UPDATE SET template_config = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [companyId, templateType, JSON.stringify(templateConfig)]
    );

    res.json({ success: true, data: result.rows[0], message: 'Template saved successfully' });
  } catch (error) {
    next(error);
  }
};

export const resetTemplate = async (req, res, next) => {
  try {
    const { templateType } = req.params;
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID not found' });

    await req.db.query('DELETE FROM pdf_templates WHERE company_id = $1 AND template_type = $2', [companyId, templateType]);
    res.json({ success: true, data: getDefaultTemplate(templateType), message: 'Template reset to default' });
  } catch (error) {
    next(error);
  }
};

function getDefaultTemplate(templateType) {
  const common = {
    headerColor: '#003366',
    headerTextColor: '#FFFFFF',
    logoSize: { width: 80, height: 80 },
    pageSize: 'A4',
    orientation: 'portrait'
  };
  if (templateType === 'proforma_invoice') {
    return { ...common, title: 'PROFORMA INVOICE', footerText: 'Thank you for your business' };
  }
  if (templateType === 'proforma_order') {
    return { ...common, title: 'PURCHASE ORDER', footerText: 'For queries, contact us' };
  }
  return {};
}

export const exportTemplate = async (req, res, next) => {
  try {
    const { templateType } = req.params;
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID not found' });

    const result = await req.db.query('SELECT template_config FROM pdf_templates WHERE company_id = $1 AND template_type = $2', [companyId, templateType]);
    const config = result.rows.length > 0 ? result.rows[0].template_config : getDefaultTemplate(templateType);
    res.json({ success: true, data: config, filename: `${templateType}-template.json` });
  } catch (error) {
    next(error);
  }
};

export const importTemplate = async (req, res, next) => {
  try {
    const { templateType } = req.params;
    const { templateConfig } = req.body;
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) return res.status(400).json({ success: false, message: 'Company ID not found' });
    if (!templateConfig || typeof templateConfig !== 'object') return res.status(400).json({ success: false, message: 'Invalid template configuration' });

    const result = await req.db.query(
      `INSERT INTO pdf_templates (company_id, template_type, template_config)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id, template_type) 
       DO UPDATE SET template_config = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [companyId, templateType, JSON.stringify(templateConfig)]
    );

    res.json({ success: true, data: result.rows[0], message: 'Template imported successfully' });
  } catch (error) {
    next(error);
  }
};
