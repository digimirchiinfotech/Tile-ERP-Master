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

import api from '../services/api';

export const generatePDF = async (element, filename, options = {}) => {
  const {
    format = 'A4',
  } = options;

  try {
    // Wait for all images to load before capturing
    const images = element.querySelectorAll('img');
    const imageLoadPromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Resolve even on error to not block the process
        setTimeout(resolve, 3000); // Timeout after 3 seconds
      });
    });

    await Promise.all(imageLoadPromises);

    // Extract all styles to ensure the backend renders it correctly
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    // Remove any scripts from the cloned element to prevent execution in puppeteer
    const clonedElement = element.cloneNode(true);

    // Force absolute URLs for images so Puppeteer can load them
    const originalImages = element.querySelectorAll('img');
    const clonedImages = clonedElement.querySelectorAll('img');
    clonedImages.forEach((img, index) => {
      if (originalImages[index] && originalImages[index].src) {
        img.setAttribute('src', originalImages[index].src);
      }
    });

    const scripts = clonedElement.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <base href="${window.location.origin}/">
          ${styles}
          <style>
            body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            /* Force visible overflow for print to prevent clipping */
            * { overflow: visible !important; }
          </style>
        </head>
        <body>
          ${clonedElement.outerHTML}
        </body>
      </html>
    `;

    // Send to backend Puppeteer service asynchronously
    const response = await api.post('/pdf/generate', {
      html: fullHtml,
      filename: filename,
      format: format
    });

    if (response.status === 202 && response.data.taskId) {
      const { taskId } = response.data;
      
      // Poll the backend until the PDF is ready
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusRes = await api.get(`/pdf/status/${taskId}`);
        if (statusRes.data.status === 'completed') {
          // Now fetch the actual PDF blob
          const pdfRes = await api.get(`/pdf/download/${taskId}`, { responseType: 'blob' });
          return pdfRes.data;
        } else if (statusRes.data.status === 'failed') {
          throw new Error(statusRes.data.error || 'PDF generation failed on server');
        }
      }
    }

    // Fallback for older backend if any
    if (response.data instanceof Blob) {
       return response.data;
    }
    
    throw new Error('Unexpected response format from PDF service');
  } catch (error) {
    console.error('Error generating PDF via backend:', error);
    throw new Error('Failed to generate PDF: ' + (error.response?.data?.message || error.message));
  }
};

export const downloadPDF = async (element, filename, options = {}) => {
  try {
    const blob = await generatePDF(element, filename, options);

    // Create a download link for the blob
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true, message: 'PDF downloaded successfully' };
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, message: error.message };
  }
};

export const previewPDF = async (element, options = {}) => {
  try {
    const blob = await generatePDF(element, 'preview.pdf', options);
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.zIndex = '10000';
    iframe.style.backgroundColor = '#525659';
    iframe.src = url;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕ Close Preview';
    closeButton.style.position = 'fixed';
    closeButton.style.top = '20px';
    closeButton.style.right = '20px';
    closeButton.style.zIndex = '10001';
    closeButton.style.padding = '12px 24px';
    closeButton.style.backgroundColor = '#dc3545';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '6px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';

    closeButton.onmouseover = () => {
      closeButton.style.backgroundColor = '#c82333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.backgroundColor = '#dc3545';
    };

    closeButton.onclick = () => {
      document.body.removeChild(iframe);
      document.body.removeChild(closeButton);
      URL.revokeObjectURL(url);
    };

    document.body.appendChild(iframe);
    document.body.appendChild(closeButton);

    return { success: true, message: 'PDF preview opened in preview mode' };
  } catch (error) {
    console.error('Preview error:', error);
    return { success: false, message: error.message };
  }
};

export const validatePDFStructure = (documentData, templateType) => {
  const errors = [];
  const warnings = [];

  if (templateType === 'proforma_invoice') {
    if (!documentData.invoiceNo) errors.push('Invoice number is required');
    if (!documentData.date) errors.push('Invoice date is required');
    if (!documentData.client || !documentData.consignee) {
      errors.push('Client/Consignee information is required');
    }
    if (!documentData.productLines || documentData.productLines.length === 0) {
      errors.push('At least one product line is required');
    }
    if (!documentData.totalAmount || documentData.totalAmount <= 0) {
      errors.push('Total amount must be greater than zero');
    }

    if (!documentData.tariffCode) warnings.push('Tariff code is recommended');
    if (!documentData.portOfDischarge) warnings.push('Port of discharge is recommended');
    if (!documentData.buyerOrderNo) warnings.push('Buyer order number is recommended for complete documentation');
    if (!documentData.paymentTerms) warnings.push('Payment terms are recommended');
    if (!documentData.deliveryTerms) warnings.push('Delivery terms (FOB/CIF/CNF) are recommended');
    if (!documentData.vesselFlightNo) warnings.push('Vessel/Flight number is recommended for shipping documentation');
    if (!documentData.preCarriageBy) warnings.push('Pre-carriage mode is recommended for complete shipping details');
  }

  if (templateType === 'purchase_order') {
    if (!documentData.orderNo) errors.push('Order number is required');
    if (!documentData.date) errors.push('Order date is required');
    if (!documentData.piReference) errors.push('PI reference is required');
    if (!documentData.supplier) errors.push('Supplier information is required');
    if (!documentData.productLines || documentData.productLines.length === 0) {
      errors.push('At least one product line is required');
    }
    if (!documentData.totalAmount || documentData.totalAmount <= 0) {
      errors.push('Total amount must be greater than zero');
    }
    if (!documentData.deliverySchedule) errors.push('Delivery schedule is required');
    if (!documentData.paymentTerms) errors.push('Payment terms are required');

    if (!documentData.gstAmount) warnings.push('GST calculation is recommended');
    if (!documentData.buyerOrderNo) warnings.push('Buyer order number is recommended for reference');
    if (!documentData.vesselFlightNo) warnings.push('Vessel/Flight number is recommended for shipping documentation');
    if (!documentData.preCarriageBy) warnings.push('Pre-carriage mode is recommended for complete shipping details');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    structureMatches: errors.length === 0 && warnings.length === 0,
  };
};
