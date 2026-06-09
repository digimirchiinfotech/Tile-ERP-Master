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

export const defaultCompanyConfig = {
  exporter: {
    name: 'COMPANY NAME',
    address: 'Company Address\nCity, State, Zip',
    iecNo: '',
    gstn: '',
  },
  buyer: {
    name: 'BUYER NAME',
    address: 'Buyer Address\nCity, State, Zip',
    gstn: 'XXXXXXXXXXXXXXX',
  },
  bankDetails: {
    accountName: '',
    accountNumber: '',
    bankName: '',
    bankAddress: '',
    swiftCode: '',
  },
  defaults: {
    portOfLoading: 'MUNDRA PORT',
    countryOfOrigin: 'INDIA',
    paymentTerms: 'Due on Receipt',
    deliveryTerms: 'FOB',
    tariffCode: '',
  },
};


// Company-specific configurations map
// To add a new company, add a new key-value pair with companyId as key
const companyConfigs = {
  // Default fallback
  'default': defaultCompanyConfig
  // Add more companies here as needed
};

/**
 * Get company configuration object
 * @param {string|null} companyId
 * @returns {Object} Company configuration object
 */
export const getCompanyConfig = (companyId = null) => {
  // If no companyId provided, return default config
  if (!companyId) {
    return defaultCompanyConfig;
  }
  
  // Check if company-specific config exists
  if (companyConfigs[companyId]) {
    return companyConfigs[companyId];
  }
  
  // Fallback to default config if companyId not found
  return defaultCompanyConfig;
};

/**
 * Add a new company configuration
 * @param {string} companyId - Unique identifier for the company
 * @param {Object} config - Company configuration object
 */
export const addCompanyConfig = (companyId, config) => {
  if (!companyId) {
    throw new Error('Company ID is required');
  }
  
  companyConfigs[companyId] = config;
};

/**
 * Get all available company IDs
 * @returns {Array<string>} Array of company IDs
 */
export const getAvailableCompanyIds = () => {
  return Object.keys(companyConfigs);
};
