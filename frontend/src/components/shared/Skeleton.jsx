import React from 'react';
import './Skeleton.css';

/**
 * Reusable Skeleton loader component for various UI elements.
 * @param {Object} props
 * @param {number} props.rows - Number of skeleton rows/items to render
 * @param {'table' | 'card' | 'form' | 'text'} props.type - Type of skeleton
 * @param {string} props.className - Additional classes
 */
const Skeleton = ({ rows = 1, type = 'text', className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'table':
        return (
          <div className="skeleton-table">
            <div className="skeleton-table-header"></div>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skeleton-table-row">
                <div className="skeleton-cell w-5"></div>
                <div className="skeleton-cell w-20"></div>
                <div className="skeleton-cell w-30"></div>
                <div className="skeleton-cell w-15"></div>
                <div className="skeleton-cell w-10"></div>
                <div className="skeleton-cell w-20"></div>
              </div>
            ))}
          </div>
        );
      case 'card':
        return (
          <div className="skeleton-card-grid">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-card-icon"></div>
                <div className="skeleton-card-content">
                  <div className="skeleton-text w-50"></div>
                  <div className="skeleton-text w-100 title"></div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'form':
        return (
          <div className="skeleton-form">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skeleton-form-group">
                <div className="skeleton-text w-20 label"></div>
                <div className="skeleton-input"></div>
              </div>
            ))}
          </div>
        );
      case 'text':
      default:
        return (
          <div className="skeleton-text-group">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className={`skeleton-text ${i === rows - 1 && rows > 1 ? 'w-60' : 'w-100'}`}></div>
            ))}
          </div>
        );
    }
  };

  return <div className={`skeleton-container ${className}`}>{renderSkeleton()}</div>;
};

export default Skeleton;
