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
 * Transform snake_case object keys to camelCase
 * Used to normalize API responses that return snake_case field names
 */
export const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Transform camelCase object keys to snake_case
 * Used to prepare frontend data for API requests
 */
export const camelToSnake = (str) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export const transformKeys = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key);
      result[camelKey] = transformKeys(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

/**
 * Transform object keys from camelCase to snake_case recursively
 */
export const transformKeysToSnake = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToSnake);
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = transformKeysToSnake(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

/**
 * Normalize any data from API (snake_case) to frontend format (camelCase)
 * Generic transformer that works for any entity
 */
export const normalizeData = (data) => {
  if (!data) return null;
  return transformKeys(data);
};

/**
 * Prepare frontend data (camelCase) for API (snake_case)
 * Generic transformer that works for any entity
 */
export const prepareDataForAPI = (data) => {
  if (!data) return null;
  return transformKeysToSnake(data);
};

/**
 * Normalize client data from API (snake_case) to frontend format (camelCase)
 * Use generic normalizeData instead to avoid field name collisions
 */
export const normalizeClient = (client) => {
  if (!client) return null;
  return transformKeys(client);
};

/**
 * Normalize supplier data from API (snake_case) to frontend format (camelCase)
 * Parses product_categories and bank_details JSON strings into proper objects
 */
export const normalizeSupplier = (supplier) => {
  if (!supplier) return null;
  const transformed = transformKeys(supplier);

  // Parse product_categories if it's a JSON string
  let productCategories = [];
  const productCategoriesData = transformed.productCategories;
  
  if (productCategoriesData) {
    if (typeof productCategoriesData === 'string') {
      try {
        productCategories = JSON.parse(productCategoriesData);
      } catch (e) {
        console.warn('Failed to parse productCategories JSON:', e);
        productCategories = [];
      }
    } else if (Array.isArray(productCategoriesData)) {
      productCategories = productCategoriesData;
    }
  }

  // Parse bank_details if it's a JSON string
  let bankDetails = {
    bankName: '',
    branch: '',
    accountNumber: '',
    ifscCode: '',
  };
  const bankDetailsData = transformed.bankDetails;
  
  if (bankDetailsData) {
    if (typeof bankDetailsData === 'string') {
      try {
        bankDetails = JSON.parse(bankDetailsData);
      } catch (e) {
        console.warn('Failed to parse bankDetails JSON:', e);
        bankDetails = {};
      }
    } else if (typeof bankDetailsData === 'object' && bankDetailsData !== null) {
      bankDetails = bankDetailsData;
    }
  }

  return {
    ...transformed,
    productCategories: productCategories,
    bankDetails: bankDetails,
  };
};

/**
 * Normalize product data from API (snake_case) to frontend format (camelCase)
 */
export const normalizeProduct = (product) => {
  if (!product) return null;
  return transformKeys(product);
};

/**
 * Normalize lead data from API (snake_case) to frontend format (camelCase)
 * Also map backend field names to frontend expected names for UI forms
 */
export const normalizeLead = (lead) => {
  if (!lead) return null;
  const transformed = transformKeys(lead);

  // Parse productInterest if it's a JSON string
  let productInterests = [];
  const productInterestData = transformed.productInterest || transformed.productInterests;
  
  if (productInterestData) {
    if (typeof productInterestData === 'string') {
      try {
        productInterests = JSON.parse(productInterestData);
      } catch (e) {
        console.warn('Failed to parse productInterest JSON:', e);
        productInterests = [];
      }
    } else if (Array.isArray(productInterestData)) {
      productInterests = productInterestData;
    }
  }

  return {
    ...transformed,
    leadId: transformed.leadId || '',
    clientName: transformed.contactPersonName || transformed.clientName || '',
    contactNumber: transformed.contactNumber || '',
    emailId: transformed.emailId || '',
    createdDate: transformed.createdAt || transformed.createdDate || '',
    productInterests: productInterests,
    leadValue: transformed.expectedValue || transformed.leadValue || 0,
    expectedCloseDate: transformed.timeline || transformed.expectedCloseDate || '',
    salesPerson: transformed.assignedTo || transformed.salesPerson || '',
    salesPersonName: transformed.assignedToName || '',
  };
};

/**
 * Normalize user data from API (snake_case) to frontend format (camelCase)
 */
export const normalizeUser = (user) => {
  if (!user) return null;
  return transformKeys(user);
};

/**
 * Normalize order data and calculate missing fields like totalSQM
 */
export const normalizeOrder = (order) => {
  if (!order) return null;
  const normalized = transformKeys(order);
  
  // Calculate totalSQM from product_lines if not already present
  if (!normalized.totalSQM && normalized.productLines && Array.isArray(normalized.productLines)) {
    normalized.totalSQM = normalized.productLines.reduce((sum, line) => {
      return sum + (parseFloat(line.sqm) || parseFloat(line.sqmAuto) || 0);
    }, 0);
  }
  
  // Map amount field if not present
  if (!normalized.amount && normalized.totalAmount) {
    normalized.amount = normalized.totalAmount;
  }
  
  // Format date to yyyy-MM-dd
  if (normalized.date && typeof normalized.date === 'string' && normalized.date.includes('T')) {
    normalized.date = ((normalized.date) ? new Date(normalized.date).toLocaleDateString('en-CA') : '');
  }
  // Map orderNo to orderId
  if (!normalized.orderId && normalized.orderNo) {
    normalized.orderId = normalized.orderNo;
  }
  
  return normalized;
};

/**
 * Normalize packing list data and calculate missing fields
 */
export const normalizePackingList = (packingList) => {
  if (!packingList) return null;
  const normalized = transformKeys(packingList);
  
  // Calculate totalSQM from product_lines or items if not present
  if (!normalized.totalSQM) {
    const items = normalized.items || normalized.productLines || [];
    if (Array.isArray(items)) {
      normalized.totalSQM = items.reduce((sum, item) => {
        return sum + (parseFloat(item.sqm) || parseFloat(item.sqmAuto) || 0);
      }, 0);
    }
  }
  
  // Format date to yyyy-MM-dd
  if (normalized.date && typeof normalized.date === 'string' && normalized.date.includes('T')) {
    normalized.date = ((normalized.date) ? new Date(normalized.date).toLocaleDateString('en-CA') : '');
  }
  
  // Convert numeric strings to numbers and ensure all required fields are numbers
  normalized.totalSQM = parseFloat(normalized.totalSQM) || 0;
  normalized.totalPallets = parseInt(normalized.totalPallets, 10) || 0;
  normalized.totalBoxes = parseInt(normalized.totalBoxes, 10) || 0;
  normalized.totalWeight = parseFloat(normalized.totalWeight) || 0;
  
  return normalized;
};

/**
 * Normalize array of items - uses generic normalizeData for all other entity types
 */
export const normalizeArray = (items, normalizer = normalizeData) => {
  if (!Array.isArray(items)) return [];
  return items.map(normalizer);
};
