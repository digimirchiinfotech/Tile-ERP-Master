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

/**
 * PDF Customization Service
 * Handles branding, templates, and professional styling for PDF exports
 */

const PDFBrandingConfig = {
  professional: {
    primaryColor: '#1e3a8a',
    accentColor: '#059669',
    fontFamily: 'Arial, sans-serif',
    headerHeight: '80px',
    footerHeight: '40px',
    logoUrl: '',
    companyName: 'SUN CORPORATION',
    companyAddress: 'Export Division',
    contactEmail: 'info@suncorp.com',
    contactPhone: '',
    website: 'www.suncorp.com'
  },
  minimal: {
    primaryColor: '#000000',
    accentColor: '#666666',
    fontFamily: 'Times New Roman, serif',
    headerHeight: '60px',
    footerHeight: '30px',
    logoUrl: '',
    companyName: 'COMPANY NAME',
    companyAddress: 'Address',
    contactEmail: 'email@company.com',
    contactPhone: '',
    website: 'www.company.com'
  },
  modern: {
    primaryColor: '#667eea',
    accentColor: '#764ba2',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    headerHeight: '100px',
    footerHeight: '50px',
    logoUrl: '',
    companyName: 'MODERN EXPORTS',
    companyAddress: 'Global Trade Division',
    contactEmail: 'trade@modern.com',
    contactPhone: '',
    website: 'www.modernexports.com'
  }
};

/**
 * Get branding configuration for a company
 * @param {string} template - Template name: 'professional', 'minimal', 'modern'
 * @param {object} customization - Custom overrides
 */
export const getBrandingConfig = (template = 'professional', customization = {}) => {
  const baseConfig = PDFBrandingConfig[template] || PDFBrandingConfig.professional;
  return {
    ...baseConfig,
    ...customization
  };
};

/**
 * Generate CSS for PDF styling
 */
export const generatePDFStyles = (branding) => {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
    
    :root {
      --primary-color: ${branding.primaryColor};
      --accent-color: ${branding.accentColor};
      --font-family: ${branding.fontFamily};
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-family);
      color: #333;
      line-height: 1.5;
    }

    .pdf-header {
      background-color: var(--primary-color);
      color: white;
      padding: 15px 20px;
      text-align: center;
      border-bottom: 3px solid var(--accent-color);
      margin-bottom: 20px;
    }

    .pdf-header h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 5px;
    }

    .pdf-header .company-subtitle {
      font-size: 12px;
      opacity: 0.9;
    }

    .pdf-footer {
      background-color: #f5f5f5;
      color: #666;
      padding: 10px 20px;
      text-align: center;
      font-size: 10px;
      border-top: 1px solid #ddd;
      margin-top: 20px;
    }

    .pdf-section-title {
      color: var(--primary-color);
      font-size: 14px;
      font-weight: 700;
      border-bottom: 2px solid var(--accent-color);
      padding-bottom: 8px;
      margin-top: 15px;
      margin-bottom: 10px;
    }

    .pdf-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }

    .pdf-table thead th {
      background-color: var(--primary-color);
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
    }

    .pdf-table tbody td {
      padding: 8px 10px;
      border-bottom: 1px solid #ddd;
      font-size: 10px;
    }

    .pdf-table tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    .pdf-table tbody tr.total-row {
      background-color: #f0f0f0;
      font-weight: 700;
      border-top: 2px solid var(--primary-color);
    }

    .pdf-badge {
      display: inline-block;
      background-color: var(--accent-color);
      color: white;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 700;
    }

    .pdf-info-box {
      background-color: #f0f7ff;
      border-left: 4px solid var(--primary-color);
      padding: 10px 15px;
      margin: 10px 0;
      font-size: 10px;
    }

    .pdf-two-col {
      display: flex;
      gap: 20px;
      margin: 10px 0;
    }

    .pdf-two-col > div {
      flex: 1;
    }

    .pdf-highlight {
      background-color: rgba(102, 126, 234, 0.1);
      border-left: 3px solid var(--accent-color);
      padding: 10px;
      margin: 10px 0;
    }

    @page {
      size: A4;
      margin: 10mm;
      @bottom-center {
        content: counter(page) " / " counter(pages);
      }
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  `;
};

/**
 * Generate PDF header with company branding
 */
export const generatePDFHeader = (branding, title, subtitle = '') => {
  return `
    <div class="pdf-header">
      <h1>${title}</h1>
      ${subtitle ? `<div class="company-subtitle">${subtitle}</div>` : ''}
      <div class="company-subtitle">From: ${branding.companyName}</div>
    </div>
  `;
};

/**
 * Generate PDF footer with contact information
 */
export const generatePDFFooter = (branding, documentType = 'Document') => {
  return `
    <div class="pdf-footer">
      <p>
        ${branding.companyName} | ${branding.companyAddress}<br/>
        Phone: ${branding.contactPhone} | Email: ${branding.contactEmail} | Web: ${branding.website}<br/>
        <strong>Generated on:</strong> ${new Date().toLocaleDateString('en-GB')} | <strong>Document Type:</strong> ${documentType}
      </p>
    </div>
  `;
};

/**
 * Apply branding to invoice HTML
 */
export const applyInvoiceBranding = (invoiceHTML, branding, documentType = 'Export Invoice') => {
  const styles = generatePDFStyles(branding);
  const header = generatePDFHeader(branding, documentType, 'Professional Export Document');
  const footer = generatePDFFooter(branding, documentType);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          ${styles}
        </style>
      </head>
      <body>
        ${header}
        <div class="pdf-content">
          ${invoiceHTML}
        </div>
        ${footer}
      </body>
    </html>
  `;
};

/**
 * Create a summary card for PDF display
 */
export const createSummaryCard = (data, branding) => {
  return `
    <div class="pdf-info-box">
      <div class="pdf-two-col">
        <div><strong>Invoice No:</strong> ${data.invoiceNo || 'N/A'}</div>
        <div><strong>Date:</strong> ${data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('en-GB') : 'N/A'}</div>
      </div>
      <div class="pdf-two-col">
        <div><strong>Client:</strong> ${data.clientName || 'N/A'}</div>
        <div><strong>Country:</strong> ${data.country || 'N/A'}</div>
      </div>
    </div>
  `;
};

/**
 * Create a watermark for draft documents
 */
export const createWatermark = (status = 'DRAFT') => {
  if (status === 'DRAFT') {
    return `
      <style>
        @media print {
          body::before {
            content: 'DRAFT';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(255, 0, 0, 0.1);
            z-index: -1;
            pointer-events: none;
          }
        }
      </style>
    `;
  }
  return '';
};

export default {
  PDFBrandingConfig,
  getBrandingConfig,
  generatePDFStyles,
  generatePDFHeader,
  generatePDFFooter,
  applyInvoiceBranding,
  createSummaryCard,
  createWatermark
};
