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

import { Spinner } from 'react-bootstrap';

/**
 * Professional Loading Spinner Component
 * Provides consistent loading states across the application
 */
function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  text = 'Loading...',
  overlay = false,
  fullScreen = false,
}) {
  const getSpinnerSize = () => {
    const sizes = {
      sm: { width: '1rem', height: '1rem' },
      md: { width: '2rem', height: '2rem' },
      lg: { width: '3rem', height: '3rem' },
      xl: { width: '4rem', height: '4rem' },
    };
    return sizes[size] || sizes.md;
  };

  const spinnerElement = (
    <div
      className={`loading-spinner ${overlay ? 'loading-overlay' : ''} ${
        fullScreen ? 'loading-fullscreen' : ''
      }`}
    >
      <div className="spinner-content">
        <Spinner
          animation="border"
          variant={variant}
          style={getSpinnerSize()}
          className="spinner-element"
        />
        {text && <div className="spinner-text mt-3">{text}</div>}
      </div>

      <style>{`
        .loading-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(2px);
          z-index: 1000;
        }

        .loading-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(4px);
          z-index: 9999;
        }

        .spinner-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .spinner-element {
          animation: spin 1s linear infinite;
        }

        .spinner-text {
          color: #6c757d;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Pulse animation for overlay */
        .loading-overlay .spinner-content {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );

  return spinnerElement;
}

/**
 * Table Loading Spinner
 */
export const TableLoadingSpinner = ({ colSpan = 5 }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-5">
      <LoadingSpinner size="md" text="Loading data..." />
    </td>
  </tr>
);

/**
 * Button Loading Spinner
 */
export const ButtonLoadingSpinner = ({ size = 'sm' }) => (
  <Spinner
    as="span"
    animation="border"
    size={size}
    role="status"
    className="me-2"
  />
);

/**
 * Card Loading Spinner
 */
export const CardLoadingSpinner = ({ height = '200px' }) => (
  <div style={{ height, position: 'relative' }}>
    <LoadingSpinner overlay={true} text="Loading..." />
  </div>
);

export default LoadingSpinner;




