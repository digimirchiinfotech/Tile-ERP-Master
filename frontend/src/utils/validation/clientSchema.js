import { z } from 'zod';
import { commonSchemas } from './commonSchemas.js';

export const clientSchema = z.object({
  name: commonSchemas.requiredString('Client Firm Name').max(100, 'Name is too long'),
  contactPersonName: commonSchemas.requiredString('Contact Person Name').max(100, 'Name is too long'),
  country: commonSchemas.requiredString('Country'),
  city: commonSchemas.requiredString('City'),
  emailId: commonSchemas.requiredEmail,
  contactNumber: commonSchemas.requiredString('Contact Number').min(7, 'Contact number is too short'),
  businessType: commonSchemas.requiredString('Business Type'),
  assignedSales: commonSchemas.optionalString,
  address: commonSchemas.requiredString('Address'),
  consigneeDetails: commonSchemas.optionalString,
  buyerDetails: commonSchemas.optionalString,
  creditLimit: z.coerce.number().min(0, "Credit limit cannot be negative").optional().default(0),
  creditDays: z.coerce.number().int().min(0, "Credit days cannot be negative").optional().default(0),
  notes: commonSchemas.optionalString,
  portOfLoading: commonSchemas.optionalString,
  portOfDischarge: commonSchemas.optionalString,
  finalDestination: commonSchemas.optionalString,
  currency: commonSchemas.optionalString,
  status: z.string().default('Active')
});

export const defaultClientValues = {
  name: '',
  contactPersonName: '',
  country: '',
  city: '',
  emailId: '',
  contactNumber: '',
  businessType: '',
  assignedSales: '',
  address: '',
  consigneeDetails: '',
  buyerDetails: '',
  creditLimit: 0,
  creditDays: 0,
  notes: '',
  portOfLoading: '',
  portOfDischarge: '',
  finalDestination: '',
  currency: '',
  status: 'Active'
};
