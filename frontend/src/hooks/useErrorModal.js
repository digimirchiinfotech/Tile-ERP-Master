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

import { useState } from 'react';
import { extractValidationErrors } from '../utils/validationHelper.js';

/**
 * Hook for managing error modal state and display
 * Simplifies error handling across all forms
 */
export const useErrorModal = () => {
  const [showError, setShowError] = useState(false);
  const [errors, setErrors] = useState({});
  const [errorTitle, setErrorTitle] = useState('Validation Error');

  const showErrorModal = (errorData, title = 'Validation Error') => {
    setErrorTitle(title);
    
    if (typeof errorData === 'string') {
      setErrors({ general: errorData });
    } else if (errorData.response?.data) {
      setErrors(extractValidationErrors(errorData));
    } else {
      setErrors(errorData);
    }
    
    setShowError(true);
  };

  const closeErrorModal = () => {
    setShowError(false);
    setTimeout(() => {
      setErrors({});
    }, 300);
  };

  return {
    showError,
    errors,
    errorTitle,
    showErrorModal,
    closeErrorModal
  };
};
