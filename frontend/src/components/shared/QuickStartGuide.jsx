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
import { Card, Row, Col } from 'react-bootstrap';
import { Play, BookOpen, Settings, HelpCircle, ArrowRight, Check } from 'lucide-react';
import './QuickStartGuide.css';

const QuickStartGuide = ({ onNavigate }) => {
  const steps = [
    {
      title: 'Setup Your Company',
      description: 'Configure your company profile, branding, and details for professional invoices.',
      icon: <Settings size={22} />,
      colorClass: 'qs-icon-blue',
      action: 'profile-settings',
      label: 'Go to Settings'
    },
    {
      title: 'Add Your Products',
      description: 'Manage your tiles, sanitaryware, and faucets inventory and catalogue.',
      icon: <BookOpen size={22} />,
      colorClass: 'qs-icon-green',
      action: 'product-management',
      label: 'Manage Products'
    },
    {
      title: 'Create Your First Invoice',
      description: 'Generate professional proforma invoices for your clients instantly.',
      icon: <Play size={22} />,
      colorClass: 'qs-icon-info',
      action: 'invoice-form',
      label: 'Create Invoice'
    },
    {
      title: 'Need Help?',
      description: 'Check out our support documentation for detailed walkthroughs.',
      icon: <HelpCircle size={22} />,
      colorClass: 'qs-icon-purple',
      action: 'support',
      label: 'Get Support'
    }
  ];

  return (
    <div className="quick-start-guide-wrapper">
      <div className="qs-header">
        <div>
          <h5 className="qs-title">Quick Start Guide</h5>
          <p className="text-muted small">Complete these steps to get your enterprise ready</p>
        </div>
        <div className="qs-badge">System Ready</div>
      </div>
      
      <Row className="g-4">
        {steps.map((step, index) => (
          <Col lg={3} md={6} key={index}>
            <div className="qs-step-card" style={{ color: step.colorClass.includes('blue') ? '#3b82f6' : step.colorClass.includes('green') ? '#22c55e' : step.colorClass.includes('info') ? '#06b6d4' : '#a855f7' }}>
              <div className={`qs-icon-wrapper ${step.colorClass}`}>
                {step.icon}
              </div>
              <h6 className="qs-step-title">{step.title}</h6>
              <p className="qs-step-desc">{step.description}</p>
              
              <button 
                className="qs-action-btn"
                onClick={() => onNavigate(step.action)}
              >
                <span>{step.label}</span>
                <ArrowRight size={16} className="arrow-icon" />
              </button>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default QuickStartGuide;




