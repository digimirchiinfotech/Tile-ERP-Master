import { z } from 'zod';
import { commonSchemas } from './commonSchemas.js';

export const supplierSchema = z.object({
  name: commonSchemas.requiredString('Supplier Factory Name').max(100, 'Name is too long'),
  country: commonSchemas.requiredString('Country'),
  city: commonSchemas.requiredString('City'),
  address: commonSchemas.requiredString('Address'),
  contactPersonName: commonSchemas.requiredString('Contact Person Name').max(100, 'Name is too long'),
  emailId: commonSchemas.requiredEmail,
  contactNumber: commonSchemas.requiredPhone,
  gstn: commonSchemas.gstn,
  pan: commonSchemas.pan,
  productCategories: z.array(z.string()).default([]),
  qualityRating: z.number().min(1).max(5).nullable().optional(),
  status: z.string().default('Active'),
  notes: commonSchemas.optionalString,
  bankDetails: z.object({
    bankName: commonSchemas.optionalString,
    branch: commonSchemas.optionalString,
    accountNumber: commonSchemas.optionalString,
    ifscCode: commonSchemas.optionalString,
  }).optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal('')),
  leadTime: commonSchemas.optionalString,
  paymentTerms: commonSchemas.optionalString,
});

export const defaultSupplierValues = {
  name: '',
  country: '',
  city: '',
  address: '',
  contactPersonName: '',
  emailId: '',
  contactNumber: '',
  gstn: '',
  pan: '',
  productCategories: [],
  qualityRating: null,
  status: 'Active',
  notes: '',
  bankDetails: {
    bankName: '',
    branch: '',
    accountNumber: '',
    ifscCode: '',
  },
  website: '',
  leadTime: '',
  paymentTerms: '',
};
