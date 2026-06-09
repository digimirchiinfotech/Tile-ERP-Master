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
 * Form Validation UI Helper
 * Enterprise-level utility for scrolling to errors and showing feedback
 */

/**
 * Auto-scroll to the first invalid field on the form
 */
export const scrollToFirstError = () => {
  setTimeout(() => {
    // Find the first field with is-invalid class
    const firstInvalidField = document.querySelector('.is-invalid');
    if (firstInvalidField) {
      // Find the closest form group to scroll to its label too
      const formGroup = firstInvalidField.closest('.form-group') || firstInvalidField.parentElement;
      
      formGroup.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      
      // Focus the field if possible
      if (typeof firstInvalidField.focus === 'function') {
        firstInvalidField.focus({ preventScroll: true });
      }
    }
  }, 100);
};

/**
 * Format a validation error object for Toast display
 * Usually, you would use a toast library like react-hot-toast or react-toastify.
 * This function returns standard error text for your existing Alert components.
 */
export const getValidationErrorMessage = (errors) => {
  const errorCount = Object.keys(errors).length;
  if (errorCount === 0) return '';
  return `Please fill all mandatory fields correctly. Found ${errorCount} error(s).`;
};
