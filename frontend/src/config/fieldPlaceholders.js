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
 * Comprehensive Field Placeholders & Validation Rules
 * All input fields across the application with validation rules and example placeholders
 * This ensures consistency and clarity for users on what data is expected
 */

export const FIELD_PLACEHOLDERS = {
  // 1. Name Fields
  name: {
    placeholder: 'Enter your full name',
    label: 'Name',
    validation: 'Required',
    pattern: '',
    example: 'John Doe'
  },

  // 2. Contact Number
  contactNumber: {
    placeholder: 'Enter your contact number',
    label: 'Contact Number',
    validation: 'Required',
    pattern: '',
    example: '+91 9876543210'
  },

  // 3. Email ID
  emailId: {
    placeholder: 'Enter your email ID',
    label: 'Email ID',
    validation: 'Required',
    pattern: '',
    example: 'john@example.com'
  },

  // 4. Password
  password: {
    placeholder: 'Enter your password',
    label: 'Password',
    validation: 'Required',
    pattern: '',
    example: '••••••••'
  },

  // 5. Client Name
  clientName: {
    placeholder: 'Enter client name',
    label: 'Client Name',
    validation: 'Required',
    pattern: '',
    example: 'Global Logistics'
  },

  // 6. Contact Person Name
  contactPersonName: {
    placeholder: 'Enter contact person name',
    label: 'Contact Person Name*',
    validation: 'Required',
    pattern: '',
    example: 'Alice Smith'
  },

  // 7. City
  city: {
    placeholder: 'Enter city',
    label: 'City',
    validation: 'Required',
    pattern: '',
    example: 'Mumbai'
  },

  // 8. Address
  address: {
    placeholder: 'Enter full address',
    label: 'Address',
    validation: 'Required',
    pattern: '',
    example: '123 Business Park, Main St.'
  },

  // 10. Credit Days
  creditDays: {
    placeholder: 'Enter credit days',
    label: 'Credit Days',
    validation: 'Optional (defaults to 0)',
    pattern: '',
    example: '30'
  },

  // 11. GSTN
  gstn: {
    placeholder: 'Enter GSTN',
    label: 'GSTN',
    validation: 'Required',
    pattern: '',
    example: '22AAAAA0000A1Z5'
  },

  gst: {
    placeholder: 'Enter GST %',
    label: 'GST',
    validation: 'Required',
    pattern: '',
    example: '18'
  },

  // 12. PAN
  pan: {
    placeholder: 'Enter PAN',
    label: 'PAN',
    validation: 'Required',
    pattern: '',
    example: 'ABCDE1234F'
  },

  // 13. IEC No
  iecNo: {
    placeholder: 'Enter IEC No',
    label: 'IEC No',
    validation: 'Required',
    pattern: '',
    example: '1234567890'
  },

  // 14. Notes
  notes: {
    placeholder: 'Enter additional notes',
    label: 'Notes',
    validation: '',
    pattern: '',
    example: 'Special handling required'
  },

  // 15. Company Name
  companyName: {
    placeholder: 'Enter company name',
    label: 'Company Name',
    validation: 'Required',
    pattern: '',
    example: 'Acme Corp'
  },

  // 16. Supplier Factory Name
  supplierName: {
    placeholder: 'Enter supplier factory name',
    label: 'Supplier Factory Name',
    validation: 'Required',
    pattern: '',
    example: 'Precision Parts Factory'
  },

  // 17. Description
  description: {
    placeholder: 'Enter description',
    label: 'Description',
    validation: '',
    pattern: '',
    example: 'High quality ceramic tiles'
  },

  // 18. Seal Number
  sealNumber: {
    placeholder: 'Enter seal number',
    label: 'Seal Number',
    validation: 'Required',
    pattern: '',
    example: 'SL-998877'
  },

  // 19. Truck Number
  truckNumber: {
    placeholder: 'Enter truck number',
    label: 'Truck Number',
    validation: 'Required',
    pattern: '',
    example: 'MH-12-AB-1234'
  },

  // 20. Driver Name
  driverName: {
    placeholder: 'Enter driver name',
    label: 'Driver Name',
    validation: 'Required',
    pattern: '',
    example: 'John Smith'
  },

  // 21. Special Instructions
  specialInstructions: {
    placeholder: 'Enter special instructions',
    label: 'Special Instructions',
    validation: '',
    pattern: '',
    example: 'Deliver before sunset'
  },

  // Additional common fields
  productName: {
    placeholder: 'Enter product name',
    label: 'Product Name',
    validation: 'Required',
    pattern: '',
    example: 'Ceramic Tile 60x60'
  },

  quantity: {
    placeholder: 'Enter quantity',
    label: 'Quantity',
    validation: 'Required',
    pattern: '',
    example: '500'
  },

  rate: {
    placeholder: 'Enter rate',
    label: 'Rate',
    validation: 'Required',
    pattern: '',
    example: '45.50'
  },

  amount: {
    placeholder: 'Enter amount',
    label: 'Amount',
    validation: 'Required',
    pattern: '',
    example: '22750'
  },

  website: {
    placeholder: 'Enter website URL',
    label: 'Website',
    validation: '',
    pattern: '',
    example: 'https://example.com'
  },

  username: {
    placeholder: 'Enter username',
    label: 'Username',
    validation: 'Required',
    pattern: '',
    example: 'johndoe'
  },

  zipCode: {
    placeholder: 'Enter ZIP code',
    label: 'ZIP Code',
    validation: 'Required',
    pattern: '',
    example: '400001'
  },

  country: {
    placeholder: 'Enter country',
    label: 'Country',
    validation: 'Required',
    pattern: '',
    example: 'India'
  },

  state: {
    placeholder: 'Enter state',
    label: 'State',
    validation: 'Required',
    pattern: '',
    example: 'Maharashtra'
  },

  invoiceNumber: {
    placeholder: 'Enter invoice number',
    label: 'Invoice Number',
    validation: 'Required',
    pattern: '',
    example: 'PI/04/26/0001'
  },

  orderNumber: {
    placeholder: 'Enter order number',
    label: 'Order Number',
    validation: 'Required',
    pattern: '',
    example: 'PO/04/26/0001'
  },

  // Missing field types from the 21 required types
  pinCode: {
    placeholder: 'Enter PIN code',
    label: 'PIN Code',
    validation: 'Required',
    pattern: '',
    example: '400001'
  },

  phone: {
    placeholder: 'Enter phone number',
    label: 'Phone Number',
    validation: 'Required',
    pattern: '',
    example: '+91 9876543210'
  },

  date: {
    placeholder: 'Select date',
    label: 'Date',
    validation: 'Required',
    pattern: '',
    example: '2026-02-12'
  },

  fileUpload: {
    placeholder: 'Upload file...',
    label: 'File Upload',
    validation: 'Required',
    pattern: '',
    example: 'image.png'
  },

  dimension: {
    placeholder: 'Enter dimension (LxWxH)',
    label: 'Dimension',
    validation: 'Required',
    pattern: '',
    example: '600x600x9'
  }
};

/**
 * Get placeholder configuration for a field
 * @param {string} fieldName - Field name key
 * @returns {object} Field configuration with placeholder, validation, etc.
 */
export const getFieldConfig = (fieldName) => {
  return FIELD_PLACEHOLDERS[fieldName] || {
    placeholder: 'Enter value',
    label: fieldName,
    validation: 'Required',
    pattern: '.*',
    example: ''
  };
};

/**
 * Get all field labels for display
 */
export const getAllFieldLabels = () => {
  return Object.entries(FIELD_PLACEHOLDERS).map(([key, config]) => ({
    key,
    label: config.label,
    placeholder: config.placeholder,
    validation: config.validation
  }));
};

export default FIELD_PLACEHOLDERS;
