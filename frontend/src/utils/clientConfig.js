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
 * Client Configuration
 * 
 * NOTE: All dropdown data (countries, ports, currencies, etc.) is now
 * dynamically fetched from the Master Data module via masterDataService.
 * No hardcoded lists should be added here.
 * 
 * This file only contains static configuration values and utility functions.
 */

// Business types are a static configuration, not master data
export const businessTypes = [
  'Importer',
  'Distributor',
  'Retailer',
  'Contractor',
  'Architect',
  'Designer',
];

// Legacy fallback arrays — kept as empty arrays for backward compatibility
// All consumers should fetch from masterDataService instead
export const ports = [];
export const currencies = [];
export const countries = [];

// These constants are deprecated — consumers should not rely on defaults
export const DEFAULT_PORT_OF_LOADING = '';
export const DEFAULT_CURRENCY = '';

export const autoFillFinalDestination = (country) => {
  return country;
};
