const fs = require('fs');

const validatorsFile = 'd:/Tile ERP/frontend/src/utils/validators.js';
let validatorsContent = fs.readFileSync(validatorsFile, 'utf8');

const contactTarget = `export function validateContactNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') return { isValid: false, error: 'Contact number is required' };
  const trimmed = phoneNumber.trim();
  const phoneRegex = /^(\\+\\d{1,3})?[\\s.-]?\\d{1,14}$/;
  if (!phoneRegex.test(trimmed)) return { isValid: false, error: 'Invalid phone number format' };
  const digits = trimmed.replace(/\\D/g, '');
  if (digits.length < 7 || digits.length > 15) return { isValid: false, error: 'Phone must have 7-15 digits' };
  return { isValid: true, error: null };
};`;

const contactReplacement = `export function validateContactNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') return { isValid: false, error: 'Contact number is required' };
  const cleaned = phoneNumber.replace(/\\s+/g, '');
  const phoneRegex = /^\\+?\\d{7,15}$/;
  if (!phoneRegex.test(cleaned)) return { isValid: false, error: 'Please enter a valid phone number.' };
  return { isValid: true, error: null };
};`;

validatorsContent = validatorsContent.replace(contactTarget, contactReplacement);

fs.writeFileSync(validatorsFile, validatorsContent);
console.log('patched validators.js');
