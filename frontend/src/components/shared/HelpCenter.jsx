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

import React, { useState } from 'react';
import { Container, Row, Col, Card, ListGroup, Accordion, Badge } from 'react-bootstrap';
import { BookOpen, Shield, HelpCircle, ChevronRight, Scale, Lock } from 'lucide-react';

const HelpCenter = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('onboarding');

  const sections = [
    { id: 'onboarding', label: 'User Manual', icon: BookOpen, color: 'primary' },
    { id: 'legal', label: 'Privacy & Terms', icon: Shield, color: 'success' },
    { id: 'support', label: 'Support FAQ', icon: HelpCircle, color: 'info' }
  ];

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      <div className="mb-4 px-3">
        <div className="d-flex align-items-center mb-1">
          <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">
            <HelpCircle className="text-primary" size={28} />
          </div>
          <div>
            <h3 className="fw-bold mb-0">Help & Support Hub</h3>
            <p className="text-muted mb-0">Your complete guide to the Tile Exporter SaaS Ecosystem.</p>
          </div>
        </div>
      </div>

      <Row className="g-4 px-3">
        {/* Navigation Sidebar */}
        <Col lg={3}>
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden sticky-top" style={{ top: '100px' }}>
            <ListGroup variant="flush">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <ListGroup.Item 
                    key={section.id}
                    action
                    active={activeTab === section.id}
                    onClick={() => setActiveTab(section.id)}
                    className="d-flex align-items-center py-3 border-0"
                    style={{ 
                      transition: 'all 0.2s',
                      background: activeTab === section.id ? 'var(--bs-primary)' : 'transparent',
                      color: activeTab === section.id ? 'white' : 'inherit'
                    }}
                  >
                    <Icon className={`me-3 ${activeTab === section.id ? 'text-white' : `text-${section.color}`}`} size={20} />
                    <span className="fw-bold">{section.label}</span>
                    <ChevronRight className="ms-auto" size={16} style={{ opacity: activeTab === section.id ? 1 : 0.3 }} />
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </Card>
        </Col>

        {/* Content Area */}
        <Col lg={9}>
          <Card className="border-0 shadow-sm rounded-4 p-4 min-vh-75">
            
            {/* --- TAB: ONBOARDING --- */}
            {activeTab === 'onboarding' && (
              <div className="animate__animated animate__fadeIn">
                <h4 className="fw-bold mb-4 d-flex align-items-center">
                  <BookOpen className="me-2 text-primary" /> Full User Onboarding Guide
                </h4>
                
                <Accordion defaultActiveKey="0" className="custom-help-accordion">
                  <Accordion.Item eventKey="0" className="border-0 mb-3 shadow-sm rounded-4 overflow-hidden">
                    <Accordion.Header className="bg-white"><Badge bg="primary" className="me-2">1</Badge> CRM & Proforma Workflows</Accordion.Header>
                    <Accordion.Body className="bg-white">
                      <p>The operational journey begins in the <b>CRM & Lead Registry</b>. Sales managers and executives capture market demand and establish price-lock agreements.</p>
                      <div className="small text-muted ps-2 border-start border-3 border-primary-subtle mb-3">
                        <p className="mb-1"><strong>Lead Registry:</strong> Capture potential clients, target ports, expected container volumes, and currency contexts.</p>
                        <p className="mb-1"><strong>Proforma Invoice (PI) & Orders:</strong> Generate formal quote agreements. The system auto-calculates total SQM (Square Meters), item-level tax structures, exchange rate conversions (USD/INR), and net/gross weights.</p>
                        <p className="mb-0"><strong>Conversion Safety:</strong> Once a Proforma Invoice is finalized and converted to an Export Invoice, the system locks the record to prevent duplicate document generations.</p>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>

                  <Accordion.Item eventKey="1" className="border-0 mb-3 shadow-sm rounded-4 overflow-hidden">
                    <Accordion.Header className="bg-white"><Badge bg="success" className="me-2">2</Badge> Quality Control (QC) & Audits</Accordion.Header>
                    <Accordion.Body className="bg-white">
                      <p>Before cargo is dispatched or packed, it undergoes rigorous inspection in the <b>Operations & QC Module</b> to maintain quality compliance.</p>
                      <div className="small text-muted ps-2 border-start border-3 border-success-subtle mb-3">
                        <p className="mb-1"><strong>QC Cards:</strong> QC inspectors log specific inspection cards bound to Proforma Orders, verifying tile shade numbers, water absorption limits, dimensional thickness, and breakage ratios.</p>
                        <p className="mb-1"><strong>Audit Trails:</strong> The <b>Consistency Checker Service</b> dynamically verifies that no QC inspections point to missing or deleted orders, ensuring clean relationships in the database.</p>
                        <p className="mb-0"><strong>Status Tracking:</strong> Displays visual statistics (Passed, Failed, Under Process) to give supervisors real-time pipeline visibility.</p>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>

                  <Accordion.Item eventKey="2" className="border-0 mb-3 shadow-sm rounded-4 overflow-hidden">
                    <Accordion.Header className="bg-white"><Badge bg="info" className="me-2">3</Badge> Export Invoicing & Customs Documents</Accordion.Header>
                    <Accordion.Body className="bg-white">
                      <p>Our unified <b>Export Pipeline</b> handles complex custom document generation, eliminating hours of manual data entry.</p>
                      <div className="small text-muted ps-2 border-start border-3 border-info-subtle mb-3">
                        <p className="mb-1"><strong>Export & IGST Invoices:</strong> Inherit all product details, FOC (Free of Cost) statuses, and container structures directly from the parent Proforma Invoice.</p>
                        <p className="mb-1"><strong>Packing Lists:</strong> Tracks item packaging structures, gross weights, seal markings, and total pallet counts.</p>
                        <p className="mb-1"><strong>Customs Annexures:</strong> Automatically inherits container numbers and pallet coordinates, displaying official declarations and mandatory FOC watermarks.</p>
                        <p className="mb-0"><strong>Invoice Backside:</strong> Pre-populates essential supply declarations and export promotion incentives (FTP scheme) formatted strictly to A4 custom standards.</p>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>

                  <Accordion.Item eventKey="3" className="border-0 mb-3 shadow-sm rounded-4 overflow-hidden">
                    <Accordion.Header className="bg-white"><Badge bg="warning" className="me-2">4</Badge> Logistics & Operational Uptime</Accordion.Header>
                    <Accordion.Body className="bg-white">
                      <p>Complete the logistical cycle with port clearance certifications and automated data parity verification.</p>
                      <div className="small text-muted ps-2 border-start border-3 border-warning-subtle mb-3">
                        <p className="mb-1"><strong>VGM Certificate:</strong> Automatically compiles container tare weights and cargo specifications to generate standard Verified Gross Mass certificates.</p>
                        <p className="mb-1"><strong>Shipping Instructions (SI):</strong> Submits all booking numbers, container details, ports of loading/discharge, and vessel descriptions to forwarders.</p>
                        <p className="mb-1"><strong>Consistency Audits:</strong> Runs scheduled background scans to compare calculated line-item aggregates against recorded document totals:
                          {"$$\\text{Total Amount} = \\sum (\\text{Line Items})$$"}
                        </p>
                        <p className="mb-0"><strong>High Stability:</strong> Disabling runtime database schema alterations reduces API response times to <b>~12ms</b>, maintaining maximum platform speed.</p>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>


                </Accordion>
              </div>
            )}

            {/* --- TAB: LEGAL --- */}
            {activeTab === 'legal' && (
              <div className="animate__animated animate__fadeIn">
                <h4 className="fw-bold mb-4 d-flex align-items-center">
                  <Shield className="me-2 text-success" /> Privacy Policy & Terms of Service
                </h4>

                <div className="legal-content">
                  <div className="mb-5">
                    <h5 className="fw-bold text-success d-flex align-items-center">
                      <Lock size={20} className="me-2" /> Privacy Policy
                    </h5>
                    <div className="ps-4 border-start border-3 border-success-subtle">
                      <p className="small text-muted mb-2"><strong>Data Ownership:</strong> Every company on this platform owns their data 100%. We act only as a processor. We will never share your client lists or pricing with any third party.</p>
                      <p className="small text-muted mb-2"><strong>Data Security:</strong> Your business is protected by <b>AES-256 Encryption</b>. All database passwords and sensitive credentials are encrypted at the field level.</p>
                      <p className="small text-muted mb-3"><strong>Isolation:</strong> We use a <b>Multi-Tenant Isolated Architecture</b>. Your data lives in a physically separate database from other companies, ensuring zero leakage.</p>
                      <button 
                        className="btn btn-outline-success btn-sm fw-medium rounded-pill px-3"
                        onClick={() => onNavigate('privacy')}
                      >
                        Read Full Privacy Policy
                      </button>
                    </div>
                  </div>

                  <div>
                    <h5 className="fw-bold text-primary d-flex align-items-center">
                      <Scale size={20} className="me-2" /> Terms of Service
                    </h5>
                    <div className="ps-4 border-start border-3 border-primary-subtle">
                      <p className="small text-muted mb-2"><strong>Usage License:</strong> Access is provided per-company. Unauthorized redistribution or "cloning" of this project is strictly prohibited under intellectual property laws.</p>
                      <p className="small text-muted mb-2"><strong>Regulatory Liability:</strong> While the system automates documentation, the <b>Client is responsible</b> for verifying the accuracy of VGM and Shipping Instructions before final submission to ports.</p>
                      <p className="small text-muted mb-3"><strong>Service Availability:</strong> We target a <b>99.9% uptime</b>. Maintenance windows will be notified 24 hours in advance.</p>
                      <button 
                        className="btn btn-outline-primary btn-sm fw-medium rounded-pill px-3"
                        onClick={() => onNavigate('terms')}
                      >
                        Read Full Terms of Service
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: SUPPORT --- */}
            {activeTab === 'support' && (
              <div className="animate__animated animate__fadeIn text-center py-4">
                <div className="bg-info bg-opacity-10 p-4 rounded-circle d-inline-block mb-4">
                  <HelpCircle size={48} className="text-info" />
                </div>
                <h4 className="fw-bold mb-3">Frequently Asked Questions</h4>
                
                <div className="text-start mx-auto" style={{ maxWidth: '700px' }}>
                  <div className="mb-4 border-bottom pb-3">
                    <h6 className="fw-bold mb-2">How do I add a new team member?</h6>
                    <p className="small text-muted">Go to <b>Administration &gt; User Management</b> and click 'Add User'. You can assign them one of the 11 roles to control what they can see.</p>
                  </div>
                  <div className="mb-4 border-bottom pb-3">
                    <h6 className="fw-bold mb-2">Can I customize my PDF headers?</h6>
                    <p className="small text-muted">Yes. Go to <b>Company Profile</b> and upload your high-resolution logo. The system will automatically place it on all Invoices and Packing Lists.</p>
                  </div>
                  <div className="mb-4">
                    <h6 className="fw-bold mb-2">Is my data backed up?</h6>
                    <p className="small text-muted">Yes. Our automated system performs a full backup of your isolated database every 24 hours.</p>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-light rounded-4">
                  <h6 className="fw-bold">Still have questions?</h6>
                  <p className="small text-muted">Click the button below to open a direct support ticket with our developers.</p>
                  <button 
                    className="btn btn-primary px-5 py-2 rounded-pill fw-bold" 
                    onClick={() => onNavigate('support')}
                  >
                    Create Support Ticket
                  </button>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <style>{`
        .custom-help-accordion .accordion-button:not(.collapsed) {
          background-color: transparent;
          box-shadow: none;
          color: inherit;
        }
        .custom-help-accordion .accordion-button:focus {
          box-shadow: none;
          border-color: rgba(0,0,0,.125);
        }
        .legal-content p {
          line-height: 1.6;
        }
        .animate__animated {
          animation-duration: 0.4s;
        }
      `}</style>
    </Container>
  );
};

export default HelpCenter;
