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

import React from 'react';
import { Button as BootstrapButton } from 'react-bootstrap';
import './Button.css';

/**
 * Standardized Button Component
 * Provides consistent button styling and behavior across the application
 */
const Button = React.forwardRef(({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  icon = null,
  children,
  className = '',
  type = 'button',
  block = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  title,
  ...props
}, ref) => {
  // Map our variants to Bootstrap variants
  const bootstrapVariant = {
    primary: 'primary',
    secondary: 'secondary',
    outline: 'outline-primary'
  }[variant] || variant;

  // Handle loading state
  const isDisabled = disabled || loading;
  const buttonContent = loading ? (
    <>
      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      {loadingText}
    </>
  ) : (
    <>
      {icon && <span className="button-icon me-2">{icon}</span>}
      {children}
    </>
  );

  return (
    <BootstrapButton
      ref={ref}
      variant={bootstrapVariant}
      size={size === 'md' ? undefined : size}
      disabled={isDisabled}
      type={type}
      className={`app-button app-button-${variant} ${block ? 'w-100' : ''} ${className}`}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      title={title}
      {...props}
    >
      {buttonContent}
    </BootstrapButton>
  );
});

Button.displayName = 'Button';

export default Button;




