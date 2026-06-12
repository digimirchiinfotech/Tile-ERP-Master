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
 * Export utilities for CSV and Excel formats
 */
import * as XLSX from 'xlsx';

// Convert data to CSV format
export const convertToCSV = (items, columns) => {
  // Create header row
  const headers = columns.map(col => col.label).join(',');

  // Create data rows
  const rows = items.map(item =>
    columns
      .map(col => {
        let value = col.accessor(item);
        // Escape quotes and wrap in quotes if value contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',')
  );

  return [headers, ...rows].join('\n');
};

// Trigger CSV download
export const downloadCSV = (csvContent, filename) => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

// Export function that handles both CSV and JSON
export const exportData = async (items, columns, format = 'xlsx', filename = 'export', isSuperAdmin = false) => {
  if (items.length === 0) {
    alert('No data to export');
    return false;
  }

  // If super admin, dynamically append a Tenant/Company ID column if it doesn't exist
  if (isSuperAdmin) {
    const hasCompanyCol = columns.some(c => c.label === 'Company ID' || c.label === 'Tenant');
    if (!hasCompanyCol) {
      columns = [
        ...columns,
        {
          label: 'Tenant / Company ID',
          accessor: (item) => item.company_id || item.companyId || item.tenant_id || 'Global'
        }
      ];
    }
  }

  const timestamp = new Date().toLocaleDateString('en-CA');
  const finalFilename = `${filename}-${timestamp}`;

  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        // Dynamic Column Discovery to prevent missing data
        const sensitiveKeys = ['_id', '__v', 'password', 'token', 'refreshToken'];
        const explicitlyMappedKeys = new Set(
          columns.map(c => {
            // Extract accessor string if it exists to know what is mapped
            const accessorStr = c.accessor.toString();
            const match = accessorStr.match(/item\.([a-zA-Z0-9_]+)/) || accessorStr.match(/item\[['"]([a-zA-Z0-9_]+)['"]\]/);
            return match ? match[1] : null;
          }).filter(Boolean)
        );

        const formatKeyToHeader = (key) => key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();

        // Find all unique keys across all items that aren't mapped or sensitive
        const unmappedKeys = new Set();
        items.forEach(item => {
          Object.keys(item).forEach(k => {
            if (!explicitlyMappedKeys.has(k) && !sensitiveKeys.includes(k) && typeof item[k] !== 'object') {
              unmappedKeys.add(k);
            }
          });
        });

        const dynamicColumns = [...columns, ...Array.from(unmappedKeys).map(k => createColumnDef(formatKeyToHeader(k), k))];

        if (format === 'csv') {
          const csv = convertToCSV(items, dynamicColumns);
          downloadCSV(csv, `${finalFilename}.csv`);
        } else if (format === 'xlsx' || format === 'excel') {
          const jsonData = items.map(item =>
            dynamicColumns.reduce((acc, col) => {
              acc[col.label] = col.accessor(item);
              return acc;
            }, {})
          );
          
          const worksheet = XLSX.utils.json_to_sheet(jsonData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
          
          XLSX.writeFile(workbook, `${finalFilename}.xlsx`);
        } else if (format === 'json') {
          const jsonData = items.map(item =>
            dynamicColumns.reduce((acc, col) => {
              acc[col.label] = col.accessor(item);
              return acc;
            }, {})
          );
          const jsonString = JSON.stringify(jsonData, null, 2);
          const element = document.createElement('a');
          element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString));
          element.setAttribute('download', `${finalFilename}.json`);
          element.style.display = 'none';
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        }
        resolve(true);
      } catch (e) {
        console.error('Export failed', e);
        resolve(false);
      }
    }, 0);
  });
};

// Column definitions helper
export const createColumnDef = (label, accessor, customFormatter = null) => ({
  label,
  accessor: (item) => {
    const value = typeof accessor === 'function' ? accessor(item) : item[accessor];
    return customFormatter ? customFormatter(value) : value;
  },
});

// Legacy export functions for backward compatibility
export const exportCompanies = (companies) => {
  if (companies.length === 0) return { success: false, message: 'No data to export' };
  const columns = [
    createColumnDef('Company Name', 'name'),
    createColumnDef('Email', 'emailId'),
    createColumnDef('Phone', 'contactNumber'),
    createColumnDef('Country', 'country'),
    createColumnDef('Status', 'status'),
  ];
  exportData(companies, columns, 'xlsx', 'companies');
  return { success: true, message: 'Companies exported successfully' };
};

export const exportQCRecords = (records) => {
  if (records.length === 0) return { success: false, message: 'No data to export' };
  const columns = [
    createColumnDef('QC ID', 'qcId'),
    createColumnDef('Order No', 'orderNumber'),
    createColumnDef('Client', 'clientName'),
    createColumnDef('Product', 'productName'),
    createColumnDef('Status', 'qcStatus'),
    createColumnDef('Date', 'qcDate'),
  ];
  exportData(records, columns, 'xlsx', 'qc-reports');
  return { success: true, message: 'QC Records exported successfully' };
};

export const exportToCSV = (data, filename = 'export') => {
  if (!data || data.length === 0) return false;
  const columns = Object.keys(data[0]).map(key => ({
    label: key,
    accessor: (item) => item[key],
  }));
  exportData(data, columns, 'xlsx', filename);
  return true;
};
