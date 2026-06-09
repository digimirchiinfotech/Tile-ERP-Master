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

import { z } from 'zod';

// Reusable standard Regex patterns
const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const iecRegex = /^[0-9]{10}$/;

export const commonSchemas = {
  id: z.string().uuid("Invalid ID format"),
  
  // Basic Strings
  requiredString: (fieldName) => z.string().trim().min(1, `${fieldName} is required`),
  optionalString: z.string().trim().optional().or(z.literal('')),
  
  // Specific Formats
  email: z.string().trim().email("Invalid email format").optional().or(z.literal('')),
  requiredEmail: z.string().trim().email("Invalid email format"),
  
  phone: z.string().trim().regex(phoneRegex, "Invalid phone number format").optional().or(z.literal('')),
  requiredPhone: z.string().trim().regex(phoneRegex, "Invalid phone number format"),
  
  gstn: z.string().trim().toUpperCase().regex(gstRegex, "Invalid GST format (e.g. 22AAAAA0000A1Z5)").optional().or(z.literal('')),
  pan: z.string().trim().toUpperCase().regex(panRegex, "Invalid PAN format").optional().or(z.literal('')),
  iec: z.string().trim().regex(iecRegex, "Invalid IEC format (10 digits)").optional().or(z.literal('')),
  
  // Numbers
  numericId: z.coerce.number().int().positive("Invalid ID"),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  requiredAmount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  
  // Dates
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional().or(z.literal('')),
  requiredDateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
};
