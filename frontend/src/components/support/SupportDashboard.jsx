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

import ActivityTimeline from '../shared/ActivityTimeline.jsx';
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { Plus, Search, Edit, Eye, Trash2, Send, MessageSquare, Edit2, Ticket, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import Button from '../shared/Button.jsx';
import './SupportDashboard.css';
import SupportTicketForm from './SupportTicketForm.jsx';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { Modal, Form } from 'react-bootstrap';
import { TicketStatus } from '../../services/supportTicketService';
import { useSocket } from '../../hooks/useSocket';

function SupportDashboard({ currentUser }) {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const { tickets, stats, loading, error, fetchTickets, fetchTicketById, addComment, deleteTicket, updateTicketStatus } = useSupportTickets();
  const { socket, isConnected } = useSocket();

  const handleTicketCreated = async (ticket) => {
    setShowNewTicket(false);
    await fetchTickets();
  };

  const handleViewTicket = async (ticket) => {
    try {
      const fullTicket = await fetchTicketById(ticket.id);
      setSelectedTicket(fullTicket);
      setShowDetails(true);
    } catch (err) {
      console.error('Failed to fetch ticket details:', err);
    }
  };

  useEffect(() => {
    // Real-time socket updates for tickets
    if (socket && isConnected) {
      const handleTicketUpdate = (data) => {
        if (data.ticketId === selectedTicket?.id || data.ticketId === selectedTicket?.ticketId) {
          fetchTicketById(selectedTicket.id).then(refreshed => {
            if (refreshed) setSelectedTicket(refreshed);
          });
        } else {
          fetchTickets(); // Refresh list to get new badges
        }
      };
      
      socket.on('ticket_updated', handleTicketUpdate);
      return () => {
        socket.off('ticket_updated', handleTicketUpdate);
      };
    }
  }, [socket, isConnected, selectedTicket, fetchTicketById, fetchTickets]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    try {
      await addComment(selectedTicket.id, newComment, currentUser?.name || 'User');
      setNewComment('');
      // Re-fetch the ticket to get the latest comments from server
      const refreshed = await fetchTicketById(selectedTicket.id);
      if (refreshed) setSelectedTicket(refreshed);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleDeleteTicket = async (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteTicket(deleteConfirmId);
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'Open': { bg: 'danger', icon: '🔴 ' },
      'In Progress': { bg: 'warning', icon: '🟠 ' },
      'Pending User': { bg: 'warning', text: 'dark', icon: '🟡 ' },
      'Resolved': { bg: 'success', icon: '🟢 ' },
      'Closed': { bg: 'secondary', icon: '⚫ ' },
      'Reopened': { bg: 'info', icon: '🟣 ' } // Using info but styling purple via CSS
    };
    const v = variants[status] || { bg: 'secondary', icon: '⚫ ' };
    return <Badge bg={v.bg} text={v.text || 'white'} className={status === 'Reopened' ? 'badge-reopened' : ''}>{v.icon}{status.toUpperCase()}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      'Low': { bg: 'success', icon: '🟢 ' },
      'Medium': { bg: 'warning', text: 'dark', icon: '🟡 ' },
      'High': { bg: 'orange', icon: '🟠 ' }, // custom CSS for orange
      'Critical': { bg: 'danger', icon: '🔴 ' }
    };
    const v = variants[priority] || { bg: 'secondary', icon: '⚫ ' };
    return <Badge bg={v.bg} text={v.text || 'white'} className={priority === 'High' ? 'badge-orange' : ''}>{v.icon}{priority.toUpperCase()}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchTerm || 
      (ticket.ticketId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });


  const canEdit = currentUser && ['super_admin', 'company_admin', 'sales_manager', 'sales_executive'].includes(currentUser?.role);
  const canDelete = currentUser && ['super_admin', 'company_admin'].includes(currentUser?.role);

  // Dynamic company contact — pulled from currentUser context. Never expose developer details.
  const companySettings = currentUser?.companySettings || {};
  const supportEmail = companySettings.support_email || companySettings.email_id || 'support@yourdomain.com';
  const supportPhone = companySettings.support_phone || companySettings.contact_number || '';
  const docsUrl = '/docs.html';

  const isOverdue = (ticket) => {
    if (ticket.status !== 'Open') return false;
    const created = new Date(ticket.createdAt || ticket.created_at);
    const hoursElapsed = (Date.now() - created.getTime()) / (1000 * 60 * 60);
    return hoursElapsed > 48;
  };

  const handleViewDocs = () => window.open(docsUrl, '_blank', 'noopener,noreferrer');
  const handleStartChat = () => setShowNewTicket(true);
  const handleCallNow = () => { if (supportPhone) window.location.href = `tel:${supportPhone}`; };
  const handleSendEmail = () => { if (supportEmail) window.location.href = `mailto:${supportEmail}`; };

  const supportCards = [
    { icon: '📄', iconBg: '#eff6ff', title: 'Documentation',  desc: 'Browse our comprehensive guides and tutorials',   btnLabel: 'View Docs',   onClick: handleViewDocs  },
    { icon: '💬', iconBg: '#f0fdf4', title: 'Live Chat',       desc: 'Submit a ticket and our team will respond quickly', btnLabel: 'Start Chat',  onClick: handleStartChat },
    ...(supportPhone ? [{ icon: '☎️', iconBg: '#fdf4ff', title: 'Phone Support', desc: `Call us at ${supportPhone}`, btnLabel: 'Call Now', onClick: handleCallNow }] : []),
    ...(supportEmail ? [{ icon: '✉️', iconBg: '#fff7ed', title: 'Email Support', desc: `Email us at ${supportEmail}`, btnLabel: 'Send Email', onClick: handleSendEmail }] : []),
  ];

  return (
    <>
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="mb-1 fw-bold text-dark">Support & Help Center</h2>
          <p className="text-muted mb-0">Access documentation, live chat, and manage your support tickets</p>
        </div>
        <div className="d-flex align-items-center gap-2">
           <div className="search-box position-relative d-none d-md-block" style={{ width: '250px' }}>
              <Form.Control
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-5 bg-white shadow-sm border-0"
                style={{ borderRadius: '10px', height: '42px' }}
              />
              <Search size={18} className="position-absolute top-50 translate-middle-y text-muted" style={{ left: '15px' }} />
           </div>
           <Form.Select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ borderRadius: '10px', height: '42px', width: '150px' }}
              className="d-none d-md-block bg-white shadow-sm border-0 text-muted"
           >
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending User">Pending User</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
           </Form.Select>
        </div>
      </div>

      {/* Unified Compact Stats Row */}
      <Row className="mb-4 g-3">
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-3 d-flex align-items-center">
              <div className="rounded-circle bg-primary-light d-flex align-items-center justify-content-center me-3" style={{ width: '48px', height: '48px' }}>
                <Ticket size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-muted small fw-bold text-uppercase mb-0" style={{ letterSpacing: '0.5px' }}>Total</p>
                <h4 className="fw-bold mb-0 text-dark">{stats?.total || 0}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-3 d-flex align-items-center">
              <div className="rounded-circle bg-danger-light d-flex align-items-center justify-content-center me-3" style={{ width: '48px', height: '48px' }}>
                <AlertTriangle size={24} className="text-danger" />
              </div>
              <div>
                <p className="text-muted small fw-bold text-uppercase mb-0" style={{ letterSpacing: '0.5px' }}>Open</p>
                <h4 className="fw-bold mb-0 text-dark">{stats?.open || 0}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-3 d-flex align-items-center">
              <div className="rounded-circle bg-warning-light d-flex align-items-center justify-content-center me-3" style={{ width: '48px', height: '48px' }}>
                <Clock size={24} className="text-warning" />
              </div>
              <div>
                <p className="text-muted small fw-bold text-uppercase mb-0" style={{ letterSpacing: '0.5px' }}>In Progress</p>
                <h4 className="fw-bold mb-0 text-dark">{stats?.inProgress || 0}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-3 d-flex align-items-center">
              <div className="rounded-circle bg-success-light d-flex align-items-center justify-content-center me-3" style={{ width: '48px', height: '48px' }}>
                <CheckCircle size={24} className="text-success" />
              </div>
              <div>
                <p className="text-muted small fw-bold text-uppercase mb-0" style={{ letterSpacing: '0.5px' }}>Resolved</p>
                <h4 className="fw-bold mb-0 text-dark">{(stats?.resolved || 0) + (stats?.closed || 0)}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Support Channels Links (Compact) */}
      {!showNewTicket && (
        <>
          <div className="d-flex flex-wrap gap-3 mb-4">
            {supportCards.map((card) => (
              <div 
                key={card.title} 
                className="bg-white px-4 py-3 rounded-pill shadow-sm border border-light d-flex align-items-center cursor-pointer support-pill-card transition-all"
                onClick={card.onClick}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center justify-content-center me-2 fs-5">
                  {card.icon}
                </div>
                <span className="fw-bold text-dark">{card.title}</span>
              </div>
            ))}
          </div>

          <Card className="border-0 shadow-sm overflow-hidden mb-4">
            <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
              <h5 className="mb-0 fw-bold text-nowrap me-2">Support Tickets ({tickets.length})</h5>
              <div className="d-flex gap-2 flex-nowrap align-items-center">
                <Button variant="light" size="sm" className="text-primary fw-bold d-flex align-items-center flex-shrink-0" onClick={() => setShowNewTicket(true)} style={{ width: 'auto' }}>
                  <Plus size={16} className="me-1" />
                  <span className="d-none d-sm-inline small">New Ticket</span>
                  <span className="d-sm-none small">New</span>
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading && (
                <div className="text-center py-5">
                  <Spinner animation="border" className="mb-3" />
                  <p className="text-muted">Loading support tickets...</p>
                </div>
              )}
              
              {error && (
                <Alert variant="secondary" className="m-3">
                  <Alert.Heading>Error Loading Tickets</Alert.Heading>
                  <p>{error}</p>
                </Alert>
              )}

              {!loading && !error && filteredTickets.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="table-responsive d-none d-lg-block">
                    <Table hover className="mb-0 align-middle">
                      <thead>
                        <tr className="table-light text-muted small text-uppercase">
                          <th className="ps-4" style={{ width: '60px' }}>SR. NO.</th>
                          <th>Status</th>
                          <th>Ticket ID</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Date Raised</th>
                          <th>Description</th>
                          <th className="pe-4 text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTickets.map((ticket, index) => (
                          <tr key={ticket.id}>
                            <td className="ps-4 text-center">{index + 1}</td>
                            <td>
                              {getStatusBadge(ticket.status)}
                              {isOverdue(ticket) && <Badge bg="danger" className="ms-1" title="No response in 48h">Overdue</Badge>}
                            </td>
                            <td className="fw-medium text-primary">{ticket.ticketId}</td>
                            <td><Badge bg="info">{ticket.category}</Badge></td>
                            <td>{getPriorityBadge(ticket.priority)}</td>
                            <td><small className="text-muted">{formatDate(ticket.createdAt)}</small></td>
                            <td>
                              <small className="text-muted">
                                {ticket.description.length > 50
                                  ? ticket.description.substring(0, 50) + '...'
                                  : ticket.description}
                              </small>
                            </td>
                            <td className="pe-4 text-end">
                              <div className="d-flex justify-content-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewTicket(ticket)}
                                >
                                  <MessageSquare size={14} className="me-1" />
                                  View
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
                    {filteredTickets.map((ticket, index) => (
                      <Card key={ticket.id} className="mb-3 border-0 shadow-sm ticket-mobile-card">
                        <Card.Body className="p-4">
                          <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                              <h5 className="fw-bold mb-1 text-dark">{ticket.ticketId}</h5>
                              <div className="text-muted small">#{index + 1} • {formatDate(ticket.createdAt)}</div>
                            </div>
                            <div className="status-container">
                              {getStatusBadge(ticket.status || 'Open')}
                            </div>
                          </div>

                          <Row className="g-3 mb-4">
                            <Col xs={12}>
                              <div className="detail-item">
                                <label className="text-muted small fw-bold mb-1 d-block">Category:</label>
                                <div className="text-dark fw-bold small">{ticket.category}</div>
                              </div>
                            </Col>
                            <Col xs={6}>
                              <div className="detail-item">
                                <label className="text-muted small fw-bold mb-1 d-block">Priority:</label>
                                <div className="text-dark fw-bold small">{getPriorityBadge(ticket.priority)}</div>
                              </div>
                            </Col>
                            <Col xs={12}>
                              <div className="detail-item">
                                <label className="text-muted small fw-bold mb-1 d-block">Description:</label>
                                <div className="text-muted small">
                                  {ticket.description.length > 80
                                    ? ticket.description.substring(0, 80) + '...'
                                    : ticket.description}
                                </div>
                              </div>
                            </Col>
                          </Row>

                          <div className="d-flex gap-2 flex-wrap pt-3 border-top">
                            <Button variant="outline" size="sm" className="flex-grow-1" onClick={() => handleViewTicket(ticket)}>
                              <Eye size={16} className="me-1" /> View
                            </Button>
                            {ticket.status === 'Open' && (
                              <Button variant="outline" size="sm" className="flex-grow-1" onClick={() => { setSelectedTicket(ticket); setShowNewTicket(true); }}>
                                <Edit2 size={16} className="me-1" /> Edit
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="flex-grow-1 text-danger border-danger" onClick={() => handleDeleteTicket(ticket.id)}>
                              <Trash2 size={16} className="me-1" /> Delete
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                !loading && !error && (
                  <div className="text-center py-5">
                    <h5 className="text-muted">ℹ️ No Support Tickets</h5>
                    <p className="text-muted">You haven't submitted any support tickets yet.</p>
                    <Button variant="primary" onClick={() => setShowNewTicket(true)}>
                      + Create Your First Ticket
                    </Button>
                  </div>
                )
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {showNewTicket && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            className="mb-3"
            onClick={() => { setShowNewTicket(false); setSelectedTicket(null); }}
          >
            ← Back to My Tickets
          </Button>
          <SupportTicketForm
            currentUser={currentUser}
            onTicketCreated={handleTicketCreated}
            initialData={selectedTicket}
          />
        </div>
      )}

      {/* Ticket Details Modal */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="xl" className="support-ticket-modal">
        <Modal.Header closeButton className="bg-light border-bottom-0 pb-3">
          <Modal.Title className="fw-bold d-flex align-items-center">
            <Ticket size={24} className="me-2 text-primary" />
            Ticket: {selectedTicket?.ticketId}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 bg-white">
          {selectedTicket && (
            <Row className="g-0 h-100">
              {/* Left Column: Conversation Timeline */}
              <Col lg={8} className="d-flex flex-column border-end" style={{ minHeight: '600px' }}>
                <div className="p-4 border-bottom bg-white shadow-sm z-index-1">
                  <h4 className="fw-bold mb-2 text-dark">{selectedTicket.subject || 'Support Request'}</h4>
                  <p className="text-muted small mb-0">Original request from {formatDate(selectedTicket.createdAt || selectedTicket.dateRaised)}</p>
                </div>
                
                <div className="flex-grow-1 p-4 bg-light overflow-auto ticket-comments-list" style={{ maxHeight: '450px' }}>
                  {/* Original Description acting as first message */}
                  <div className="d-flex mb-4 ms-5 flex-row-reverse">
                    <div className="avatar-circle bg-primary text-white fw-bold flex-shrink-0 d-flex align-items-center justify-content-center ms-3 mt-1" style={{ width: '40px', height: '40px', borderRadius: '50%', fontSize: '14px' }}>
                      {(currentUser?.name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="message-bubble bg-primary-light border border-primary border-opacity-25 p-3 rounded-3 shadow-sm w-100">
                      <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2 border-primary border-opacity-25">
                        <strong className="text-primary">You</strong>
                        <small className="text-muted">{formatDate(selectedTicket.createdAt || selectedTicket.dateRaised)}</small>
                      </div>
                      <div className="text-dark" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {selectedTicket.description}
                      </div>
                    </div>
                  </div>

                  {selectedTicket.comments && selectedTicket.comments.length > 0 && selectedTicket.comments.map((comment, index) => {
                    const isMe = comment.user_id === currentUser.id || comment.author_name === currentUser.name;
                    return (
                      <div key={index} className={`d-flex mb-4 ${isMe ? 'ms-5 flex-row-reverse' : 'me-5'}`}>
                        <div className={`avatar-circle fw-bold flex-shrink-0 d-flex align-items-center justify-content-center ${isMe ? 'bg-primary ms-3' : 'bg-secondary me-3'} text-white mt-1`} style={{ width: '40px', height: '40px', borderRadius: '50%', fontSize: '14px' }}>
                          {isMe ? 'Y' : 'A'}
                        </div>
                        <div className={`message-bubble p-3 rounded-3 shadow-sm w-100 ${isMe ? 'bg-primary-light border-primary border border-opacity-25' : 'bg-white border'}`}>
                          <div className={`d-flex justify-content-between align-items-center mb-2 border-bottom pb-2 ${isMe ? 'border-primary border-opacity-25' : ''}`}>
                            <strong className={isMe ? 'text-primary' : 'text-dark'}>{isMe ? 'You' : comment.author_name}</strong>
                            <small className="text-muted">{formatDate(comment.created_at)}</small>
                          </div>
                          <div className="text-dark" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                            {comment.comment}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedTicket.status !== 'Closed' && (
                  <div className="p-3 bg-white border-top">
                    <div className="position-relative">
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type your reply here..."
                        className="pe-5 bg-light form-control-editable"
                        style={{ borderRadius: '12px', resize: 'none' }}
                      />
                      <Button
                        variant="primary"
                        className="position-absolute d-flex align-items-center justify-content-center rounded-circle p-2 shadow-sm"
                        style={{ bottom: '12px', right: '12px', width: '36px', height: '36px' }}
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </Col>
              
              {/* Right Column: Ticket Meta Data */}
              <Col lg={4} className="bg-white p-4">
                <h6 className="fw-bold mb-4 text-uppercase text-secondary" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Ticket Details</h6>
                
                <div className="mb-4">
                  <label className="text-muted small fw-bold d-block mb-2">Current Status</label>
                  <div>{getStatusBadge(selectedTicket.status)}</div>
                </div>
                
                <div className="mb-4 p-3 bg-light rounded-3 border">
                  <label className="text-muted small fw-bold d-block mb-1">Priority</label>
                  <div className="mb-3">{getPriorityBadge(selectedTicket.priority)}</div>
                  
                  <label className="text-muted small fw-bold d-block mb-1">Category</label>
                  <div><Badge bg="info" className="px-2 py-1">{selectedTicket.category}</Badge></div>
                </div>
                
                <hr className="text-muted opacity-25 my-4" />
                
                <div className="mb-0">
                  <label className="text-muted small fw-bold d-block mb-1">Created At</label>
                  <div className="text-muted small">{formatDate(selectedTicket.createdAt || selectedTicket.dateRaised)}</div>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={!!deleteConfirmId} onHide={() => setDeleteConfirmId(null)} centered size="sm">
        <Modal.Header closeButton><Modal.Title className="fs-6">Delete Ticket?</Modal.Title></Modal.Header>
        <Modal.Body><p className="mb-0 text-muted small">This action cannot be undone. The ticket and all its comments will be permanently deleted.</p></Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button variant="primary" size="sm" className="bg-danger border-danger" onClick={confirmDelete}>Yes, Delete</Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .icon-box {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        .bg-primary-light { background-color: rgba(30, 64, 175, 0.1); }
        .bg-warning-light { background-color: rgba(245, 158, 11, 0.1); }
        .bg-info-light { background-color: rgba(6, 182, 212, 0.1); }
        .bg-success-light { background-color: rgba(16, 185, 129, 0.1); }
        .bg-danger-light { background-color: rgba(239, 68, 68, 0.1); }
        .extra-small {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stats-row-container::-webkit-scrollbar {
          height: 4px;
        }
        .stats-row-container::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .ticket-mobile-card {
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
        .support-pill-card:hover {
          background-color: #f8f9fa !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
        .bg-primary-light { background-color: rgba(30, 64, 175, 0.1) !important; }
        .badge-reopened {
          background-color: #9333ea !important;
          color: white !important;
        }
        .badge-orange {
          background-color: #f97316 !important;
          color: white !important;
        }
      `}</style>
    </>
  );
}

export default SupportDashboard;





