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
 * CSV Import/Export utilities for bulk operations
 * - Robust CSV parsing with quoted fields and CRLF handling
 * - Row/field specific validation messages
 */

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        // Escaped quote
        current += '"';
        i++; // skip next
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += ch;
  }
  result.push(current);
  return result.map(v => v.trim());
};

export const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error('Empty or invalid CSV content');
  }

  // Normalize newlines and split, filter out empty lines
  const lines = csvText.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase());

  // Ensure headers are unique
  const dup = headers.find((h, idx) => headers.indexOf(h) !== idx);
  if (dup) {
    throw new Error(`Duplicate header found: ${dup}`);
  }

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-based line number
    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      throw new Error(`Row ${rowNum}: Expected ${headers.length} columns but found ${values.length}`);
    }

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
};

export const generateCSV = (headers, data) => {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes('"')) {
      return `"${s.replace(/\"/g, '\\"')}"`;
    }
    if (s.includes(',') || s.includes('\n')) {
      return `"${s}"`;
    }
    return s;
  };

  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => headers.map(h => escape(row[h])).join(','));
  return [csvHeaders, ...csvRows].join('\n');
};

/**
 * Validate CSV data for products
 */
export const validateProductsCSV = (data) => {
  const errors = [];

  data.forEach((row, index) => {
    const rowNum = index + 2; // account for header row
    if (!row.name || String(row.name).trim() === '') errors.push(`Row ${rowNum}: "name" is required`);
    if (!row.category || String(row.category).trim() === '') errors.push(`Row ${rowNum}: "category" is required`);
    if (row.price !== undefined && row.price !== '') {
      const p = parseFloat(String(row.price).replace(/,/g, ''));
      if (Number.isNaN(p)) {
        errors.push(`Row ${rowNum}: "price" must be a number (found: "${row.price}")`);
      } else if (p < 0) {
        errors.push(`Row ${rowNum}: "price" must not be negative`);
      }
    }
  });

  return errors;
};

/**
 * Validate CSV data for clients
 */
export const validateClientsCSV = (data) => {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  data.forEach((row, index) => {
    const rowNum = index + 2;
    if (!row.name || String(row.name).trim() === '') errors.push(`Row ${rowNum}: "name" is required`);
    if (!row.city || String(row.city).trim() === '') errors.push(`Row ${rowNum}: "city" is required`);
    if (row.email && row.email.trim() !== '' && !emailRegex.test(row.email)) {
      errors.push(`Row ${rowNum}: "email" is invalid (found: "${row.email}")`);
    }
  });

  return errors;
};

/**
 * Validate CSV data for leads
 */
export const validateLeadsCSV = (data) => {
  const errors = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;
    if (!row.title || String(row.title).trim() === '') errors.push(`Row ${rowNum}: "title" is required`);
    if (!row.client_name || String(row.client_name).trim() === '') errors.push(`Row ${rowNum}: "client_name" is required`);
  });

  return errors;
};
