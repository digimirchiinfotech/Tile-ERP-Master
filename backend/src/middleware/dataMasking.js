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
 * Masks sensitive fields based on user role
 * 
 * Visibility mapping:
 * - super_admin, company_admin, account: Full visibility
 * - sales_manager, sales_executive: Masked bank details (XXXX1234)
 * - client: No financial data (removed entirely)
 * - others: Masked GST/IEC
 */

const maskString = (str, visibleChars = 4) => {
  if (!str) return str;
  const strVal = String(str);
  if (strVal.length <= visibleChars) return '*'.repeat(strVal.length);
  return '*'.repeat(strVal.length - visibleChars) + strVal.slice(-visibleChars);
};

export const maskSensitiveData = (role, data) => {
  if (!data) return data;
  
  // Full visibility roles
  if (['super_admin', 'company_admin', 'admin', 'account'].includes(role)) {
    return data;
  }
  
  // Create a deep copy to avoid mutating original objects
  const maskedData = Array.isArray(data) 
    ? data.map(item => ({ ...item })) 
    : { ...data };
    
  const applyMasking = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Client role: completely remove financial data
    if (role === 'client') {
      delete obj.bank_account_number;
      delete obj.bank_account;
      delete obj.bank_details;
      delete obj.bank_ifsc;
      delete obj.account_number;
      delete obj.ifsc;
      delete obj.ifsc_code;
      delete obj.credit_limit;
      delete obj.gst_number;
      delete obj.iec_code;
      delete obj.pan_number;
      delete obj.pan_no;
      delete obj.bank_name;
      delete obj.branch;
      delete obj.swift_code;
    } 
    // Sales and others: Mask bank details and financial IDs
    else {
      if (obj.bank_account_number) obj.bank_account_number = maskString(obj.bank_account_number);
      if (obj.bank_account) obj.bank_account = maskString(obj.bank_account);
      if (obj.account_number) obj.account_number = maskString(obj.account_number);
      if (obj.bank_ifsc) obj.bank_ifsc = maskString(obj.bank_ifsc, 0); // Hide completely
      if (obj.ifsc) obj.ifsc = maskString(obj.ifsc, 0);
      if (obj.ifsc_code) obj.ifsc_code = maskString(obj.ifsc_code, 0);
      if (obj.gst_number) obj.gst_number = maskString(obj.gst_number, 4);
      if (obj.gst_no) obj.gst_no = maskString(obj.gst_no, 4);
      if (obj.iec_code) obj.iec_code = maskString(obj.iec_code, 2);
      if (obj.credit_limit !== undefined && obj.credit_limit !== null) obj.credit_limit = '****';
      if (obj.pan_number) obj.pan_number = maskString(obj.pan_number, 4);
      if (obj.pan_no) obj.pan_no = maskString(obj.pan_no, 4);
    }
    
    return obj;
  };
  
  if (Array.isArray(maskedData)) {
    return maskedData.map(applyMasking);
  }
  return applyMasking(maskedData);
};

/**
 * Middleware to intercept JSON responses and mask data
 */
export const dataMaskingMiddleware = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return next();
  }
  
  const role = req.user.role;
  
  // Skip intercept for full visibility roles
  if (['super_admin', 'company_admin', 'admin', 'account'].includes(role)) {
    return next();
  }
  
  const originalJson = res.json.bind(res);
  
  res.json = function (body) {
    try {
      if (body && body.success === true && body.data) {
        body.data = maskSensitiveData(role, body.data);
      }
    } catch (error) {
      console.error('Data masking error:', error);
    }
    return originalJson(body);
  };
  
  next();
};
