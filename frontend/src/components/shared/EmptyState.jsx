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
import { Card } from 'react-bootstrap';
import { FileQuestion, Plus } from 'lucide-react';
import Button from './Button.jsx';
import './EmptyState.css';

/**
 * EmptyState Component
 * Displays a friendly message and a CTA when a list or dashboard has no data.
 * 
 * @param {object} props
 * @param {string} props.title - The bold title explaining the empty state.
 * @param {string} props.description - A helpful subtext explaining what to do.
 * @param {React.ReactNode} [props.icon] - Optional lucide-react icon to display. Defaults to FileQuestion.
 * @param {string} [props.actionLabel] - The text for the primary call-to-action button.
 * @param {function} [props.onAction] - The function to call when the CTA is clicked.
 */
const EmptyState = ({ 
  title = "No Data Found", 
  description = "Get started by creating your first record.", 
  icon: Icon = FileQuestion, 
  actionLabel, 
  onAction 
}) => {
  return (
    <Card className="empty-state-wrapper text-center border-0 shadow-sm my-4">
      <Card.Body className="p-5 d-flex flex-column align-items-center justify-content-center">
        <div className="empty-state-icon-container mb-4">
          <Icon size={64} className="empty-state-icon text-muted opacity-50" strokeWidth={1} />
        </div>
        <h4 className="empty-state-title fw-semibold text-dark mb-2">
          {title}
        </h4>
        <p className="empty-state-desc text-muted mb-4" style={{ maxWidth: '400px', margin: '0 auto' }}>
          {description}
        </p>
        
        {actionLabel && onAction && (
          <Button 
            variant="primary" 
            className="empty-state-action-btn glow-effect mt-2" 
            onClick={onAction}
            size="lg"
          >
            <Plus size={18} className="me-2" />
            {actionLabel}
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

export default EmptyState;
