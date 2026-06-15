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
import { Row, Col, Card, Table, Badge, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Ticket, MessageSquare, CheckCircle, Clock, AlertTriangle, Search, Filter, Download, Send } from 'lucide-react';
import { 
  TicketStatus, 
  TicketPriority 
} from '../../services/supportTicketService';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { useSocket } from '../../hooks/useSocket';
import { useUserContext } from '../../contexts/UserContext';

const SuperAdminTickets = () => {
  const { tickets, stats, loading, error, fetchTickets, fetchTicketById, updateTicketStatus, addComment } = useSupportTickets();
  const { socket, isConnected } = useSocket();
  const { user: currentUser } = useUserContext();
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

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

  useEffect(() => {
    applyFilters();
  }, [tickets, searchTerm, filterStatus, filterPriority]);

  const applyFilters = () => {
    let filtered = [...(tickets || [])];

    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        (ticket.ticketId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === filterPriority);
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredTickets(filtered);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateTicketStatus(id, newStatus);
      const refreshed = await fetchTicketById(id);
      setSelectedTicket(refreshed || null);
    } catch (err) {
      console.error('Error updating ticket status:', err);
    }
  };

  const handleCreateComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    
    try {
      await addComment(selectedTicket.id, newComment, currentUser?.name || 'Support Admin');
      setNewComment('');
      const refreshed = await fetchTicketById(selectedTicket.id);
      setSelectedTicket(refreshed || null);
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleViewDetails = async (ticket) => {
    try {
      const fullTicket = await fetchTicketById(ticket.id);
      setSelectedTicket(fullTicket);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch ticket details:', err);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      [TicketStatus.OPEN]: { bg: 'danger', icon: '🔴 ' },
      [TicketStatus.IN_PROGRESS]: { bg: 'warning', icon: '🟠 ' },
      [TicketStatus.PENDING_USER]: { bg: 'warning', text: 'dark', icon: '🟡 ' },
      [TicketStatus.RESOLVED]: { bg: 'success', icon: '🟢 ' },
      [TicketStatus.CLOSED]: { bg: 'secondary', icon: '⚫ ' },
      [TicketStatus.REOPENED]: { bg: 'info', icon: '🟣 ' }
    };
    const v = variants[status] || { bg: 'secondary', icon: '⚫ ' };
    return (
      <Badge bg={v.bg} text={v.text || 'white'} className={status === TicketStatus.REOPENED ? 'badge-reopened' : ''}>
        {v.icon}
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      [TicketPriority.LOW]: { bg: 'success', icon: '🟢 ' },
      [TicketPriority.MEDIUM]: { bg: 'warning', text: 'dark', icon: '🟡 ' },
      [TicketPriority.HIGH]: { bg: 'orange', icon: '🟠 ' },
      [TicketPriority.CRITICAL]: { bg: 'danger', icon: '🔴 ' }
    };
    const v = variants[priority] || { bg: 'secondary', icon: '⚫ ' };
    return (
      <Badge bg={v.bg} text={v.text || 'white'} className={priority === TicketPriority.HIGH ? 'badge-orange' : ''}>
        {v.icon}
        {priority}
      </Badge>
    );
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

  const truncateText = (text, maxLength = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="super-admin-tickets">
      <div className="mb-4">
        <h2 className="mb-3">
          <Ticket size={28} className="me-2" />
          Support Tickets
        </h2>

        {/* Unified Stats Row */}
        <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
          <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-danger-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <AlertTriangle size={18} className="text-danger" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Open Tickets</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.open || 0}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
          <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-warning-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Clock size={18} className="text-warning" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>In Progress</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.inProgress || 0}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
          <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <CheckCircle size={18} className="text-success" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Resolved</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.resolved || 0}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
          <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Ticket size={18} className="text-primary" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Total Tickets</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{stats.total || 0}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
        </Row>

        <Card className="mb-3">
          <Card.Body>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text">
                    <Search size={18} />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Search by ticket ID, name, email, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <Form.Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  {Object.values(TicketStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-3">
                <Form.Select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  {Object.values(TicketPriority).map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <Button 
                  variant="outline" 
                  className="w-100" 
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('access_token');
                      const selectedCompanyId = localStorage.getItem('selected_company_id');
                      const headers = {
                        'Authorization': `Bearer ${token}`
                      };
                      if (selectedCompanyId) {
                        headers['x-company-id'] = selectedCompanyId;
                        headers['x-selected-company-id'] = selectedCompanyId;
                      }

                      const response = await fetch(`${"https://tile-erp-master-production.railway.app/api" || '/api'}/export/support-tickets`, {
                        headers
                      });
                      if (!response.ok) throw new Error('Export failed');
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `support-tickets-${new Date().toLocaleDateString('en-CA')}.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error('Export failed:', err);
                      alert('Export failed. Please try again.');
                    }
                  }}
                >
                  <Download size={18} className="me-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          {filteredTickets.length === 0 ? (
            <Alert variant="info" className="m-4">
              <Ticket size={20} className="me-2" />
              No support tickets found. {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' ? 'Try adjusting your filters.' : ''}
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Ticket ID</th>
                    <th>Raised By</th>
                    <th>Email</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date Raised</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <strong className="text-primary">{ticket.ticketId}</strong>
                      </td>
                      <td>{ticket.userName}</td>
                      <td>
                        <small>{ticket.email}</small>
                      </td>
                      <td>
                        <Badge bg="info">{ticket.category}</Badge>
                      </td>
                      <td>{getPriorityBadge(ticket.priority)}</td>
                      <td>{getStatusBadge(ticket.status)}</td>
                      <td>
                        <small>{formatDate(ticket.createdAt)}</small>
                      </td>
                      <td>
                        <small className="text-muted">
                          {truncateText(ticket.description)}
                        </small>
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(ticket)}
                        >
                          <MessageSquare size={14} className="me-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="xl" className="support-ticket-modal">
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
                  <p className="text-muted small mb-0">Original request from {formatDate(selectedTicket.createdAt)}</p>
                </div>
                
                <div className="flex-grow-1 p-4 bg-light overflow-auto ticket-comments-list" style={{ maxHeight: '450px' }}>
                  {/* Original Description acting as first message */}
                  <div className="d-flex mb-4 me-5">
                    <div className="avatar-circle bg-secondary text-white fw-bold flex-shrink-0 d-flex align-items-center justify-content-center me-3 mt-1" style={{ width: '40px', height: '40px', borderRadius: '50%', fontSize: '14px' }}>
                      {(selectedTicket.userName || 'U')[0].toUpperCase()}
                    </div>
                    <div className="message-bubble bg-white border p-3 rounded-3 shadow-sm w-100">
                      <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                        <strong className="text-dark">{selectedTicket.userName || 'User'}</strong>
                        <small className="text-muted">{formatDate(selectedTicket.createdAt)}</small>
                      </div>
                      <div className="text-dark" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {selectedTicket.description}
                      </div>
                    </div>
                  </div>

                  {selectedTicket.comments && selectedTicket.comments.length > 0 && selectedTicket.comments.map((comment, index) => {
                    const isMe = comment.user_id === currentUser?.id;
                    const isTicketCreator = comment.user_id === selectedTicket.created_by;
                    return (
                      <div key={index} className={`d-flex mb-4 ${isMe ? 'ms-5 flex-row-reverse' : 'me-5'}`}>
                        <div className={`avatar-circle fw-bold flex-shrink-0 d-flex align-items-center justify-content-center ${isMe ? 'bg-primary ms-3' : isTicketCreator ? 'bg-secondary me-3' : 'bg-info me-3'} text-white mt-1`} style={{ width: '40px', height: '40px', borderRadius: '50%', fontSize: '14px' }}>
                          {(comment.author_name || 'U')[0].toUpperCase()}
                        </div>
                        <div className={`message-bubble p-3 rounded-3 shadow-sm w-100 ${isMe ? 'bg-primary-light border-primary border border-opacity-25' : 'bg-white border'}`}>
                          <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2 border-opacity-25">
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

                <div className="p-3 bg-white border-top">
                  <div className="position-relative">
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Type your response here..."
                      className="pe-5 bg-light form-control-editable"
                      style={{ borderRadius: '12px', resize: 'none' }}
                    />
                    <Button
                      variant="primary"
                      className="position-absolute d-flex align-items-center justify-content-center rounded-circle p-2 shadow-sm"
                      style={{ bottom: '12px', right: '12px', width: '36px', height: '36px' }}
                      onClick={handleCreateComment}
                      disabled={!newComment.trim()}
                    >
                      <Send size={16} />
                    </Button>
                  </div>
                </div>
              </Col>
              
              {/* Right Column: Ticket Meta Data */}
              <Col lg={4} className="bg-white p-4">
                <h6 className="fw-bold mb-4 text-uppercase text-secondary" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Ticket Details</h6>
                
                <div className="mb-4">
                  <label className="text-muted small fw-bold d-block mb-2">Update Status</label>
                  <Form.Select
                    size="md"
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                    className="fw-medium bg-light"
                  >
                    {Object.values(TicketStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Form.Select>
                </div>
                
                <div className="mb-4 p-3 bg-light rounded-3 border">
                  <label className="text-muted small fw-bold d-block mb-1">Priority</label>
                  <div className="mb-3">{getPriorityBadge(selectedTicket.priority)}</div>
                  
                  <label className="text-muted small fw-bold d-block mb-1">Category</label>
                  <div><Badge bg="info" className="px-2 py-1">{selectedTicket.category}</Badge></div>
                </div>
                
                <hr className="text-muted opacity-25 my-4" />
                
                <h6 className="fw-bold mb-3 text-uppercase text-secondary" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Customer Info</h6>
                
                <div className="mb-3">
                  <label className="text-muted small fw-bold d-block mb-1">Raised By</label>
                  <div className="text-dark fw-bold">{selectedTicket.userName || 'Unknown User'}</div>
                </div>
                
                <div className="mb-3">
                  <label className="text-muted small fw-bold d-block mb-1">Email Address</label>
                  <a href={`mailto:${selectedTicket.email}`} className="text-decoration-none">{selectedTicket.email}</a>
                </div>
                
                <div className="mb-0">
                  <label className="text-muted small fw-bold d-block mb-1">Created At</label>
                  <div className="text-muted small">{formatDate(selectedTicket.createdAt)}</div>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
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
        .badge-reopened {
          background-color: #9333ea !important;
          color: white !important;
        }
        .badge-orange {
          background-color: #f97316 !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
};

export default SuperAdminTickets;
