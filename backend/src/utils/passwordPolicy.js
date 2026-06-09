/**
 * Production password policy and weak-password detection.
 */

const WEAK_PASSWORDS = new Set([
  'admin123',
  'password',
  'password123',
  '12345678',
  '123456789',
  'admin@123',
  'Admin@123',
  'tileexporter',
  'changeme',
  'qwerty123',
]);

export const isWeakPassword = (password) => {
  if (!password || typeof password !== 'string') return true;
  const normalized = password.trim().toLowerCase();
  if (WEAK_PASSWORDS.has(normalized) || WEAK_PASSWORDS.has(password.trim())) return true;
  return !validateStrongPassword(password).isValid;
};

export const validateStrongPassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 12) {
    return { isValid: false, error: 'Password must be at least 12 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }
  if (isBlocklistedPassword(password)) {
    return { isValid: false, error: 'Password is too common. Choose a stronger password.' };
  }
  return { isValid: true, error: null };
};

export const isBlocklistedPassword = (password) => {
  const normalized = password.trim().toLowerCase();
  return WEAK_PASSWORDS.has(normalized) || WEAK_PASSWORDS.has(password.trim());
};

export default { isWeakPassword, validateStrongPassword, isBlocklistedPassword };
