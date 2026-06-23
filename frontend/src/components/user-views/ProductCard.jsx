import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import { Package, Maximize, ArrowRight, Layers } from 'lucide-react';
import { tokenManager } from '../../utils/tokenManager.js';
import './UserViews.css';

const ProductCard = ({ product, onView }) => {
  // Extract primary image
  const imageUrl = product.images?.[0]?.url || product.images?.[0]?.path;
  const fullImageUrl = imageUrl 
    ? `${imageUrl.startsWith('http') ? '' : (import.meta.env.DEV || import.meta.env.MODE === 'development' ? '' : 'https://tile-erp-master-production.up.railway.app')}${imageUrl}?token=${tokenManager.getAccessToken() || ''}`
    : null;

  const displayName = product.companyProductName || product.name || 'Unnamed Product';
  const category = product.category || product.catalogueName || 'Tiles';

  return (
    <div className="uv-card">
      <div className="uv-image-wrapper">
        {product.status === 'Active' && (
          <div className="uv-status-badge uv-status-active">
            Active
          </div>
        )}
        <div className="uv-badge-container">
          <div className="uv-glass-badge">
            {category}
          </div>
        </div>
        
        {fullImageUrl ? (
          <img 
            src={fullImageUrl} 
            alt={displayName} 
            className="uv-card-image"
            onError={(e) => {
              if (!e.target.dataset.triedToken && !e.target.src.includes('token=')) {
                e.target.dataset.triedToken = 'true';
                const token = tokenManager.getAccessToken();
                if (token) e.target.src = `${e.target.src.split('?')[0]}?token=${token}`;
              } else {
                e.target.style.display = 'none';
                e.target.parentElement.classList.add('uv-no-image');
                e.target.insertAdjacentHTML('afterend', '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>');
              }
            }}
          />
        ) : (
          <div className="uv-no-image">
            <Package size={48} />
          </div>
        )}
      </div>

      <div className="uv-card-body">
        <h3 className="uv-product-title" title={displayName}>
          {displayName}
        </h3>
        
        <div className="uv-product-meta">
          {product.size && (
            <div className="uv-meta-item">
              <Maximize size={14} />
              <span>{Array.isArray(product.size) ? product.size.join(', ') : product.size}</span>
            </div>
          )}
          {product.surface && (
            <div className="uv-meta-item">
              <Layers size={14} />
              <span>{Array.isArray(product.surface) ? product.surface.join(', ') : product.surface}</span>
            </div>
          )}
        </div>

        <div className="uv-card-footer">
          <span className="fw-bold text-dark">
            {product.productCode ? `#${product.productCode}` : 'N/A'}
          </span>
          <Button 
            variant="outline-primary" 
            size="sm" 
            className="uv-btn-view px-3 rounded-pill"
            onClick={() => onView(product)}
          >
            View Details <ArrowRight size={14} className="ms-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
