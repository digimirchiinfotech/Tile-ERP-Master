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
 * Consolidated Data Transformers
 * Handles all entity normalization, snake/camel case conversion, and API payload preparation
 */

// --- Base Utilities ---

/**
 * Transform snake_case object keys to camelCase
 */
export const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Transform camelCase object keys to snake_case
 */
export const camelToSnake = (str) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Recursive key transformer (snake to camel)
 */
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
 * Recursive key transformer (camel to snake)
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
 * Generic normalization
 */
export const normalizeData = (data) => {
  if (!data) return null;
  return transformKeys(data);
};

/**
 * Generic API preparation
 */
export const prepareDataForAPI = (data) => {
  if (!data) return null;
  return transformKeysToSnake(data);
};

// --- Entity Specific Normalizers ---

/**
 * Company Normalizer
 */
export const normalizeCompanyData = (company) => {
  if (!company) return null;

  let enabledModules = [];
  const modulesData = company.enabled_modules || company.enabledModules || [];

  if (modulesData) {
    if (typeof modulesData === 'string') {
      try {
        enabledModules = JSON.parse(modulesData);
      } catch (e) {
        console.warn('Failed to parse enabledModules JSON:', e);
        enabledModules = [];
      }
    } else if (Array.isArray(modulesData)) {
      enabledModules = modulesData;
    }
  }

  const planPrices = {
    'Basic': 99,
    'Professional': 249,
    'Premium': 499,
    'Enterprise': 999,
    'Free Trial': 0
  };

  const plan = company.subscription_plan || company.subscriptionPlan;
  const rawRevenue = company.monthly_revenue || company.monthlyRevenue;
  const revenue = (parseFloat(rawRevenue) > 0) ? parseFloat(rawRevenue) : (planPrices[plan] || 0);

  return {
    id: company.id,
    name: company.name,
    industry: company.industry,
    contactPersonName: company.contact_person_name || company.contactPersonName,
    emailId: company.email_id || company.emailId,
    contactNumber: company.contact_number || company.contactNumber,
    country: company.country,
    city: company.city,
    address: company.address,
    website: company.website,
    gstn: company.gstn,
    pan: company.pan,
    iecNo: company.iec_no || company.iecNo,
    logoUrl: company.logo_url || company.logoUrl,
    subscriptionPlan: plan,
    status: company.status,
    adminUsername: company.admin_username || company.adminUsername,
    adminEmailId: company.admin_email_id || company.adminEmailId,
    enabledModules: enabledModules,
    monthlyRevenue: revenue,
    totalUsers: company.total_users || company.totalUsers || 0,
    totalLeads: company.total_leads || company.totalLeads || 0,
    totalOrders: company.total_orders || company.totalOrders || 0,
    totalQCRecords: company.total_qc_records || company.totalQCRecords || 0,
    healthStatus: company.health_status || company.healthStatus || 'Healthy',
    daysUntilExpiry: company.days_until_expiry || company.daysUntilExpiry || 0,
    subscriptionEndDate: company.subscription_end_date || company.subscriptionEndDate || null,
    lastLogin: company.last_login || company.lastLogin,
    createdAt: company.created_at || company.createdAt,
    updatedAt: company.updated_at || company.updatedAt,
  };
};

export const normalizeCompanyDataArray = (companies) => {
  if (!Array.isArray(companies)) return [];
  return companies.map(normalizeCompanyData);
};

export const convertToSnakeCase = (data) => {
  const submitData = {
    name: data.name,
    industry: data.industry,
    contact_person_name: data.contactPersonName,
    email_id: data.emailId,
    contact_number: data.contactNumber,
    address: data.address,
    city: data.city,
    country: data.country,
    website: data.website,
    gstn: data.gstn,
    pan: data.pan,
    iec_no: data.iecNo,
    subscription_plan: data.subscriptionPlan,
    status: data.status,
  };

  if (data.adminUsername) submitData.admin_username = data.adminUsername;
  if (data.adminEmailId) submitData.admin_email_id = data.adminEmailId;
  if (data.adminPassword) submitData.admin_password = data.adminPassword;
  if (data.enabledModules && data.enabledModules.length > 0) submitData.enabled_modules = data.enabledModules;

  return submitData;
};

/**
 * Client Normalizer
 */
export const normalizeClient = (client) => {
  if (!client) return null;
  return transformKeys(client);
};

/**
 * Supplier Normalizer
 */
export const normalizeSupplier = (supplier) => {
  if (!supplier) return null;
  const transformed = transformKeys(supplier);

  let productCategories = [];
  const pcData = transformed.productCategories;
  if (pcData) {
    if (typeof pcData === 'string') {
      try { productCategories = JSON.parse(pcData); } catch (e) { productCategories = []; }
    } else if (Array.isArray(pcData)) {
      productCategories = pcData;
    }
  }

  let bankDetails = transformed.bankDetails || {};
  if (typeof bankDetails === 'string') {
    try { bankDetails = JSON.parse(bankDetails); } catch (e) { bankDetails = {}; }
  }

  return {
    ...transformed,
    productCategories,
    bankDetails,
    // Explicitly map order metrics — backend returns total_order_value but dashboard reads totalPurchaseValue
    totalOrders: parseInt(supplier.total_orders ?? transformed.totalOrders ?? 0),
    totalPurchaseValue: parseFloat(supplier.total_order_value ?? supplier.totalOrderValue ?? transformed.totalPurchaseValue ?? 0),
  };
};

/**
 * Product Normalizer
 */
export const normalizeProduct = (product) => {
  if (!product) return null;
  const transformed = transformKeys(product);

  let images = [];
  if (transformed.images) {
    if (typeof transformed.images === 'string') {
      try { images = JSON.parse(transformed.images); } catch (e) { images = []; }
    } else if (Array.isArray(transformed.images)) {
      images = transformed.images;
    }
  }

  let pdfs = [];
  if (transformed.pdfs) {
    if (typeof transformed.pdfs === 'string') {
      try { pdfs = JSON.parse(transformed.pdfs); } catch (e) { pdfs = []; }
    } else if (Array.isArray(transformed.pdfs)) {
      pdfs = transformed.pdfs;
    }
  }

  return {
    ...transformed,
    images,
    pdfs
  };
};

/**
 * Catalogue Normalizer
 */
export const normalizeCatalogue = (catalogue) => {
  if (!catalogue) return null;
  const transformed = transformKeys(catalogue);

  const normalizePath = (path) => {
    if (!path) return null;
    let normalized = path.replace(/\\/g, '/');
    if (normalized.includes('uploads/')) {
      normalized = normalized.substring(normalized.indexOf('uploads/'));
    }
    return normalized;
  };

  return {
    ...transformed,
    coverImagePath: normalizePath(transformed.coverImagePath || transformed.cover_image_path),
    pdfFilePath: normalizePath(transformed.pdfFilePath || transformed.pdf_file_path),
    products: Array.isArray(transformed.products)
      ? transformed.products.map(p => normalizeProduct(p))
      : [],
    productCount: transformed.productCount || (transformed.products ? transformed.products.length : (transformed.product_count || 0)),
    createdAt: transformed.createdAt || transformed.created_at || null,
  };
};

export const normalizeCatalogueArray = (catalogues) => {
  if (!Array.isArray(catalogues)) return [];
  return catalogues.map(normalizeCatalogue);
};

/**
 * Lead Normalizer
 */
export const normalizeLead = (lead) => {
  if (!lead) return null;
  const transformed = transformKeys(lead);

  let productInterests = [];
  const piData = transformed.productInterest || transformed.productInterests;
  if (piData) {
    if (typeof piData === 'string') {
      try { productInterests = JSON.parse(piData); } catch (e) { productInterests = []; }
    } else if (Array.isArray(piData)) {
      productInterests = piData;
    }
  }

  const createdAtValue = transformed.createdAt || transformed.created_at || lead.created_at || '';

  return {
    ...transformed,
    leadId: transformed.leadId || lead.lead_id || 'N/A',
    clientName: transformed.contactPersonName || transformed.clientName || lead.contact_person_name || 'N/A',
    productInterests: (productInterests || []).map(p => ({
      ...p,
      productName: p.productName || p.product || 'N/A',
      quantity: p.quantity || p.totalBoxes || 0,
      totalValue: p.totalValue || p.amount || 0,
      unitPrice: p.unitPrice || p.rate || 0,
      size: p.size || 'N/A',
      surface: p.surface || 'N/A'
    })),
    leadValue: transformed.expectedValue || transformed.leadValue || lead.expected_value || 0,
    expectedCloseDate: transformed.timeline || transformed.expectedCloseDate || lead.timeline || '',
    salesPerson: transformed.assignedToName || transformed.assignedTo || transformed.salesPerson || 'Unassigned',
    salesPersonName: transformed.assignedToName || transformed.salesPersonName || 'Unassigned',
    createdDate: createdAtValue,
    createdAt: createdAtValue,
  };
};

/**
 * User Normalizer
 */
export const normalizeUser = (user) => {
  if (!user) return null;
  const transformed = transformKeys(user);
  return {
    ...transformed,
    salesTarget: parseFloat(transformed.salesTarget || 0),
    commission: parseFloat(transformed.commission || 0),
    createdDate: transformed.createdAt || transformed.created_at || '',
    status: transformed.status || 'Active',
    country: transformed.country || '',
    city: transformed.city || '',
    assignedCatalogues: Array.isArray(transformed.assignedCatalogues) ? transformed.assignedCatalogues :
      (typeof transformed.assignedCatalogues === 'string' ? JSON.parse(transformed.assignedCatalogues || '[]') : []),
  };
};

/**
 * Order Normalizer
 */
export const normalizeOrder = (order) => {
  if (!order) return null;
  const normalized = transformKeys(order);

  // Handle product lines parsing
  if (normalized.productLines && typeof normalized.productLines === 'string') {
    try {
      normalized.productLines = JSON.parse(normalized.productLines);
    } catch (e) {
      console.warn('Failed to parse productLines JSON:', e);
      normalized.productLines = [];
    }
  }

  // Ensure common field mappings
  if (!normalized.orderId && normalized.orderNo) normalized.orderId = normalized.orderNo;
  if (!normalized.clientName) {
    normalized.clientName = normalized.clientFirmName || normalized.supplierName || normalized.clientName || order.client_name || order.client_firm_name || 'N/A';
  }

  if (!normalized.amount && normalized.totalAmount) normalized.amount = normalized.totalAmount;
  if (normalized.date?.includes('T')) normalized.date = ((normalized.date) ? new Date(normalized.date).toLocaleDateString('en-CA') : '');

  // Map country
  if (!normalized.country && normalized.clientCountry) normalized.country = normalized.clientCountry;

  return normalized;
};

/**
 * Packing List Normalizer
 */
export const normalizePackingList = (packingList) => {
  if (!packingList) return null;
  const normalized = transformKeys(packingList);

  if (!normalized.totalSQM) {
    const items = normalized.items || normalized.productLines || [];
    normalized.totalSQM = items.reduce((sum, item) => sum + (parseFloat(item.sqm) || parseFloat(item.sqmAuto) || 0), 0);
  }

  if (normalized.date?.includes('T')) normalized.date = ((normalized.date) ? new Date(normalized.date).toLocaleDateString('en-CA') : '');

  normalized.totalSQM = parseFloat(normalized.totalSQM) || 0;
  normalized.totalPallets = parseInt(normalized.totalPallets, 10) || 0;
  normalized.totalBoxes = parseInt(normalized.totalBoxes, 10) || 0;
  normalized.totalWeight = parseFloat(normalized.totalWeight) || 0;

  return normalized;
};

/**
 * QC Record Normalizer
 */
export const normalizeQCRecord = (record) => {
  if (!record) return null;
  const normalized = transformKeys(record);

  if (normalized.productLines && typeof normalized.productLines === 'string') {
    try {
      normalized.productLines = JSON.parse(normalized.productLines);
    } catch {
      normalized.productLines = [];
    }
  }
  if (!Array.isArray(normalized.productLines)) {
    normalized.productLines = [];
  }

  if (normalized.inspectionDetails && typeof normalized.inspectionDetails === 'string') {
    try {
      normalized.inspectionDetails = JSON.parse(normalized.inspectionDetails);
    } catch {
      normalized.inspectionDetails = {};
    }
  }
  if (normalized.inspectionMedia && typeof normalized.inspectionMedia === 'string') {
    try {
      normalized.inspectionMedia = JSON.parse(normalized.inspectionMedia);
    } catch {
      normalized.inspectionMedia = {};
    }
  }

  if (!normalized.boxType && normalized.box_type) {
    normalized.boxType = normalized.box_type;
  }

  const boxType = normalized.boxType || normalized.box_type;
  if (boxType && boxType !== 'N/A') {
    normalized.productLines = normalized.productLines.map((line) => {
      const lineBox = line.boxType || line.box_type;
      if (lineBox && lineBox !== 'N/A') return line;
      return { ...line, boxType, box_type: boxType };
    });
  }

  if (!normalized.qcId && normalized.qc_id) normalized.qcId = normalized.qc_id;
  if (!normalized.orderNumber && normalized.order_number) normalized.orderNumber = normalized.order_number;
  if (!normalized.clientName && normalized.client_name) normalized.clientName = normalized.client_name;
  if (!normalized.productName && normalized.product_name) normalized.productName = normalized.product_name;
  if (!normalized.qcStatus && normalized.qc_status) normalized.qcStatus = normalized.qc_status;
  if (!normalized.qcDate && normalized.qc_date) normalized.qcDate = normalized.qc_date;
  if (!normalized.overallGrade && normalized.overall_grade) normalized.overallGrade = normalized.overall_grade;

  return normalized;
};

// --- Specialized Document Transformers ---

export const transformCertificateToBackend = (data) => ({
  certificate_type: data.certificates?.[0]?.type?.trim() || 'Certificate of Origin',
  issue_date: data.date || new Date().toLocaleDateString('en-CA'),
  invoice_ref: data.invoiceReference || 'N/A',
  status: 'Applied',
  fees: parseFloat(data.totalFees) || 0
});

export const transformCertificateToFrontend = (data) => {
  if (!data) return null;
  return {
    id: data.id,
    certificateId: data.certificate_no || data.certificateId,
    date: data.issue_date,
    invoiceReference: data.invoice_ref || data.invoiceReference,
    clientName: data.client_name || data.clientName,
    certificates: [{
      type: data.certificate_type,
      status: data.status,
      issueDate: data.issue_date,
      fees: data.fees || 0,
      remarks: data.notes
    }],
    paymentStatus: 'Pending',
    totalFees: data.fees || 0,
    specialInstructions: data.notes
  };
};

export const transformShippingInstructionToFrontend = (data) => {
  if (!data) return null;
  return {
    id: data.id,
    instructionNo: data.instruction_no,
    date: data.date,
    invoiceReference: data.invoice_reference,
    clientName: data.client_name,
    shipperDetails: data.shipper_details,
    consigneeDetails: data.consignee_details,
    notifyPartyDetails: data.notify_party_details,
    vesselName: data.vessel_name,
    voyageNo: data.voyage_no,
    bookingNo: data.booking_no,
    hblNo: data.hbl_no,
    placeOfDelivery: data.place_of_delivery,
    shippingBillNo: data.shipping_bill_no,
    shippingBillDate: data.shipping_bill_date,
    freightForwarder: data.freight_forwarder,
    freightDetails: data.freight_details,
    freightTerms: data.freight_terms,
    status: data.status,
    urgency: data.urgency,
    shippingDetails: data.shipping_details,
    cargoDetails: data.cargo_details,
    containerDetails: data.container_details,
    specialInstructions: data.special_instructions,
    documentsRequired: data.documents_required
  };
};

export const transformCustomsClearanceToFrontend = (data) => {
  if (!data) return null;
  return {
    id: data.id,
    clearanceNo: data.clearance_no,
    date: data.date,
    invoiceReference: data.invoice_reference,
    clientName: data.client_name,
    shippingBillNo: data.shipping_bill_no,
    status: data.status,
    chaDetails: data.cha_details,
    portOfClearance: data.port_of_clearance
  };
};



/**
 * Universal array normalizer
 */
export const normalizeArray = (items, normalizer = normalizeData) => {
  if (!Array.isArray(items)) return [];
  return items.map(normalizer).filter(Boolean);
};

export const transformArray = normalizeArray;
