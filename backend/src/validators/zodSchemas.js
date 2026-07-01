/**
 * Zod Schemas for strict DB boundary validation
 */
import { z } from 'zod';

// Utility for coercing strings to floats safely
const coerceFloat = z.union([z.number(), z.string().regex(/^-?\d*\.?\d*$/).transform(Number)]).optional().nullable();
const coerceInt = z.union([z.number(), z.string().regex(/^-?\d+$/).transform(Number)]).optional().nullable();

export const ProformaInvoiceSchema = z.object({
  invoice_no: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  client_id: z.string().uuid().optional().nullable().or(z.literal('')),
  client_name: z.string().max(255).optional(),
  subtotal: coerceFloat,
  discount: coerceFloat,
  tax: coerceFloat,
  total_amount: coerceFloat,
  pallets: coerceInt,
  total_sqm: coerceFloat,
  status: z.string().optional(),
  product_lines: z.array(z.any()).optional()
}).passthrough(); // Allow other fields to pass through but type-check the critical ones

export const ExportInvoiceSchema = z.object({
  invoice_no: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  client_id: z.string().uuid().optional().nullable().or(z.literal('')),
  total_amount: coerceFloat,
  status: z.string().optional(),
  product_lines: z.array(z.any()).optional()
}).passthrough();

export const PackingListSchema = z.object({
  pl_no: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  client_id: z.string().uuid().optional().nullable().or(z.literal('')),
  total_pallets: coerceInt,
  net_weight: coerceFloat,
  gross_weight: coerceFloat,
  status: z.string().optional(),
  product_lines: z.array(z.any()).optional()
}).passthrough();
