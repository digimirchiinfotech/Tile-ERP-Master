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

import { useState, useEffect } from 'react';
import {
  Row, Col, Card, Button, Table, Badge, Form, Modal, Spinner, Alert,
} from 'react-bootstrap';
import { Plus, Edit, Trash2, Eye, IndianRupee, RefreshCw, X, Power, Download, Layers, Activity, Calendar, Box, Users, FileText, Check } from 'lucide-react';
import SubscriptionPlanForm from './SubscriptionPlanForm.jsx';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { showSuccess, showError } from '../shared/NotificationManager.jsx';
import './SubscriptionManagement.css';

function SubscriptionManagement({ currentUser }) {
  const { 
    subscriptionPlans, 
    companySubscriptions,
    setCompanySubscriptions,
    transactions,
    loading, 
    error, 
    fetchPlans, 
    fetchCompanySubscriptions,
    fetchTransactions,
    createPlan, 
    updatePlan, 
    deletePlan,
    togglePlanStatus,
    renewSubscription,
    updateSubscription
  } = useSubscriptions();

  const [showPlanForm, setShowPlanForm]         = useState(false);
  const [editingPlan, setEditingPlan]           = useState(null);
  const [editingCompanySub, setEditingCompanySub] = useState(null);
  const [viewingPlan, setViewingPlan]           = useState(null);
  const [viewingSubscription, setViewingSubscription] = useState(null);
  const [activeTab, setActiveTab]               = useState('plans');

  const fmtDate = (d) => { if (!d) return '-'; try { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); } catch(_){ return d; } };

  useEffect(() => {
    if (activeTab === 'plans')         fetchPlans();
    if (activeTab === 'subscriptions') fetchCompanySubscriptions();
    if (activeTab === 'transactions')  fetchTransactions();
  }, [activeTab]);

  const handleCreatePlan        = () => { setEditingPlan(null); setShowPlanForm(true); };
  const handleEditPlan       = (p) => { setEditingPlan(p); setShowPlanForm(true); };
  const handleViewPlan       = (p) => setViewingPlan(p);
  const handleViewSubscription = (s) => setViewingSubscription(s);

  const handleDeletePlan = async (planId) => {
    if (window.confirm('Are you sure you want to delete this subscription plan?')) {
      try { await deletePlan(planId); }
      catch (err) { alert('Failed to delete subscription plan'); }
    }
  };

  const handleSavePlan = async (planData) => {
    try {
      if (editingPlan) await updatePlan(editingPlan.id, planData);
      else             await createPlan(planData);
      setShowPlanForm(false);
    } catch (err) {
      const msg = (err && err.response && err.response.data && err.response.data.message)
        || ((err && err.response && err.response.data && Array.isArray(err.response.data.errors) ? err.response.data.errors : []).map(function(e){ return e.msg; }).join(', '))
        || (err && err.message)
        || 'Failed to save subscription plan';
      alert('Error: ' + msg);
    }
  };

  const handleTogglePlanStatus = async (planId) => {
    try { await togglePlanStatus(planId); }
    catch (err) { alert('Failed to toggle subscription plan status'); }
  };

  const handleRenewal = async (subscriptionId) => {
    try {
      await renewSubscription(subscriptionId);
      showSuccess('Subscription renewed successfully');
    } catch (err) {
      showError('Failed to renew subscription');
    }
  };

  const handleEditCompanySub = (sub) => {
    setEditingCompanySub(sub);
  };

  const handleSaveCompanySub = async (e) => {
    e.preventDefault();
    try {
      await updateSubscription(editingCompanySub.id, {
        plan_id: editingCompanySub.plan_id || editingCompanySub.planId,
        status: editingCompanySub.status,
        amount: editingCompanySub.amount
      });
      showSuccess('Subscription updated successfully');
      setEditingCompanySub(null);
      fetchCompanySubscriptions();
    } catch(err) {
      showError('Failed to update subscription');
    }
  };

  const canEdit   = currentUser && ['super_admin'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin'].includes(currentUser?.role);

  const statusBadge = (status) => {
    const map = { Active: 'success', Expired: 'danger', Cancelled: 'secondary', Pending: 'warning' };
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>;
  };

  const TABS = [
    { key: 'plans',         label: 'Subscription Plans' },
    { key: 'subscriptions', label: 'Company Subscriptions' },
    { key: 'transactions',  label: 'Transactions' },
  ];

  return (
    <>
      {/* Page Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Subscription & Payment</h2>
          <p className="text-muted">Manage subscription plans, company subscriptions, and track payment transactions</p>
        </Col>
      </Row>

      {/* Tab Navigation */}
      <div className="sub-tab-nav mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={'sub-tab-btn' + (activeTab === tab.key ? ' active' : '')}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subscription Plans Tab */}
      {activeTab === 'plans' && (
        <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center p-3 border-0">
            <div>
              <h5 className="mb-0 fw-bold">Subscription Plans ({subscriptionPlans.length})</h5>
            </div>
            <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center" onClick={handleCreatePlan}>
              <Plus size={16} className="me-1" />
              <span className="d-none d-sm-inline small">Create New Plan</span>
              <span className="d-sm-none small">Create</span>
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-lg-block">
              <Table hover className="mb-0 align-middle">
                <thead>
                  <tr className="table-light text-muted small text-uppercase">
                    <th className="ps-4" style={{ width: '60px' }}>SR. NO.</th>
                    <th>Status</th>
                    <th>Plan Name</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Max Users</th>
                    <th>Features</th>
                    <th className="pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionPlans.map((plan, index) => (
                    <tr key={plan.id}>
                      <td className="ps-4">{index + 1}</td>
                      <td><Badge bg={plan.status === 'Active' ? 'success' : 'danger'}>{plan.status}</Badge></td>
                      <td className="fw-semibold">{plan.name}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          {plan.price === 0 ? (
                            <Badge bg="success-subtle" className="text-success fw-bold px-2 py-1">FREE</Badge>
                          ) : (
                            <>
                              <span className="text-muted fw-bold">₹</span>
                              <strong className="text-primary">{plan.price}</strong>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="text-nowrap">{plan.duration} {plan.durationType || plan.duration_type}</td>
                      <td>{plan.maxUsers === -1 || plan.max_users === -1 ? <Badge bg="info">Unlimited</Badge> : (plan.maxUsers || plan.max_users)}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(() => {
                            let features = [];
                            try {
                              const parsed = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]');
                              features = Array.isArray(parsed) ? parsed : [];
                            } catch (e) { features = []; }
                            
                            return (
                              <>
                                {features.slice(0, 2).map((f, i) => (
                                  <Badge key={i} bg="secondary" className="fw-normal text-uppercase" style={{fontSize:'10px'}}>{f}</Badge>
                                ))}
                                {features.length > 2 && (
                                  <Badge bg="light" text="dark" className="fw-normal" style={{fontSize:'10px'}}>+{features.length - 2} more</Badge>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="pe-4 text-end">
                        <div className="d-flex justify-content-end gap-1 flex-wrap">
                          <Button variant="outline-info" size="sm" className="fw-semibold d-flex align-items-center gap-1" onClick={() => handleViewPlan(plan)} title="View Plan">
                            <Eye size={13}/> View
                          </Button>
                          {canEdit && (
                            <>
                              <Button variant="outline-primary" size="sm" className="fw-semibold d-flex align-items-center gap-1" onClick={() => handleEditPlan(plan)} title="Edit Plan">
                                <Edit size={13}/> Edit
                              </Button>
                              <Button variant={plan.status === 'Active' ? 'outline-warning' : 'outline-success'} size="sm" className="fw-semibold d-flex align-items-center gap-1" onClick={() => handleTogglePlanStatus(plan.id)} title={plan.status === 'Active' ? 'Deactivate' : 'Activate'}>
                                <Power size={13}/> {plan.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button variant="outline-danger" size="sm" className="fw-semibold d-flex align-items-center gap-1" onClick={() => handleDeletePlan(plan.id)} title="Delete Plan">
                                <Trash2 size={13}/> Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="d-lg-none bg-light-subtle p-3">
              {subscriptionPlans.length > 0 ? (
                subscriptionPlans.map((plan, index) => (
                  <Card key={plan.id} className="mb-3 border-0 shadow-sm plan-mobile-card">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                          <h5 className="fw-bold mb-1 text-dark">{plan.name}</h5>
                          <div className="text-muted small">#{index + 1} • {plan.duration} {plan.durationType}</div>
                        </div>
                        <div className="status-container">
                          <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${
                            plan.status === 'Active' ? 'success' : 'danger'
                          }`}>
                            {plan.status || 'Active'}
                          </div>
                        </div>
                      </div>

                      <Row className="g-3 mb-4">
                        <Col xs={6}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Price:</label>
                            <div className="text-dark fw-bold text-primary">{plan.price === 0 ? 'Free' : `₹${plan.price}`}</div>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <div className="detail-item">
                            <label className="text-muted small fw-bold mb-1 d-block">Max Users:</label>
                            <div className="text-dark">{plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers}</div>
                          </div>
                        </Col>
                      </Row>

                      <div className="d-flex gap-2 pt-3 border-top">
                        <Button variant="outline-info" size="sm" className="flex-fill fw-bold d-flex align-items-center justify-content-center gap-1" onClick={() => handleViewPlan(plan)}>
                          <Eye size={14}/> View
                        </Button>
                        {canEdit && (
                          <Button variant="outline-primary" size="sm" className="flex-fill fw-bold d-flex align-items-center justify-content-center gap-1" onClick={() => handleEditPlan(plan)}>
                            <Edit size={14}/> Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="outline-danger" size="sm" className="flex-fill fw-bold d-flex align-items-center justify-content-center gap-1" onClick={() => handleDeletePlan(plan.id)}>
                            <Trash2 size={14}/> Delete
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                ))
              ) : (
                <div className="text-center py-5 text-muted">No plans found.</div>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Company Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center p-3 border-0">
            <div>
              <h5 className="mb-0 fw-bold">Company Subscriptions ({companySubscriptions.length})</h5>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {companySubscriptions.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted mb-0">No company subscriptions found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="table-responsive d-none d-lg-block">
                  <Table hover className="mb-0 align-middle">
                    <thead>
                      <tr className="table-light text-muted small text-uppercase">
                        <th className="ps-4" style={{ width: '60px' }}>SR. NO.</th>
                        <th>Status</th>
                        <th>Company</th>
                        <th>Plan</th>
                        <th>Period</th>
                        <th>Amount</th>
                        <th>Auto Renewal</th>
                        <th className="pe-4 text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                    {companySubscriptions.map((sub, index) => (
                      <tr key={sub.id}>
                        <td className="ps-4">{index + 1}</td>
                        <td>{statusBadge(sub.status)}</td>
                        <td className="fw-semibold">{sub.company_name || sub.companyName}</td>
                        <td>{sub.plan_name || sub.planName}</td>
                        <td><small className="text-muted fw-medium">{fmtDate(sub.start_date || sub.startDate)} → {fmtDate(sub.end_date || sub.endDate)}</small></td>
                        <td className="fw-bold text-success">₹{sub.amount}</td>
                        <td><Badge bg={sub.auto_renewal || sub.autoRenewal ? 'success' : 'secondary'}>{sub.auto_renewal || sub.autoRenewal ? 'Enabled' : 'Disabled'}</Badge></td>
                        <td className="pe-4 text-end">
                          <div className="d-flex justify-content-end gap-1 flex-wrap">
                            <Button variant="outline-info" size="sm" className="fw-semibold d-flex align-items-center gap-1" onClick={() => handleViewSubscription(sub)}>
                              <Eye size={13}/> View
                            </Button>
                            <Button variant="outline-primary" size="sm" className="fw-semibold d-flex align-items-center gap-1" onClick={() => handleRenewal(sub.id)}>
                              <RefreshCw size={13}/> Renew
                            </Button>
                            <Button variant="outline-secondary" size="sm" className="fw-semibold d-flex align-items-center gap-1" onClick={() => handleEditCompanySub(sub)}>
                              <Edit size={13}/> Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="d-lg-none bg-light-subtle p-3">
                  {companySubscriptions.map((sub, index) => (
                    <Card key={sub.id} className="mb-3 border-0 shadow-sm sub-mobile-card">
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                          <div>
                            <h5 className="fw-bold mb-1 text-dark">{sub.company_name || sub.companyName}</h5>
                            <div className="text-muted small">#{index + 1} • {sub.plan_name || sub.planName}</div>
                          </div>
                          <div className="status-container">
                            <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${
                              sub.status === 'Active' ? 'success' :
                              sub.status === 'Expired' ? 'danger' :
                              sub.status === 'Cancelled' ? 'secondary' : 'warning'
                            }`}>
                              {sub.status || 'Pending'}
                            </div>
                          </div>
                        </div>

                        <Row className="g-3 mb-4">
                          <Col xs={12}>
                            <div className="detail-item">
                              <label className="text-muted small fw-bold mb-1 d-block">Period:</label>
                              <div className="text-dark small fw-medium">{fmtDate(sub.start_date || sub.startDate)} → {fmtDate(sub.end_date || sub.endDate)}</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="detail-item">
                              <label className="text-muted small fw-bold mb-1 d-block">Amount:</label>
                              <div className="fw-bold text-success">₹{sub.amount}</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="detail-item">
                              <label className="text-muted small fw-bold mb-1 d-block">Auto Renewal:</label>
                              <div className="text-dark">{sub.auto_renewal || sub.autoRenewal ? 'Enabled' : 'Disabled'}</div>
                            </div>
                          </Col>
                        </Row>

                        <div className="d-flex gap-2 pt-3 border-top">
                          <Button variant="outline-info" size="sm" className="flex-fill fw-bold d-flex align-items-center justify-content-center gap-1" onClick={() => handleViewSubscription(sub)}>
                            <Eye size={14}/> View
                          </Button>
                          <Button variant="outline-primary" size="sm" className="flex-fill fw-bold d-flex align-items-center justify-content-center gap-1" onClick={() => handleRenewal(sub.id)}>
                            <RefreshCw size={14}/> Renew
                          </Button>
                          <Button variant="outline-secondary" size="sm" className="flex-fill fw-bold d-flex align-items-center justify-content-center gap-1" onClick={() => handleEditCompanySub(sub)}>
                            <Edit size={14}/> Edit
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      )}

      {activeTab === 'transactions' && (
        <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center p-3 border-0">
            <div>
              <h5 className="mb-0 fw-bold">Recent Transactions ({transactions.length})</h5>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {transactions.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted mb-0">No transactions found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="table-responsive d-none d-lg-block">
                  <Table hover className="mb-0 align-middle">
                    <thead>
                      <tr className="table-light text-muted small text-uppercase">
                        <th className="ps-4" style={{ width: '60px' }}>SR. NO.</th>
                        <th>Status</th>
                        <th>Transaction ID</th>
                        <th>Company</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Date</th>
                        <th className="pe-4 text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                    {transactions.map((txn, index) => (
                      <tr key={txn.id}>
                        <td className="ps-4">{index + 1}</td>
                        <td><Badge bg={txn.status === 'Paid' || txn.status === 'succeeded' ? 'success' : 'warning'}>{txn.status}</Badge></td>
                        <td className="fw-semibold text-primary">{txn.transaction_id || txn.transactionId}</td>
                        <td>{txn.company_name || txn.companyName}</td>
                        <td className="fw-semibold text-success">₹{txn.amount}</td>
                        <td><span className="text-muted">{txn.payment_method || txn.paymentMethod}</span></td>
                        <td><small className="fw-medium">{fmtDate(txn.payment_date || txn.paymentDate || txn.created_at)}</small></td>
                        <td className="pe-4 text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <Button variant="outline-info" size="sm" className="fw-semibold d-flex align-items-center gap-1" title="View Receipt">
                              <Eye size={13}/> View
                            </Button>
                            <Button variant="outline-success" size="sm" className="fw-semibold d-flex align-items-center gap-1" title="Download Invoice">
                              <Download size={13}/> Invoice
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="d-lg-none bg-light-subtle p-3">
                  {transactions.map((txn, index) => (
                    <Card key={txn.id} className="mb-3 border-0 shadow-sm txn-mobile-card">
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                          <div>
                            <h5 className="fw-bold mb-1 text-dark">{txn.transaction_id || txn.transactionId}</h5>
                            <div className="text-muted small">#{index + 1} • {txn.company_name || txn.companyName}</div>
                          </div>
                          <div className="status-container">
                            <div className={`status-box text-white px-3 py-1 rounded fw-bold small text-uppercase bg-${
                              txn.status === 'Paid' || txn.status === 'succeeded' ? 'success' : 'warning'
                            }`}>
                              {txn.status || 'Pending'}
                            </div>
                          </div>
                        </div>

                        <Row className="g-3 mb-4">
                          <Col xs={6}>
                            <div className="detail-item">
                              <label className="text-muted small fw-bold mb-1 d-block">Amount:</label>
                              <div className="text-dark fw-bold text-primary">₹{txn.amount}</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="detail-item">
                              <label className="text-muted small fw-bold mb-1 d-block">Method:</label>
                              <div className="text-dark small">{txn.payment_method || txn.paymentMethod}</div>
                            </div>
                          </Col>
                          <Col xs={12}>
                            <div className="detail-item">
                              <label className="text-muted small fw-bold mb-1 d-block">Date:</label>
                              <div className="text-dark small fw-medium">{fmtDate(txn.payment_date || txn.paymentDate || txn.created_at)}</div>
                            </div>
                          </Col>
                        </Row>

                        <div className="d-flex gap-2 pt-3 border-top">
                          <Button variant="outline-info" size="sm" className="flex-fill fw-bold d-flex align-items-center justify-content-center gap-1">
                            <Eye size={14}/> Receipt
                          </Button>
                          <Button variant="outline-success" size="sm" className="flex-fill fw-bold d-flex align-items-center justify-content-center gap-1">
                            <Download size={14}/> Invoice
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      )}

      {showPlanForm && (
        <SubscriptionPlanForm plan={editingPlan} onSave={handleSavePlan} onCancel={() => setShowPlanForm(false)} />
      )}

      {viewingPlan && (
        <Modal contentClassName="glass-modal" show onHide={() => setViewingPlan(null)} size="lg" backdrop="static" dialogClassName="plan-details-modal">
          <Modal.Body className="p-4 bg-light position-relative" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            
            <button 
              type="button" 
              className="btn-close position-absolute top-0 end-0 m-4 shadow-none" 
              aria-label="Close" 
              onClick={() => setViewingPlan(null)}
              style={{ zIndex: 1050 }}
            />

            <div className="breadcrumb mb-2 text-muted" style={{ fontSize: '0.82rem', letterSpacing: '0.5px' }}>
              Plans &gt; Plan Details
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
                  <Layers size={24} />
                </div>
                <div>
                  <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2" style={{ letterSpacing: '-0.3px' }}>
                    {viewingPlan.name}
                    <Badge bg={viewingPlan.status === 'Active' ? 'success' : 'danger'} className="px-2 py-1 rounded-pill fw-medium fs-6" style={{ fontSize: '0.75rem' }}>
                      {viewingPlan.status}
                    </Badge>
                  </h4>
                  <span className="text-muted small">Subscription Plan Info</span>
                </div>
              </div>
            </div>

            <div className="user-card bg-white p-4 h-100 shadow-sm border-0">
              <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-3">
                <div className="bg-primary-subtle text-primary p-2 rounded-3">
                  <Layers size={20} />
                </div>
                <h5 className="fw-bold mb-0 text-dark">Plan Details</h5>
              </div>
              
              <div className="info-grid">
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <IndianRupee size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Price</span>
                    <span className="info-val fw-bold text-success">{viewingPlan.price === 0 ? 'Free' : `₹${viewingPlan.price}`}</span>
                  </div>
                </div>

                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Duration</span>
                    <span className="info-val fw-semibold text-dark">{viewingPlan.duration} {viewingPlan.durationType}</span>
                  </div>
                </div>

                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Users size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Max Users</span>
                    <span className="info-val fw-semibold text-dark">{viewingPlan.maxUsers === -1 ? 'Unlimited' : viewingPlan.maxUsers}</span>
                  </div>
                </div>

                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Box size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Max Companies</span>
                    <span className="info-val fw-semibold text-dark">{viewingPlan.maxCompanies}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-top">
                <span className="text-muted small text-uppercase fw-bold mb-3 d-block">Features</span>
                <div className="d-flex flex-wrap gap-2">
                  {(() => {
                    let features = [];
                    try {
                      const parsed = Array.isArray(viewingPlan.features) ? viewingPlan.features : JSON.parse(viewingPlan.features || '[]');
                      features = Array.isArray(parsed) ? parsed : [];
                    } catch (e) { features = []; }
                    return features.map((f, i) => (
                      <Badge key={i} bg="primary-subtle" text="primary" className="fw-medium px-3 py-2 border border-primary-subtle rounded-pill">
                        <Check size={14} className="me-1"/> {f}
                      </Badge>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top bg-white px-3 py-2" style={{ margin: '0 -24px -24px -24px' }}>
              <Button variant="outline-secondary" onClick={() => setViewingPlan(null)} className="border-secondary-subtle fw-semibold px-4">
                Close
              </Button>
            </div>
            
          </Modal.Body>
        </Modal>
      )}

      {viewingSubscription && (
        <Modal contentClassName="glass-modal" show onHide={() => setViewingSubscription(null)} size="lg" backdrop="static" dialogClassName="subscription-details-modal">
          <Modal.Body className="p-4 bg-light position-relative" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            
            <button 
              type="button" 
              className="btn-close position-absolute top-0 end-0 m-4 shadow-none" 
              aria-label="Close" 
              onClick={() => setViewingSubscription(null)}
              style={{ zIndex: 1050 }}
            />

            <div className="breadcrumb mb-2 text-muted" style={{ fontSize: '0.82rem', letterSpacing: '0.5px' }}>
              Subscriptions &gt; Company Subscription
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-success text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2" style={{ letterSpacing: '-0.3px' }}>
                    {viewingSubscription.company_name || viewingSubscription.companyName}
                    {statusBadge(viewingSubscription.status)}
                  </h4>
                  <span className="text-muted small">{viewingSubscription.plan_name || viewingSubscription.planName}</span>
                </div>
              </div>
            </div>

            <div className="user-card bg-white p-4 h-100 shadow-sm border-0">
              <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-3">
                <div className="bg-success-subtle text-success p-2 rounded-3">
                  <Activity size={20} />
                </div>
                <h5 className="fw-bold mb-0 text-dark">Subscription Overview</h5>
              </div>
              
              <div className="info-grid">
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Layers size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Plan</span>
                    <span className="info-val fw-bold text-dark">{viewingSubscription.plan_name || viewingSubscription.planName}</span>
                  </div>
                </div>

                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#dcfce7', color: '#16a34a', flexShrink: 0 }}>
                    <IndianRupee size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Amount</span>
                    <span className="info-val fw-bold text-success">₹{viewingSubscription.amount}</span>
                  </div>
                </div>

                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Start Date</span>
                    <span className="info-val fw-semibold text-dark">{fmtDate(viewingSubscription.start_date || viewingSubscription.startDate)}</span>
                  </div>
                </div>

                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">End Date</span>
                    <span className="info-val fw-semibold text-dark">{fmtDate(viewingSubscription.end_date || viewingSubscription.endDate)}</span>
                  </div>
                </div>

                <div className="info-cell d-flex align-items-center gap-3" style={{ gridColumn: '1 / -1' }}>
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <RefreshCw size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Auto Renewal</span>
                    <span className="info-val">
                      <Badge bg={(viewingSubscription.auto_renewal || viewingSubscription.autoRenewal) ? 'success' : 'secondary'} className="rounded-pill px-2 py-1">
                        {(viewingSubscription.auto_renewal || viewingSubscription.autoRenewal) ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </span>
                  </div>
                </div>

                {viewingSubscription.notes && (
                  <div className="info-cell d-flex align-items-center gap-3" style={{ gridColumn: '1 / -1' }}>
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <FileText size={18} />
                    </div>
                    <div className="info-text-wrapper">
                      <span className="info-label text-muted small d-block text-uppercase">Notes</span>
                      <span className="info-val fw-medium text-dark">{viewingSubscription.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top bg-white px-3 py-2" style={{ margin: '0 -24px -24px -24px' }}>
              <Button variant="outline-secondary" onClick={() => setViewingSubscription(null)} className="border-secondary-subtle fw-semibold px-4">
                Close
              </Button>
            </div>
            
          </Modal.Body>
        </Modal>
      )}

      {editingCompanySub && (
        <Modal show onHide={() => setEditingCompanySub(null)} backdrop="static">
          <Modal.Header closeButton>
            <Modal.Title>Edit Company Subscription</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSaveCompanySub}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select 
                  value={editingCompanySub.status || 'Active'} 
                  onChange={(e) => setEditingCompanySub({...editingCompanySub, status: e.target.value})}
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Trial">Trial</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Subscription Plan</Form.Label>
                <Form.Select 
                  value={editingCompanySub.plan_id || editingCompanySub.planId || ''} 
                  onChange={(e) => setEditingCompanySub({...editingCompanySub, plan_id: e.target.value})}
                >
                  <option value="">Select Plan</option>
                  {subscriptionPlans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Amount (₹)</Form.Label>
                <Form.Control 
                  type="number" 
                  value={editingCompanySub.amount || 0} 
                  onChange={(e) => setEditingCompanySub({...editingCompanySub, amount: parseFloat(e.target.value) || 0})}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setEditingCompanySub(null)}>Cancel</Button>
              <Button variant="primary" type="submit">Save Changes</Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
      <style>{`
        .plan-mobile-card, .sub-mobile-card, .txn-mobile-card {
          border-radius: 12px;
          transition: transform 0.2s ease;
        }
        .status-box {
          letter-spacing: 0.5px;
          font-size: 0.75rem;
          min-width: 80px;
          text-align: center;
        }
        .detail-item label {
          letter-spacing: 0.5px;
          color: #6c757d;
        }
        .detail-item div {
          font-weight: 500;
          font-size: 0.95rem;
        }
        .bg-light-subtle {
          background-color: #f8f9fa;
        }
        .sub-tab-btn {
          border: none;
          background: transparent;
          padding: 10px 20px;
          font-weight: 600;
          color: #64748b;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
        }
        .sub-tab-btn.active {
          color: #0d6efd;
          border-bottom-color: #0d6efd;
        }

        /* User Card & Grid Styles for View Modals */
        .glass-modal .modal-content {
          border-radius: 16px;
          overflow: hidden;
          background: #f8fafc;
        }
        .btn-close-custom {
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.2s;
        }
        .btn-close-custom:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .user-card {
          border-radius: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .user-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.05) !important;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        .info-cell {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .info-cell .icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .info-cell .content {
          display: flex;
          flex-direction: column;
        }
        .info-cell label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 0.25rem;
          font-weight: 600;
        }
        .info-cell span {
          color: #0f172a;
          font-weight: 500;
          font-size: 0.95rem;
          word-break: break-word;
        }
      `}</style>
    </>
  );
}

export default SubscriptionManagement;
