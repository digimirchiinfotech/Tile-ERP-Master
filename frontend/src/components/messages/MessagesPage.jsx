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
import { Container, Row, Col, Card, Form, Button, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { Send, MessageCircle, Trash2, Check } from 'lucide-react';
import api from '../../services/api.js';
import './MessagesPage.css';

function MessagesPage({ currentUser }) {
  const [activeTab, setActiveTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationUsers, setConversationUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [newMessage, setNewMessage] = useState({
    recipientId: '',
    subject: '',
    content: ''
  });

  // Fetch messages on tab change
  useEffect(() => {
    fetchMessages();
  }, [activeTab]);
  
  // Fetch recipients once on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/messages/recipients');
      if (response.data.success && response.data.data) {
        setUsers(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (err) {
      setUsers([]);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = activeTab === 'inbox' ? '/inbox' : '/sent';
      const response = await api.get(`/messages${endpoint}`);

      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (err) {
      setError('Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = async (message) => {
    setSelectedMessage(message);
    
    // Mark as read if in inbox
    if (activeTab === 'inbox' && !message.is_read) {
      try {
        await api.put(`/messages/${message.id}/read`, {});
        // Update local state
        setMessages(messages.map(m => 
          m.id === message.id ? { ...m, is_read: true } : m
        ));
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.recipientId || !newMessage.content) {
      setError('Recipient and message content are required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/messages/send', {
        recipientId: newMessage.recipientId,
        subject: newMessage.subject || 'No Subject',
        content: newMessage.content
      });

      if (response.data.success) {
        setNewMessage({ recipientId: '', subject: '', content: '' });
        setError('');
        alert('Message sent successfully!');
        fetchMessages();
      }
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;

    try {
      await api.delete(`/messages/${messageId}`);
      setMessages(messages.filter(m => m.id !== messageId));
      setSelectedMessage(null);
    } catch (err) {
      setError('Failed to delete message');
      console.error('Error deleting message:', err);
    }
  };

  return (
    <Container fluid className="messages-page">
      <Card className="border-0 shadow-sm overflow-hidden mb-4 bg-primary text-white" style={{ borderRadius: '16px' }}>
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col>
              <h2 className="mb-1 fw-bold text-white d-flex align-items-center gap-2">
                <MessageCircle size={28} />
                Messages
              </h2>
              <p className="text-white text-opacity-75 mb-0">Manage your internal communications</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="secondary" onClose={() => setError('')} dismissible>{error}</Alert>}

      <Row>
        <Col lg={4}>
          <Card className="messages-list border-0 shadow-sm" style={{ borderRadius: '16px' }}>
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex gap-2">
                <Button 
                  variant={activeTab === 'inbox' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setActiveTab('inbox')}
                >
                  Inbox
                </Button>
                <Button 
                  variant={activeTab === 'sent' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setActiveTab('sent')}
                >
                  Sent
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading && <Spinner animation="border" className="m-3" />}
              {!loading && messages.length === 0 && (
                <p className="text-center text-muted py-4">No messages</p>
              )}
              <ListGroup variant="flush">
                {messages.map((msg) => (
                  <ListGroup.Item
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`cursor-pointer ${selectedMessage?.id === msg.id ? 'active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-bold">
                          {activeTab === 'inbox' ? msg.sender_name : msg.recipient_name}
                        </div>
                        <small className="text-muted">{msg.subject}</small>
                        <div className="text-truncate small">{msg.content}</div>
                      </div>
                      {activeTab === 'inbox' && !msg.is_read && (
                        <Badge bg="primary">New</Badge>
                      )}
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          {selectedMessage ? (
            <Card className="message-view border-0 shadow-sm" style={{ borderRadius: '16px' }}>
              <Card.Header className="bg-white border-bottom-0 pt-3 d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">{selectedMessage.subject}</h6>
                  <small className="text-muted">
                    From: {activeTab === 'inbox' ? selectedMessage.sender_name : selectedMessage.recipient_name}
                  </small>
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </Card.Header>
              <Card.Body>
                <div className="message-content mb-4">
                  {selectedMessage.content}
                </div>
                <small className="text-muted">
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </small>
              </Card.Body>
            </Card>
          ) : (
            <Card className="message-compose border-0 shadow-sm" style={{ borderRadius: '16px' }}>
              <Card.Header className="bg-white border-bottom-0 pt-3">
                <h6 className="mb-0">New Message</h6>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSendMessage}>
                  <Form.Group className="mb-3">
                    <Form.Label>Recipient</Form.Label>
                    <Form.Select
                      value={newMessage.recipientId}
                      onChange={(e) => setNewMessage({ ...newMessage, recipientId: e.target.value })}
                      required
                    >
                      <option value="">Select recipient...</option>
                      {users.filter(u => u.id !== currentUser?.id).map(user => (
                        <option key={user.id} value={user.id}>{user.name} ({user.email_id})</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Subject</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter subject..."
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      placeholder="Type your message..."
                      value={newMessage.content}
                      onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Button 
                    variant="primary" 
                    type="submit"
                    disabled={loading}
                  >
                    <Send size={16} className="me-2" />
                    Send Message
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default MessagesPage;
