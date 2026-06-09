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
 * Advanced Data Validation System
 * Provides comprehensive validation for all business data with intelligent error detection
 */

export class DataValidator {
  static validateInvoiceData(invoiceData) {
    const errors = [];
    const warnings = [];

    if (!invoiceData.client?.trim()) {
      errors.push('Client selection is mandatory for invoice processing');
    }

    if (!invoiceData.country?.trim()) {
      errors.push('Destination country is required for export documentation');
    }

    if (!invoiceData.portOfDischarge?.trim()) {
      errors.push('Port of discharge is required for shipping arrangements');
    }

    if (!invoiceData.productLines || invoiceData.productLines.length === 0) {
      errors.push(
        'At least one product line is required for invoice generation'
      );
    } else {
      invoiceData.productLines.forEach((line, index) => {
        if (!line.product?.trim()) {
          errors.push(`Product selection required for line ${index + 1}`);
        }

        if (!line.rate || line.rate <= 0) {
          errors.push(`Valid rate required for product line ${index + 1}`);
        }

        if (!line.bigPallet && !line.kathaliPallet) {
          errors.push(`Pallet quantity required for product line ${index + 1}`);
        }

        if (line.product && !this.hasProductImage(line.product)) {
          warnings.push(
            `Product "${line.product}" missing image for visual identification`
          );
        }
      });
    }

    const totalAmount =
      invoiceData.productLines?.reduce(
        (sum, line) => sum + (line.amount || 0),
        0
      ) || 0;
    if (totalAmount <= 0) {
      errors.push('Invoice total amount must be greater than zero');
    }

    if (!invoiceData.currency) {
      warnings.push('Currency not specified, defaulting to USD');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity:
        errors.length > 0
          ? 'error'
          : warnings.length > 0
          ? 'warning'
          : 'success',
    };
  }

  static validatePackingListData(packingListData) {
    const errors = [];
    const warnings = [];

    if (!packingListData.piReference?.trim()) {
      errors.push('PI Reference is mandatory for packing list creation');
    }

    if (packingListData.poReference?.trim()) {
      warnings.push('PO Reference should be validated against backend records');
    }

    if (
      !packingListData.productLines ||
      packingListData.productLines.length === 0
    ) {
      errors.push('Product lines are required (auto-loaded from PI Reference)');
    }

    if (!packingListData.shippingDetails?.containerType) {
      warnings.push('Container type not specified for shipping documentation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity:
        errors.length > 0
          ? 'error'
          : warnings.length > 0
          ? 'warning'
          : 'success',
    };
  }

  static validateQCData(qcData) {
    const errors = [];
    const warnings = [];

    if (!qcData.orderNumber?.trim()) {
      errors.push('Order number is required for QC record creation');
    }

    if (!qcData.qcDate) {
      errors.push('QC inspection date is mandatory');
    } else {
      const qcDate = new Date(qcData.qcDate);
      const today = new Date();
      if (qcDate > today) {
        errors.push('QC date cannot be in the future');
      }
    }

    if (!qcData.inspectedBy?.trim()) {
      errors.push('Inspector name is required');
    }

    if (!qcData.productLines || qcData.productLines.length === 0) {
      errors.push('At least one product must be inspected');
    } else {
      qcData.productLines.forEach((line, index) => {
        if (!line.qcStatus) {
          errors.push(`QC status required for product line ${index + 1}`);
        }
        if (line.qcStatus === 'Failed' && !line.failureReason?.trim()) {
          errors.push(`Failure reason required for failed line ${index + 1}`);
        }
      });
    }

    const hasMedia = qcData.images?.length > 0 || qcData.videos?.length > 0;
    if (!hasMedia) {
      warnings.push('Media files (images/videos) recommended for QC records');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity:
        errors.length > 0
          ? 'error'
          : warnings.length > 0
          ? 'warning'
          : 'success',
    };
  }

  static validateLeadData(leadData) {
    const errors = [];
    const warnings = [];

    if (!leadData.companyName?.trim()) {
      errors.push('Company name is required for lead creation');
    }

    if (!leadData.clientName?.trim()) {
      errors.push('Contact person name is required');
    }

    if (!leadData.emailId?.trim()) {
      errors.push('Email address is required');
    } else if (!this.isValidEmail(leadData.emailId)) {
      errors.push('Valid email address is required');
    }

    if (!leadData.country?.trim()) {
      warnings.push('Country information helps with lead qualification');
    }

    if (!leadData.requirements?.trim()) {
      warnings.push('Lead requirements help in better follow-up');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity:
        errors.length > 0
          ? 'error'
          : warnings.length > 0
          ? 'warning'
          : 'success',
    };
  }

  static validateClientData(clientData) {
    const errors = [];
    const warnings = [];

    if (!clientData.name?.trim()) {
      errors.push('Client name is required');
    }

    if (!clientData.emailId?.trim()) {
      errors.push('Email address is required');
    } else if (!this.isValidEmail(clientData.emailId)) {
      errors.push('Valid email address is required');
    }

    if (!clientData.country?.trim()) {
      errors.push('Country is required for export documentation');
    }

    if (!clientData.address?.trim()) {
      warnings.push('Complete address recommended for shipping');
    }

    if (!clientData.contactNumber?.trim()) {
      warnings.push('Contact phone number recommended');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity:
        errors.length > 0
          ? 'error'
          : warnings.length > 0
          ? 'warning'
          : 'success',
    };
  }

  static validateProductData(productData) {
    const errors = [];
    const warnings = [];

    if (!productData.name?.trim()) {
      errors.push('Product name is required');
    }

    if (!productData.size?.trim()) {
      errors.push('Product size is required');
    }

    if (!productData.factoryName?.trim()) {
      warnings.push('Factory name helps in better product identification');
    }

    if (!productData.sqmPerBox || productData.sqmPerBox <= 0) {
      errors.push('Valid SQM per box is required for calculations');
    }

    if (!productData.images || productData.images.length === 0) {
      warnings.push('Product images recommended for better presentation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity:
        errors.length > 0
          ? 'error'
          : warnings.length > 0
          ? 'warning'
          : 'success',
    };
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static hasProductImage(productName) {
    return true;
  }

  static validateBulkImport(data, requiredFields) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(data) || data.length === 0) {
      errors.push('No data found in import file');
      return { isValid: false, errors, warnings, severity: 'error' };
    }

    const headers = Object.keys(data[0] || {});
    const missingFields = requiredFields.filter(
      (field) => !headers.includes(field)
    );

    if (missingFields.length > 0) {
      errors.push(
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    data.forEach((row, index) => {
      requiredFields.forEach((field) => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push(
            `Row ${index + 1}: Missing value for required field "${field}"`
          );
        }
      });
    });

    if (data.length > 1000) {
      warnings.push(
        'Large import detected. Consider splitting into smaller batches for better performance.'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity:
        errors.length > 0
          ? 'error'
          : warnings.length > 0
          ? 'warning'
          : 'success',
    };
  }
}




