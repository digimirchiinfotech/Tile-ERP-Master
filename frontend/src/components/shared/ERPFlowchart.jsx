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
import { Card, Button, Badge, Container, Row, Col, Modal } from 'react-bootstrap';
import { Users, UserPlus, PackageSearch, FileText, ShoppingCart, CheckCircle, Box, Ship, DollarSign, ArrowDown, Info, Play, MessageSquare, ClipboardList, FileCheck, FileDigit, Truck, Anchor, Navigation, Calculator, Container as ContainerIcon, Stamp, ScrollText, FileArchive, Edit, Check, Upload } from 'lucide-react';

const ERPFlowchart = ({ onNavigate }) => {
  const [selectedStage, setSelectedStage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const workflowStages = [
    {
      id: 1,
      title: 'Product & Sanitaryware',
      icon: PackageSearch,
      color: '#6366f1',
      description: 'Manage ceramic tiles, slabs, and sanitaryware catalogs, sizes, and pricing',
      responsible: 'Product Manager',
      duration: 'Ongoing',
      actions: [
        'Add/Edit tile specifications (Size, Finish)',
        'Set HSN codes (e.g., 6907)',
        'Define weight per box/sqm',
        'Upload high-res product images',
      ],
      navigateTo: 'product-management',
      keyPoints: [
        'Centralized tile & sanitary database',
        'Track technical specifications',
        'Image management for digital catalogs',
      ],
    },
    {
      id: 2,
      title: 'Catalogue',
      icon: ClipboardList,
      color: '#8b5cf6',
      description: 'Create and manage PDF product catalogues for international clients',
      responsible: 'Sales Team',
      duration: '1-2 days',
      actions: [
        'Create custom tile catalogues',
        'Select sizes (e.g., 600x1200mm)',
        'Generate branded PDF catalogues',
        'Share with potential importers',
      ],
      navigateTo: 'catalogue-management',
      keyPoints: [
        'Professional PDF generation',
        'Quick product selection',
        'Version control for collections',
      ],
    },
    {
      id: 3,
      title: 'User',
      icon: Users,
      color: '#ec4899',
      description: 'System user management and access control for the export team',
      responsible: 'Administrator',
      duration: 'Immediate',
      actions: [
        'Create user accounts',
        'Assign roles (Sales, QC, Export)',
        'Manage module permissions',
        'Monitor user activity',
      ],
      navigateTo: 'user-management',
      keyPoints: [
        'Role-based access control',
        'Secure password management',
        'Department-wise data isolation',
      ],
    },
    {
      id: 4,
      title: 'Supplier',
      icon: UserPlus,
      color: '#f59e0b',
      description: 'Manage supplier database (kilns, raw materials, packaging)',
      responsible: 'Purchase Manager',
      duration: 'Ongoing',
      actions: [
        'Onboard tile manufacturers',
        'Record factory contact details',
        'Track procurement terms',
        'Monitor supplier performance',
      ],
      navigateTo: 'supplier-management',
      keyPoints: [
        'Complete factory profiles',
        'Procurement tracking',
        'Communication history',
      ],
    },
    {
      id: 5,
      title: 'Client',
      icon: Users,
      color: '#10b981',
      description: 'Manage international importer database, terms, and consignee details',
      responsible: 'Sales Manager',
      duration: '2-5 days',
      actions: [
        'Create importer records',
        'Set international credit terms',
        'KYC & banking documentation',
        'Manage port of discharge details',
      ],
      navigateTo: 'client-management',
      keyPoints: [
        'Centralized global customer data',
        'Financial terms tracking',
        'Multiple consignee addresses',
      ],
    },
    {
      id: 6,
      title: 'Lead',
      icon: UserPlus,
      color: '#3b82f6',
      description: 'Track and qualify potential international tile buyers',
      responsible: 'Salesperson',
      duration: '1-3 days',
      actions: [
        'Lead entry and tracking',
        'Status progression (Cold/Hot)',
        'Identify target markets',
        'Convert to active importer',
      ],
      navigateTo: 'lead-management',
      keyPoints: [
        'Export pipeline management',
        'Source tracking (Exhibitions/Web)',
        'Follow-up reminders',
      ],
    },
    {
      id: 7,
      title: 'Client Conversation',
      icon: MessageSquare,
      color: '#06b6d4',
      description: 'Record interactions and negotiations with international buyers',
      responsible: 'Sales Executive',
      duration: 'Ongoing',
      actions: [
        'Log WhatsApp/Email notes',
        'Track specific tile requirements',
        'Follow-up scheduling',
        'Communication history',
      ],
      navigateTo: 'lead-management',
      keyPoints: [
        'Activity logging',
        'Contextual history',
        'Better relationship tracking',
      ],
    },
    {
      id: 8,
      title: 'Proforma Invoice',
      icon: FileText,
      color: '#f43f5e',
      description: 'Create formal quotations for tile exports with multiple currencies',
      responsible: 'Salesperson',
      duration: '1 day',
      actions: [
        'Select tiles and calculate sqm/boxes',
        'Configure shipping terms (FOB/CIF)',
        'Set foreign currency & exchange rate',
        'Generate PI PDF',
      ],
      navigateTo: 'invoice-dashboard',
      keyPoints: [
        'Automated container estimations',
        'Multiple currency support (USD/EUR)',
        'Professional PDF output',
      ],
    },
    {
      id: 9,
      title: 'Proforma Order',
      icon: ShoppingCart,
      color: '#14b8a6',
      description: 'Confirm tile orders and update production status',
      responsible: 'Sales Manager',
      duration: '2-3 days',
      actions: [
        'Convert PI to Confirmed Order',
        'Verify production schedule',
        'Confirm LC / Advance Payment',
        'Update order dispatch status',
      ],
      navigateTo: 'order-dashboard',
      keyPoints: [
        'Automatic data carry-forward',
        'Order status tracking',
        'Production scheduling',
      ],
    },
    {
      id: 10,
      title: 'Quality Control',
      icon: CheckCircle,
      color: '#6366f1',
      description: 'Inspect tiles for shade variation and defects before container stuffing',
      responsible: 'QC Inspector',
      duration: '1-2 days',
      actions: [
        'Perform physical inspections',
        'Check shade, grade, and thickness',
        'Upload factory/container photos',
        'Pass/Fail certification',
      ],
      navigateTo: 'qc-management',
      keyPoints: [
        'Thorough quality checks',
        'Visual evidence reporting',
        'Export compliance tracking',
      ],
    },
    {
      id: 11,
      title: 'Export Invoice',
      icon: FileText,
      color: '#8b5cf6',
      description: 'Generate final commercial export invoices for customs',
      responsible: 'Export Manager',
      duration: '1 day',
      actions: [
        'Prepare final commercial invoice',
        'Include port and vessel details',
        'FOB/CIF/CFR value calculations',
        'Generate customs docs',
      ],
      navigateTo: 'export-management',
      keyPoints: [
        'Customs regulation compliance',
        'Commercial documentation',
        'Legal validity for exports',
      ],
    },
    {
      id: 12,
      title: 'Packing List',
      icon: Box,
      color: '#ec4899',
      description: 'Detail tile boxes, pallets, net/gross weights, and container loading',
      responsible: 'Warehouse / Export Team',
      duration: '1 day',
      actions: [
        'Box-to-pallet mapping',
        'Calculate net/gross weights per pallet',
        'Allocate pallets to containers',
        'Generate packing list PDF',
      ],
      navigateTo: 'packing-list-management',
      keyPoints: [
        'Accurate shipping details',
        'Container load planning',
        'Logistics coordination',
      ],
    },
    {
      id: 13,
      title: 'IGST Invoice',
      icon: FileText,
      color: '#f59e0b',
      description: 'Generate IGST invoices for export tax compliance under LUT or on Payment',
      responsible: 'Accountant / Export Exec',
      duration: '1 day',
      actions: [
        'Calculate IGST amount',
        'Generate tax invoice',
        'Map with Export Invoice',
      ],
      navigateTo: 'igst-invoice',
      keyPoints: [
        'GST compliance',
        'Tax refund claims',
        'Accurate tax computation',
      ],
    },
    {
      id: 14,
      title: 'Annexure',
      icon: FileDigit,
      color: '#f59e0b',
      description: 'Detailed item-wise export document supplement with exact weights and HSN',
      responsible: 'Export Executive',
      duration: '1 day',
      actions: [
        'Create customs annexures',
        'Map line items',
        'Detail HSN (6907) & Weights',
        'Generate supplement PDF',
      ],
      navigateTo: 'export-invoice-annexure',
      keyPoints: [
        'Detailed breakdown',
        'Customs compliance',
        'Weight verification',
      ],
    },
    {
      id: 15,
      title: 'Invoice Backside',
      icon: FileCheck,
      color: '#10b981',
      description: 'Standard terms and conditions, declarations under GST, and LUT details',
      responsible: 'Compliance Officer',
      duration: 'Immediate',
      actions: [
        'Manage T&C text',
        'GST/LUT annexure info',
        'Legal declarations (Non-Weed/Wood)',
        'Print backside document',
      ],
      navigateTo: 'invoice-backside',
      keyPoints: [
        'Standardized legal terms',
        'Regulatory requirements',
        'Clearance declarations',
      ],
    },
    {
      id: 16,
      title: 'VGM (Verified Gross Mass)',
      icon: Anchor,
      color: '#3b82f6',
      description: 'Certified gross mass documentation for loaded tile containers',
      responsible: 'Shipping Manager',
      duration: '1 day',
      actions: [
        'Record weighbridge data',
        'Certify container gross mass',
        'Submit VGM to shipping line',
        'Document method 1/2',
      ],
      navigateTo: 'vgm',
      keyPoints: [
        'SOLAS safety compliance',
        'Accurate weight reporting',
        'Carrier coordination',
      ],
    },
    {
      id: 17,
      title: 'Shipping Instructions',
      icon: Navigation,
      color: '#06b6d4',
      description: 'Final instructions to shipping lines including container and seal numbers',
      responsible: 'Logistics Team',
      duration: '1 day',
      actions: [
        'Define port of loading/discharge',
        'Specify carrier and vessel info',
        'Provide BL drafting instructions',
        'Submit shipping bill details',
      ],
      navigateTo: 'export-shipping-instructions',
      keyPoints: [
        'Accurate routing info',
        'BL detail precision',
        'Smooth port handling',
      ],
    },
    {
      id: 18,
      title: 'Finance and Accounts',
      icon: Calculator,
      color: '#14b8a6',
      description: 'Track foreign remittances, manage forex realization, and reconcile ledgers',
      responsible: 'Accountant',
      duration: 'Ongoing',
      actions: [
        'Record incoming SWIFT payments',
        'Reconcile invoices',
        'Generate aging reports',
        'Manage eBRC / bank realization',
      ],
      navigateTo: 'account-finance-management',
      keyPoints: [
        'Forex cash flow management',
        'Order-to-cash analysis',
        'Comprehensive reporting',
      ],
    },
  ];

  const handleStageClick = (stage) => {
    setSelectedStage(stage);
    setShowModal(true);
  };

  const getStageIndex = (stage) => {
    return workflowStages.findIndex((s) => s.id === stage.id);
  };

  const handleNavigateToModule = (navigateTo) => {
    setShowModal(false);
    if (onNavigate && navigateTo) {
      onNavigate(navigateTo);
    }
  };

  return (
    <Container fluid className="py-4">
      <style>{`
        .erp-timeline {
          position: relative;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px 0;
        }
        .erp-timeline::after {
          content: '';
          position: absolute;
          width: 4px;
          background: #cbd5e1;
          top: 0;
          bottom: 0;
          left: 50%;
          margin-left: -2px;
          border-radius: 4px;
        }
        .erp-timeline-item {
          padding: 10px 40px;
          position: relative;
          background: inherit;
          width: 50%;
          margin-bottom: 20px;
        }
        .erp-timeline-item.left {
          left: 0;
        }
        .erp-timeline-item.right {
          left: 50%;
        }
        .erp-timeline-item::after {
          content: '';
          position: absolute;
          width: 24px;
          height: 24px;
          right: -12px;
          background-color: white;
          border: 4px solid var(--bs-primary, #3b82f6);
          top: 32px;
          border-radius: 50%;
          z-index: 1;
        }
        .erp-timeline-item.right::after {
          left: -12px;
        }
        .workflow-stage-card {
          transition: all 0.3s ease;
          border: none;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .workflow-stage-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 20px rgba(0,0,0,0.1);
        }
        @media screen and (max-width: 768px) {
          .erp-timeline::after {
            left: 31px;
          }
          .erp-timeline-item {
            width: 100%;
            padding-left: 70px;
            padding-right: 25px;
          }
          .erp-timeline-item.right {
            left: 0%;
          }
          .erp-timeline-item.left::after, .erp-timeline-item.right::after {
            left: 19px;
          }
        }
      `}</style>
      
      <div className="text-center mb-5">
        <h2 className="fw-bold text-primary">
          <Play className="me-2" size={32} />
          Complete ERP Business Workflow
        </h2>
        <p className="text-muted">
          Follow the step-by-step process from product creation to financial settlement
        </p>
      </div>

      <div className="erp-timeline">
        {workflowStages.map((stage, index) => {
          const isLeft = index % 2 === 0;
          return (
            <div 
              key={stage.id} 
              className={`erp-timeline-item ${isLeft ? 'left' : 'right'}`}
            >
              <Card
                className="workflow-stage-card h-100"
                style={{
                  cursor: 'pointer',
                  borderTop: `4px solid ${stage.color}`,
                }}
                onClick={() => handleStageClick(stage)}
              >
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <div
                      className="rounded-circle p-3 me-3 flex-shrink-0"
                      style={{ backgroundColor: `${stage.color}20` }}
                    >
                      {(() => {
                        const Icon = stage.icon;
                        return <Icon size={32} color={stage.color} />;
                      })()}
                    </div>
                    <div>
                      <h5 className="mb-0 fw-bold">{stage.title}</h5>
                      <Badge
                        bg="secondary"
                        className="mt-1"
                        style={{ fontSize: '0.7rem' }}
                      >
                        Step {stage.id} of {workflowStages.length}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-muted mb-3" style={{ fontSize: '0.95rem' }}>
                    {stage.description}
                  </p>

                  <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#f8fafc' }}>
                    <small className="text-muted d-block text-truncate mb-1">
                      <strong>Responsible:</strong> <span className="text-dark">{stage.responsible}</span>
                    </small>
                    <small className="text-muted d-block">
                      <strong>Duration:</strong> <span className="text-dark">{stage.duration}</span>
                    </small>
                  </div>

                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="w-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStageClick(stage);
                    }}
                  >
                    <Info size={16} className="me-2" />
                    View Details
                  </Button>
                </Card.Body>
              </Card>
            </div>
          );
        })}
      </div>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
      >
        {selectedStage && (
          <>
            <Modal.Header closeButton style={{ borderBottom: `4px solid ${selectedStage.color}` }}>
              <Modal.Title className="d-flex align-items-center">
                <div
                  className="rounded-circle p-2 me-3"
                  style={{ backgroundColor: `${selectedStage.color}20` }}
                >
                  {(() => {
                    const Icon = selectedStage.icon;
                    return <Icon size={28} color={selectedStage.color} />;
                  })()}
                </div>
                <div>
                  <h4 className="mb-0">{selectedStage.title}</h4>
                  <small className="text-muted">{selectedStage.description}</small>
                </div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <h6 className="fw-bold text-primary mb-2">
                    <Users size={18} className="me-2" />
                    Responsible
                  </h6>
                  <p className="text-muted">{selectedStage.responsible}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6 className="fw-bold text-primary mb-2">Duration</h6>
                  <p className="text-muted">{selectedStage.duration}</p>
                </Col>
              </Row>

              <div className="mb-3">
                <h6 className="fw-bold text-primary mb-2">Key Actions</h6>
                <ul className="list-unstyled">
                  {selectedStage.actions.map((action, idx) => (
                    <li key={idx} className="mb-2">
                      <CheckCircle size={16} className="me-2 text-success" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedStage.keyPoints && (
                <div className="mb-3">
                  <h6 className="fw-bold text-primary mb-2">Key Points</h6>
                  <ul className="list-unstyled">
                    {selectedStage.keyPoints.map((point, idx) => (
                      <li key={idx} className="mb-2">
                        <Info size={16} className="me-2 text-info" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedStage && getStageIndex(selectedStage) < workflowStages.length - 1 && (
                <div className="alert alert-info mb-0">
                  <strong>Next Stage:</strong> {workflowStages[getStageIndex(selectedStage) + 1]?.title || 'Complete'}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Close
              </Button>
              {selectedStage.navigateTo && (
                <Button
                  variant="primary"
                  onClick={() => handleNavigateToModule(selectedStage.navigateTo)}
                >
                  Go to {selectedStage.title} Module
                </Button>
              )}
            </Modal.Footer>
          </>
        )}
      </Modal>
    </Container>
  );
};

export default ERPFlowchart;





