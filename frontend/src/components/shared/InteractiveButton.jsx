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
import { Button, Spinner } from 'react-bootstrap';

/**
 * Professional Interactive Button Component
 * Provides consistent button behavior with loading states and feedback
 */
function InteractiveButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  loadingText = 'Processing...',
  icon = null,
  className = '',
  type = 'button',
  block = false,
  ...props
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handle button click with loading state management
   */
  const handleClick = async (e) => {
    if (disabled || loading || isProcessing) {
      return;
    }

    if (onClick) {
      try {
        setIsProcessing(true);
        await onClick(e);
      } catch (error) {
        console.error('Button action error:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const isLoading = loading || isProcessing;
  const buttonSize = size === 'md' ? undefined : size;

  return (
    <Button
      variant={variant}
      size={buttonSize}
      disabled={disabled || isLoading}
      onClick={handleClick}
      type={type}
      className={`interactive-button ${block ? 'w-100' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            className="me-2"
          />
          {loadingText}
        </>
      ) : (
        <>
          {icon && <span className="button-icon me-2">{icon}</span>}
          {children}
        </>
      )}

      <style>{`
        .interactive-button {
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.2s ease;
          border-width: 2px;
          position: relative;
          overflow: hidden;
        }

        .interactive-button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .interactive-button:not(:disabled):active {
          transform: translateY(0);
        }

        .interactive-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .interactive-button .button-icon {
          display: inline-flex;
          align-items: center;
        }

        /* Ripple effect */
        .interactive-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.3s ease, height 0.3s ease;
        }

        .interactive-button:active::before {
          width: 300px;
          height: 300px;
        }

        /* Size variations */
        .interactive-button.btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }

        .interactive-button.btn-lg {
          padding: 0.75rem 1.5rem;
          font-size: 1.125rem;
        }

        /* Variant-specific hover effects */
        .interactive-button.btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #0b5ed7 0%, #0a58ca 100%);
        }

        .interactive-button.btn-success:hover:not(:disabled) {
          background: linear-gradient(135deg, #157347 0%, #146c43 100%);
        }

        .interactive-button.btn-danger:hover:not(:disabled) {
          background: linear-gradient(135deg, #bb2d3b 0%, #b02a37 100%);
        }

        .interactive-button.btn-warning:hover:not(:disabled) {
          background: linear-gradient(135deg, #e0a800 0%, #d39e00 100%);
        }

        .interactive-button.btn-info:hover:not(:disabled) {
          background: linear-gradient(135deg, #0aa2c0 0%, #099fbc 100%);
        }
      `}</style>
    </Button>
  );
}

export default InteractiveButton;




