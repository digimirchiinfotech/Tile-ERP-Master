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
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { 
  restrictToNumbers, 
  restrictToLetters, 
  restrictToDecimal,
  sanitizeEmail,
  getValidationError 
} from '../../utils/inputHelpers.js';

/**
 * Enhanced Form Field Component with Built-in Validation and Input Restrictions
 * Provides real-time validation, input restrictions, and user-friendly error messages
 */
function EnhancedFormField({
  // Standard form field props
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  as = 'input',
  children,
  className = '',
  
  // Validation props
  required = false,
  validation = 'none', // 'email', 'phone', 'number', 'decimal', 'letters', 'none'
  minLength,
  maxLength,
  decimalPlaces = 2,
  allowSpaces = true,
  
  // Display props
  showValidationIcon = true,
  showRealTimeValidation = true,
  
  // Error state
  error,
  isInvalid,

  // User Guidance
  tooltip,
  
  ...props
}) {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState('');

  /**
   * Handles input changes with proper restrictions and validation
   */
  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Apply input restrictions based on validation type
    switch (validation) {
      case 'phone':
        newValue = restrictToNumbers(newValue, true);
        break;
      case 'number':
        newValue = restrictToNumbers(newValue, false);
        break;
      case 'decimal':
        newValue = restrictToDecimal(newValue, decimalPlaces);
        break;
      case 'letters':
        newValue = restrictToLetters(newValue, allowSpaces);
        break;
      case 'email':
        newValue = sanitizeEmail(newValue);
        break;
      case 'alphanumeric':
        // Allow letters, numbers, and optionally spaces
        newValue = newValue.replace(
          allowSpaces ? /[^a-zA-Z0-9\s]/g : /[^a-zA-Z0-9]/g, 
          ''
        );
        break;
      case 'name':
        // Allow letters, spaces, hyphens, apostrophes, and periods
        newValue = newValue.replace(/[^a-zA-Z\s\-'\.]/g, '');
        break;
    }
    
    // Create a new event object with the sanitized value
    const sanitizedEvent = {
      ...e,
      target: {
        ...e.target,
        value: newValue,
        name: name
      }
    };
    
    // Call the parent onChange handler
    onChange(sanitizedEvent);
    
    // Real-time validation if enabled
    if (showRealTimeValidation && touched) {
      const validationError = getValidationError(newValue, validation, {
        required,
        minLength,
        maxLength,
        label
      });
      setLocalError(validationError);
    }
  };

  /**
   * Handles field blur events
   */
  const handleBlur = (e) => {
    setTouched(true);
    
    // Validate on blur
    if (showRealTimeValidation) {
      const validationError = getValidationError(value, validation, {
        required,
        minLength,
        maxLength,
        label
      });
      setLocalError(validationError);
    }
    
    if (onBlur) {
      onBlur(e);
    }
  };

  // Determine which error to show (prop error takes precedence)
  const displayError = error || (touched && localError);
  const hasError = isInvalid || (touched && !!localError);

  // Get input type based on validation
  const getInputType = () => {
    switch (validation) {
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      case 'number':
      case 'decimal':
        return 'text'; // Use text to allow custom formatting
      default:
        return type;
    }
  };

  return (
    <Form.Group className={`enhanced-form-field ${className}`}>
      <Form.Label className="fw-medium">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
        {tooltip && (
          <OverlayTrigger placement="top" overlay={<Tooltip>{tooltip}</Tooltip>}>
            <span className="ms-1" style={{ cursor: 'help' }}>ℹ️</span>
          </OverlayTrigger>
        )}
      </Form.Label>
      
      <div className="input-wrapper position-relative">
        <Form.Control
          as={as}
          type={getInputType()}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          isInvalid={hasError}
          isValid={touched && !hasError && value && validation !== 'none'}
          className="enhanced-input"
          autoComplete={validation === 'email' ? 'email' : validation === 'phone' ? 'tel' : 'off'}
          {...props}
        >
          {children}
        </Form.Control>
        
        {/* Validation feedback */}
        {displayError && (
          <Form.Control.Feedback type="invalid">
            {displayError}
          </Form.Control.Feedback>
        )}
        
        {/* Success feedback for better UX */}
        {touched && !hasError && value && validation !== 'none' && (
          <Form.Control.Feedback type="valid">
            Looks good!
          </Form.Control.Feedback>
        )}
      </div>
      
      {/* Help text for complex validations */}
      {validation === 'phone' && !touched && (
        <Form.Text className="text-muted">
          Enter phone number with country code (e.g., +1234567890)
        </Form.Text>
      )}
      
      {validation === 'email' && !touched && (
        <Form.Text className="text-muted">
          Enter a valid email address (e.g., user@example.com)
        </Form.Text>
      )}

      <style>{`
        .enhanced-form-field .enhanced-input {
          border-radius: var(--app-border-radius);
          border: 1px solid var(--app-border-color);
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          transition: all 0.2s ease-in-out;
          background: var(--app-card-bg);
          color: var(--app-text-primary);
        }
        
        .enhanced-form-field .enhanced-input:focus {
          border-color: var(--app-blue-500);
          box-shadow: var(--app-focus-ring);
          transform: translateY(-1px);
          outline: none;
        }

        .enhanced-form-field .enhanced-input.is-invalid {
          border-color: var(--bs-danger);
          box-shadow: 0 0 0 0.2rem rgba(220, 38, 38, 0.15);
        }

        .enhanced-form-field .enhanced-input.is-valid {
          border-color: var(--bs-success);
          box-shadow: 0 0 0 0.2rem rgba(5, 150, 105, 0.15);
        }

        .enhanced-form-field .form-label {
          color: var(--app-text-primary);
          font-weight: 600;
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .enhanced-form-field .invalid-feedback,
        .enhanced-form-field .valid-feedback {
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }

        .enhanced-form-field .form-text {
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        @media (max-width: 576px) {
          .enhanced-form-field .enhanced-input {
            padding: 0.6rem 0.8rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </Form.Group>
  );
}

export default EnhancedFormField;




