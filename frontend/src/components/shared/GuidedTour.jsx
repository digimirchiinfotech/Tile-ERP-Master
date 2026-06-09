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

import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Badge, ProgressBar } from 'react-bootstrap';
import { Play, ArrowRight, ArrowLeft, X, CheckCircle, Star, Lightbulb, Users, Package, FileText, BarChart3, Settings, Check, Upload } from 'lucide-react';

/**
 * Guided Tour Component
 * Provides interactive walkthrough for first-time users
 */
const GuidedTour = ({ show, onHide, currentUser }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [tourStarted, setTourStarted] = useState(false);

  // Tour steps based on user role
  const getTourSteps = (userRole) => {
    const commonSteps = [
      {
        id: 'welcome',
        title: 'Welcome to Tile Exporter Solution',
        description: 'Your comprehensive solution for product export management',
        content: 'This guided tour will help you navigate the system and discover key features tailored to your role.',
        icon: Star,
        action: null,
        tips: [
          'The system supports Tiles products',
          'Everything works offline-first with cached data',
          'Use keyboard shortcuts for faster navigation'
        ]
      },
      {
        id: 'navigation',
        title: 'Navigation & Layout',
        description: 'Learn how to navigate the system efficiently',
        content: 'The sidebar provides quick access to all modules. The top bar includes search, notifications, and your profile.',
        icon: Settings,
        action: 'highlight-sidebar',
        tips: [
          'Click the hamburger menu to collapse/expand sidebar',
          'Use the global search in the top bar',
          'Access quick actions from the top bar'
        ]
      },
      {
        id: 'theme',
        title: 'Personalize Your Experience',
        description: 'Switch between light and dark themes',
        content: 'You can toggle between light and dark modes for comfortable viewing. Your preference is saved automatically.',
        icon: Lightbulb,
        action: 'highlight-theme-toggle',
        tips: [
          'Press Ctrl+Shift+T to quickly toggle theme',
          'Theme preference is saved to your browser',
          'Dark mode is great for extended use'
        ]
      }
    ];

    const roleSpecificSteps = {
      sales_manager: [
        {
          id: 'dashboard',
          title: 'Sales Dashboard',
          description: 'Monitor your sales performance with real-time KPIs',
          content: 'View active leads, pending invoices, conversion rates, and revenue trends all in one place.',
          icon: BarChart3,
          action: 'navigate-dashboard',
          tips: [
            'Charts update in real-time with your data',
            'Click on metrics for detailed breakdowns',
            'Set up notifications for important events'
          ]
        },
        {
          id: 'products',
          title: 'Smart Tile Product',
          description: 'Manage products with advanced filtering and bundling',
          content: 'Use smart filters to find products by application (Bathroom, Kitchen, Outdoor).',
          icon: Package,
          action: 'navigate-products',
          tips: [
            'Try the smart filters for bathroom/kitchen products',
            'Create bundles combining multiple tile products',
            'Use multi-image upload for better product presentation'
          ]
        },
        {
          id: 'invoices',
          title: 'Invoice & Order Management',
          description: 'Create and manage proforma invoices efficiently',
          content: 'Generate professional invoices with automatic calculations, tax handling, and export documentation.',
          icon: FileText,
          action: 'navigate-invoices',
          tips: [
            'Invoices auto-calculate weights and volumes',
            'Export to multiple formats (PDF, Excel)',
            'Track payment status and overdue invoices'
          ]
        }
      ],
      qc: [
        {
          id: 'dashboard',
          title: 'Quality Control Dashboard',
          description: 'Monitor quality metrics and pending inspections',
          content: 'Track pending inspections, failed checks, quality scores, and daily completion rates.',
          icon: BarChart3,
          action: 'navigate-dashboard',
          tips: [
            'View quality trends over time',
            'Get alerts for failed inspections',
            'Track team performance metrics'
          ]
        },
        {
          id: 'qc-features',
          title: 'Advanced QC Features',
          description: 'Drag-and-drop tools and AI-ready functionality',
          content: 'Use modern QC tools including drag-and-drop pallet builders, pass/fail tags, and multi-media inspection support.',
          icon: CheckCircle,
          action: 'highlight-qc-tools',
          tips: [
            'Upload multiple inspection photos',
            'Use quick pass/fail tagging',
            'Generate automated QC reports'
          ]
        }
      ],
      account: [
        {
          id: 'dashboard',
          title: 'Financial Dashboard',
          description: 'Monitor payments and financial metrics',
          content: 'Track pending payments, overdue invoices, payment rates, and revenue trends.',
          icon: BarChart3,
          action: 'navigate-dashboard',
          tips: [
            'Set up payment reminders',
            'Export financial reports',
            'Monitor cash flow trends'
          ]
        },
        {
          id: 'finance-features',
          title: 'Advanced Finance Features',
          description: 'GST calculations and integration-ready tools',
          content: 'Handle GST/Tax calculations, generate credit/debit notes, and prepare for accounting software integration.',
          icon: FileText,
          action: 'highlight-finance',
          tips: [
            'Automatic GST calculations for India',
            'Export to Tally/QuickBooks format',
            'Generate payment receipts'
          ]
        }
      ],
      purchase: [
        {
          id: 'dashboard',
          title: 'Purchase Dashboard',
          description: 'Manage purchase orders and supplier relationships',
          content: 'Track pending POs, supplier deadlines, order values, and on-time delivery performance.',
          icon: BarChart3,
          action: 'navigate-dashboard',
          tips: [
            'Monitor supplier performance',
            'Track delivery deadlines',
            'Manage purchase workflows'
          ]
        }
      ]
    };

    return [
      ...commonSteps,
      ...(roleSpecificSteps[userRole] || roleSpecificSteps.sales_manager),
      {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        description: 'Work faster with keyboard shortcuts',
        content: 'Press ? to see all available shortcuts. Use Ctrl+Shift combinations for quick navigation.',
        icon: Settings,
        action: 'show-shortcuts',
        tips: [
          'Press ? anytime to see shortcuts',
          'Ctrl+N for new product/invoice',
          'Ctrl+F to focus search'
        ]
      },
      {
        id: 'complete',
        title: 'Tour Complete!',
        description: 'You\'re all set to use Tile Exporter Solution',
        content: 'You\'ve learned the basics. Explore the system and don\'t hesitate to use the help features.',
        icon: CheckCircle,
        action: null,
        tips: [
          'Your progress is automatically saved',
          'Access help anytime from the top bar',
          'Contact support for advanced features'
        ]
      }
    ];
  };

  const tourSteps = getTourSteps(currentUser?.role);
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  useEffect(() => {
    // Check if user has completed tour before
    const hasCompletedTour = localStorage.getItem(`tour-completed-${currentUser?.id}`);
    if (hasCompletedTour && !show) {
      return;
    }

    // Auto-start tour for first-time users
    if (show && !tourStarted) {
      setTourStarted(true);
    }
  }, [show, currentUser, tourStarted]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, tourSteps[currentStep].id]));
      setCurrentStep(prev => prev + 1);
      
      // Execute step action if any
      const action = tourSteps[currentStep + 1]?.action;
      if (action) {
        executeAction(action);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    // Mark tour as completed
    localStorage.setItem(`tour-completed-${currentUser?.id}`, 'true');
    onHide();
  };

  const handleComplete = () => {
    // Mark all steps as completed
    const allStepIds = tourSteps.map(step => step.id);
    setCompletedSteps(new Set(allStepIds));
    
    // Save completion status
    localStorage.setItem(`tour-completed-${currentUser?.id}`, 'true');
    localStorage.setItem(`tour-completed-date-${currentUser?.id}`, new Date().toISOString());
    
    onHide();
  };

  const executeAction = (action) => {
    switch (action) {
      case 'highlight-sidebar':
        // Add highlight class to sidebar
        setTimeout(() => {
          const sidebar = document.querySelector('.sidebar, [class*="sidebar"]');
          if (sidebar) {
            sidebar.classList.add('tour-highlight');
            setTimeout(() => sidebar.classList.remove('tour-highlight'), 3000);
          }
        }, 500);
        break;
      case 'highlight-theme-toggle':
        setTimeout(() => {
          const themeToggle = document.querySelector('.theme-toggle-btn, [class*="theme"]');
          if (themeToggle) {
            themeToggle.classList.add('tour-highlight');
            setTimeout(() => themeToggle.classList.remove('tour-highlight'), 3000);
          }
        }, 500);
        break;
      case 'navigate-dashboard':
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'role-dashboard' }));
        break;
      case 'navigate-products':
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'product-management' }));
        break;
      case 'navigate-invoices':
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'invoice-dashboard' }));
        break;
      case 'show-shortcuts':
        window.dispatchEvent(new CustomEvent('action', { detail: 'show-shortcuts' }));
        break;
    }
  };

  const currentStepData = tourSteps[currentStep];
  const IconComponent = currentStepData?.icon || Star;

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header>
        <Modal.Title className="d-flex align-items-center">
          <Play size={20} className="me-2 text-primary" />
          Guided Tour
          <Badge bg="info" className="ms-2">
            Step {currentStep + 1} of {tourSteps.length}
          </Badge>
        </Modal.Title>
        <div className="d-flex align-items-center">
          <Button variant="outline" size="sm" onClick={handleSkip} className="me-2">
            Skip Tour
          </Button>
          <Button variant="outline" size="sm" onClick={onHide}>
            <X size={16} />
          </Button>
        </div>
      </Modal.Header>

      <Modal.Body>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted">Progress</small>
            <small className="text-muted">{Math.round(progress)}%</small>
          </div>
          <ProgressBar now={progress} className="tour-progress" />
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center">
            <div className="tour-icon mb-3">
              <IconComponent size={48} className="text-primary" />
            </div>
            
            <h4 className="mb-2">{currentStepData.title}</h4>
            <p className="text-muted mb-3">{currentStepData.description}</p>
            
            <div className="tour-content mb-4">
              <p>{currentStepData.content}</p>
            </div>

            {/* Tips */}
            {currentStepData.tips && (
              <Card className="bg-light border-0 mb-4">
                <Card.Body className="py-3">
                  <h6 className="mb-2">
                    <Lightbulb size={16} className="me-2 text-warning" />
                    Pro Tips
                  </h6>
                  <ul className="list-unstyled mb-0 small text-start">
                    {currentStepData.tips.map((tip, index) => (
                      <li key={index} className="mb-1">
                        <span className="text-success me-2">✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            )}
          </Card.Body>
        </Card>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft size={16} className="me-1" />
          Previous
        </Button>

        <div className="d-flex gap-2">
          {currentStep === tourSteps.length - 1 ? (
            <Button variant="primary" onClick={handleComplete}>
              <CheckCircle size={16} className="me-1" />
              Complete Tour
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext}>
              Next
              <ArrowRight size={16} className="ms-1" />
            </Button>
          )}
        </div>
      </Modal.Footer>

      <style>{`
        .tour-progress {
          height: 6px;
        }

        .tour-icon {
          animation: float 2s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .tour-highlight {
          position: relative;
          animation: pulse-highlight 2s ease-in-out;
          box-shadow: 0 0 20px rgba(13, 110, 253, 0.5) !important;
          border: 2px solid #0d6efd !important;
          border-radius: 8px !important;
          z-index: 9999;
        }

        @keyframes pulse-highlight {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(13, 110, 253, 0.5);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(13, 110, 253, 0.8);
            transform: scale(1.02);
          }
        }

        .tour-content {
          font-size: 1.1rem;
          line-height: 1.6;
        }
      `}</style>
    </Modal>
  );
};

// Hook for managing guided tour
export const useGuidedTour = (currentUser) => {
  const [showTour, setShowTour] = useState(false);

  const startTour = () => setShowTour(true);
  const hideTour = () => setShowTour(false);

  // Check if user should see tour on first visit
  useEffect(() => {
    if (currentUser) {
      const hasCompletedTour = localStorage.getItem(`tour-completed-${currentUser.id}`);
      const hasSeenTour = localStorage.getItem(`tour-seen-${currentUser.id}`);
      
      if (!hasCompletedTour && !hasSeenTour) {
        // Mark as seen to avoid showing again until completed
        localStorage.setItem(`tour-seen-${currentUser.id}`, 'true');
        
        // Show tour after a short delay
        setTimeout(() => setShowTour(true), 1500);
      }
    }
  }, [currentUser]);

  return {
    showTour,
    startTour,
    hideTour
  };
};

export default GuidedTour;




