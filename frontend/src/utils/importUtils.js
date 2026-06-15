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
 * Enhanced Import Utilities
 * Provides comprehensive import functionality with validation and error handling for CSV file imports.
 */

import { validateImportData } from './validation.js';
import * as XLSX from 'xlsx';

/**
 * Parse CSV file content into structured data
 */
export const parseCSV = (csvContent) => {
  try {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });
        data.push(row);
      }
    }

    return {
      success: true,
      data,
      headers,
      totalRows: data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: [],
      headers: [],
      totalRows: 0,
    };
  }
};

/**
 * Parse a single CSV line handling quoted values
 */
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
};

/**
 * Process and validate uploaded CSV file
 */
export const processImportFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          if (jsonData.length > 0) {
            resolve({
              success: true,
              data: jsonData,
              headers: Object.keys(jsonData[0]),
              totalRows: jsonData.length
            });
          } else {
            resolve({
              success: true,
              data: [],
              headers: [],
              totalRows: 0
            });
          }
        } catch (error) {
          reject(new Error('Failed to parse Excel file: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const parseResult = parseCSV(content);
          if (parseResult.success) {
            resolve(parseResult);
          } else {
            reject(new Error(parseResult.error));
          }
        } catch (error) {
          reject(new Error('Failed to parse file: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    }
  });
};

/**
 * Import and validate data for a specific module type
 */
export const importModuleData = async (file, moduleType) => {
  try {
    const parseResult = await processImportFile(file);
    if (!parseResult.success) {
      throw new Error(parseResult.error);
    }

    const validationResult = validateImportData(parseResult.data, moduleType);
    const transformedData = transformImportData(validationResult.valid, moduleType);

    return {
      success: true,
      data: transformedData,
      validation: validationResult,
      summary: {
        totalRows: parseResult.totalRows,
        validRows: validationResult.summary.validCount,
        invalidRows: validationResult.summary.invalidCount,
        importedRows: transformedData.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: [],
      validation: null,
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        importedRows: 0,
      },
    };
  }
};

/**
 * Transform imported CSV data to match application's internal structure
 */
const transformImportData = (validData, moduleType) => {
  const currentDate = new Date().toLocaleDateString('en-CA');

  switch (moduleType) {
    case 'proforma-invoice-enhanced':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        invoiceNo: row.invoiceNo || `PI/IMP/${Date.now()}/${index}`,
        date: row.date || currentDate,
        clientName: row.clientName,
        country: row.country,
        amount: parseFloat(row.amount) || 0,
        status: 'Pending',
        importedAt: new Date().toISOString(),
      }));

    case 'leads':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        companyName: row.companyName,
        clientName: row.clientName,
        contactNumber: row.contactNumber,
        email_id: row.email_id,
        country: row.country,
        status: row.status || 'New',
        importedAt: new Date().toISOString(),
      }));

    case 'suppliers':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        name: row.name,
        email_id: row.email_id,
        contact_number: row.contact_number,
        country: row.country,
        status: 'Active',
        importedAt: new Date().toISOString(),
      }));

    case 'clients':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        name: row.name,
        email_id: row.email_id,
        contact_number: row.contact_number,
        country: row.country,
        status: 'Active',
        importedAt: new Date().toISOString(),
      }));

    case 'products':
      return validData.map((row, index) => {
        return {
          id: Date.now() + index,
          productCode: row.productCode || row.sku || '',
          itemRef: row.itemRef || '',
          factoryName: row.factoryName || '',
          factoryProductName: row.factoryProductName || '',
          companyProductName: row.companyProductName || row.name || '',
          name: row.name || row.companyProductName || '',
          catalogueName: row.catalogueName || row.category || 'Tiles',
          category: row.category || row.catalogueName || 'Tiles',
          description: row.description || '',
          size: row.size || '',
          surface: row.surface || '',
          thickness: row.thickness || '',
          application: row.application || '',
          boxPcs: parseInt(row.boxPcs) || 0,
          sqmPerBox: parseFloat(row.sqmPerBox) || 0,
          boxWeight: parseFloat(row.boxWeight) || 0,
          boxesPerPallet: parseInt(row.boxesPerPallet) || 0,
          defaultPerBoxWeight: parseFloat(row.defaultPerBoxWeight) || parseFloat(row.boxWeight) || 0,
          defaultPerPalletWeight: parseFloat(row.defaultPerPalletWeight) || 0,
          factoryPrice: parseFloat(row.factoryPrice) || 0,
          sellingPrice: parseFloat(row.sellingPrice) || 0,
          basePrice: parseFloat(row.basePrice) || 0,
          margin: parseFloat(row.margin) || 0,
          hsCode: row.hsCode || '',
          images: row.images ? row.images.split(',').map(url => ({ url: url.trim(), id: Date.now(), name: 'imported_image' })) : [],
          status: row.status || 'Active',
          importedAt: new Date().toISOString(),
        };
      });

    case 'pallets':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        palletId: row.palletId,
        category: row.category,
        size: row.size,
        status: row.status || 'Available',
        location: row.location || 'Warehouse A',
        assignedClient: row.assignedClient || '',
        importedAt: new Date().toISOString(),
      }));

    case 'users':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        name: row.name,
        username: row.username,
        email_id: row.email_id,
        role: row.role || 'sales',
        status: 'Active',
        importedAt: new Date().toISOString(),
      }));

    case 'packing-lists':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        packingListNo: row.packingListNo,
        clientName: row.clientName,
        totalPallets: parseInt(row.totalPallets) || 0,
        totalWeight: parseFloat(row.totalWeight) || 0,
        totalBoxes: parseInt(row.totalBoxes) || 0,
        status: row.status || 'Pending',
        importedAt: new Date().toISOString(),
      }));

    case 'qc-records':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        qcId: row.qcId,
        orderNumber: row.orderNumber,
        clientName: row.clientName,
        productName: row.productName,
        qcStatus: row.qcStatus || 'Pending',
        qcDate: row.qcDate || currentDate,
        importedAt: new Date().toISOString(),
      }));

    case 'client-orders':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        orderId: row.orderId,
        clientName: row.clientName,
        status: row.status || 'Pending',
        country: row.country,
        importedAt: new Date().toISOString(),
      }));

    case 'vgm':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        vgmNo: row.vgmNo,
        date: row.date || currentDate,
        invoiceId: row.invoiceId,
        shipper: row.shipper,
        weight: parseFloat(row.weight) || 0,
        containers: parseInt(row.containers) || 0,
        status: row.status || 'Draft',
        importedAt: new Date().toISOString(),
      }));

    case 'account-entries':
      return validData.map((row, index) => ({
        id: Date.now() + index,
        entryNo: row.entryNo || `ACC/IMP/${Date.now()}/${index}`,
        date: row.date || currentDate,
        type: row.type || 'Receivable',
        partyName: row.partyName,
        amount: parseFloat(row.amount) || 0,
        currency: row.currency || 'USD',
        status: row.status || 'Unpaid',
        paymentMode: row.paymentMode || 'Bank Transfer',
        invoiceNo: row.invoiceNo || '',
        importedAt: new Date().toISOString(),
      }));

    default:
      return validData;
  }
};

/**
 * Validate import file type and size
 */
export const validateImportFile = (file, moduleType) => {
  const errors = [];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    errors.push('Only CSV, XLSX, and XLS files are supported');
  }

  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Process import with progress tracking
 */
export const processImportWithProgress = async (file, moduleType, onProgress) => {
  try {
    onProgress?.(10, 'Validating file...');
    const fileValidation = validateImportFile(file, moduleType);
    if (!fileValidation.isValid) {
      throw new Error(fileValidation.errors.join(', '));
    }

    onProgress?.(30, 'Parsing CSV content...');
    const parseResult = await processImportFile(file);
    
    onProgress?.(60, 'Validating data integrity...');
    const validationResult = validateImportData(parseResult.data, moduleType);

    onProgress?.(80, 'Transforming data...');
    const transformedData = transformImportData(validationResult.valid, moduleType);

    onProgress?.(100, 'Import completed successfully');

    return {
      success: true,
      data: transformedData,
      validation: validationResult,
      summary: {
        totalRows: parseResult.totalRows,
        validRows: validationResult.summary.validCount,
        invalidRows: validationResult.summary.invalidCount,
        importedRows: transformedData.length,
      },
    };
  } catch (error) {
    onProgress?.(0, 'Import failed');
    return {
      success: false,
      error: error.message,
      data: [],
      validation: null,
      summary: { totalRows: 0, validRows: 0, invalidRows: 0, importedRows: 0 },
    };
  }
};

/**
 * Get import template for a specific module
 */
export const getImportTemplate = (moduleType) => {
  const templates = {
    'proforma-invoice-enhanced': {
      name: 'Proforma Invoices',
      fields: [
        { name: 'invoiceNo', label: 'Invoice No.', required: true, example: 'PI/2025/001' },
        { name: 'date', label: 'Date', required: true, example: '2025-01-15' },
        { name: 'clientName', label: 'Client Name', required: true, example: 'ABC Corp' },
        { name: 'country', label: 'Country', required: true, example: 'USA' },
        { name: 'amount', label: 'Amount', required: true, example: '50000' },
      ],
    },
    'proforma-order': {
      name: 'Proforma Orders',
      fields: [
        { name: 'orderNo', label: 'Order No.', required: true, example: 'PO/2025/001' },
        { name: 'date', label: 'Date', required: true, example: '2025-01-15' },
        { name: 'supplierName', label: 'Supplier Name', required: true, example: 'XYZ Factory' },
        { name: 'country', label: 'Country', required: true, example: 'India' },
        { name: 'amount', label: 'Amount', required: true, example: '25000' },
      ],
    },
    leads: {
      name: 'Leads',
      fields: [
        { name: 'companyName', label: 'Company Name', required: true, example: 'XYZ Ltd' },
        { name: 'clientName', label: 'Contact Name', required: true, example: 'John Doe' },
        { name: 'contactNumber', label: 'Phone', required: true, example: '+1234567890' },
        { name: 'email_id', label: 'Email', required: true, example: 'john@xyz.com' },
        { name: 'country', label: 'Country', required: true, example: 'Canada' },
      ],
    },
    suppliers: {
      name: 'Suppliers',
      fields: [
        { name: 'name', label: 'Supplier Name', required: true, example: 'Premium Tiles' },
        { name: 'email_id', label: 'Email', required: true, example: 'sales@premium.com' },
        { name: 'contact_number', label: 'Phone', required: true, example: '+919876543210' },
        { name: 'country', label: 'Country', required: true, example: 'India' },
      ],
    },
    clients: {
      name: 'Clients',
      fields: [
        { name: 'name', label: 'Client Name', required: true, example: 'Global Trading' },
        { name: 'email_id', label: 'Email', required: true, example: 'info@global.com' },
        { name: 'contact_number', label: 'Phone', required: true, example: '+44123456789' },
        { name: 'country', label: 'Country', required: true, example: 'UK' },
      ],
    },
    products: {
      name: 'Products',
      fields: [
        { name: 'productCode', label: 'Product Code (SKU)', required: true, example: 'PROD-001' },
        { name: 'name', label: 'Product Name', required: true, example: 'Ceramic Tile 60x60' },
        { name: 'category', label: 'Category', required: true, example: 'Floor Tiles' },
        { name: 'factoryName', label: 'Factory Name', required: false, example: 'Morbi Factory' },
        { name: 'factoryProductName', label: 'Factory Product Name', required: false, example: 'Ceramica 60x60' },
        { name: 'catalogueName', label: 'Catalogue Name', required: false, example: 'Elite Collection' },
        { name: 'description', label: 'Description', required: false, example: 'Premium quality floor tile' },
        { name: 'size', label: 'Size', required: false, example: '600x600mm' },
        { name: 'surface', label: 'Surface', required: false, example: 'Glossy' },
        { name: 'thickness', label: 'Thickness', required: false, example: '9mm' },
        { name: 'application', label: 'Application', required: false, example: 'Indoor' },
        { name: 'boxPcs', label: 'Pcs/Box', required: false, example: '4' },
        { name: 'sqmPerBox', label: 'SQM/Box', required: false, example: '1.44' },
        { name: 'boxWeight', label: 'Weight/Box (KG)', required: false, example: '28' },
        { name: 'boxesPerPallet', label: 'Boxes/Pallet', required: false, example: '40' },
        { name: 'factoryPrice', label: 'Factory Price', required: false, example: '150' },
        { name: 'sellingPrice', label: 'Selling Price', required: false, example: '200' },
        { name: 'hsCode', label: 'HS Code', required: false, example: '69072100' },
        { name: 'images', label: 'Images (Comma-separated URLs)', required: false, example: 'https://example.com/img1.jpg, https://example.com/img2.jpg' },
        { name: 'status', label: 'Status', required: false, example: 'Active' },
      ],
    },
    pallets: {
      name: 'Pallets',
      fields: [
        { name: 'palletId', label: 'Pallet ID', required: true, example: 'PAL-001' },
        { name: 'category', label: 'Category', required: true, example: 'Wooden' },
        { name: 'size', label: 'Size', required: true, example: '110x110' },
        { name: 'status', label: 'Status', required: true, example: 'Available' },
      ],
    },
    users: {
      name: 'Users',
      fields: [
        { name: 'name', label: 'Full Name', required: true, example: 'Rajesh Sharma' },
        { name: 'username', label: 'Username', required: true, example: 'rajesh_s' },
        { name: 'email_id', label: 'Email', required: true, example: 'rajesh@company.com' },
        { name: 'role', label: 'Role', required: true, example: 'sales' },
      ],
    },
    'packing-lists': {
      name: 'Packing Lists',
      fields: [
        { name: 'packingListNo', label: 'PL No', required: true, example: 'PL/2025/001' },
        { name: 'clientName', label: 'Client', required: true, example: 'ABC Corp' },
        { name: 'totalPallets', label: 'Pallets', required: false, example: '10' },
        { name: 'totalWeight', label: 'Weight (KG)', required: false, example: '500' },
        { name: 'totalBoxes', label: 'Boxes', required: false, example: '100' },
      ],
    },
    'qc-records': {
      name: 'QC Records',
      fields: [
        { name: 'qcId', label: 'QC ID', required: true, example: 'QC-2025-001' },
        { name: 'orderNumber', label: 'Order No', required: true, example: 'PO-2025-001' },
        { name: 'clientName', label: 'Client', required: true, example: 'Global Trading' },
        { name: 'productName', label: 'Product', required: true, example: 'Ceramic Tile' },
        { name: 'qcStatus', label: 'QC Status', required: false, example: 'Passed' },
      ],
    },
    'client-orders': {
      name: 'Client Orders',
      fields: [
        { name: 'orderId', label: 'Order ID', required: true, example: 'ORD-001' },
        { name: 'clientName', label: 'Client Name', required: true, example: 'John Doe' },
        { name: 'country', label: 'Country', required: true, example: 'USA' },
        { name: 'status', label: 'Status', required: false, example: 'Processing' },
      ],
    },
    vgm: {
      name: 'VGM Documents',
      fields: [
        { name: 'vgmNo', label: 'VGM No', required: true, example: 'VGM-2025-001' },
        { name: 'date', label: 'Date', required: true, example: '2025-01-15' },
        { name: 'invoiceId', label: 'Invoice ID', required: true, example: 'INV-001' },
        { name: 'shipper', label: 'Shipper', required: true, example: 'Global Logistics' },
        { name: 'weight', label: 'Weight', required: true, example: '25000' },
        { name: 'containers', label: 'Containers', required: false, example: '1' },
      ],
    },
    'account-entries': {
      name: 'Account Entries',
      fields: [
        { name: 'entryNo', label: 'Entry No', required: false, example: 'ACC/2025/001' },
        { name: 'date', label: 'Date', required: true, example: '2025-02-10' },
        { name: 'type', label: 'Type', required: true, example: 'Receivable' },
        { name: 'partyName', label: 'Party Name', required: true, example: 'Global Trading' },
        { name: 'amount', label: 'Amount', required: true, example: '15000' },
        { name: 'currency', label: 'Currency', required: false, example: 'USD' },
        { name: 'status', label: 'Status', required: false, example: 'Paid' },
        { name: 'paymentMode', label: 'Payment Mode', required: false, example: 'Bank Transfer' },
        { name: 'invoiceNo', label: 'Invoice No', required: false, example: 'INV/2025/001' },
      ],
    },
  };
  return templates[moduleType] || null;
};

