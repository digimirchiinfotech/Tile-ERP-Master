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
import { Form, Alert, Card, Badge } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';
import { TicketCategory, TicketPriority } from '../../services/supportTicketService';
import { useSupportTickets } from '../../hooks/useSupportTickets';

// Default field placeholders
const FIELD_PLACEHOLDERS = {
  name: { placeholder: 'Enter your full name' },
  email: { placeholder: 'Enter your email address' },
  description: { placeholder: 'Describe your issue in detail...' }
};

const SupportTicketForm = ({ currentUser, onTicketCreated, initialData }) => {
  const { createTicket, updateTicket } = useSupportTickets();
  const [formData, setFormData] = useState({
    userName: currentUser?.name || '',
    email: currentUser?.email_id || currentUser?.email || '',
    category: initialData?.category || '',
    priority: initialData?.priority || TicketPriority.MEDIUM,
    description: initialData?.description || ''
  });
  
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.userName.trim()) {
      newErrors.userName = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitStatus('error');
      return;
    }

    try {
      let ticket;
      if (initialData && initialData.id) {
        ticket = await updateTicket(initialData.id, {
          subject: `${formData.category} - ${formData.userName}`,
          category: formData.category,
          priority: formData.priority,
          description: formData.description,
        });
      } else {
        ticket = await createTicket({
          subject: `${formData.category} - ${formData.userName}`,
          category: formData.category,
          priority: formData.priority,
          description: formData.description,
        });
      }
      
      setSubmittedTicket(ticket);
      setSubmitStatus('success');
      
      if (!initialData) {
        setFormData({
          userName: currentUser?.name || '',
          email: currentUser?.email_id || currentUser?.email || '',
          category: '',
          priority: TicketPriority.MEDIUM,
          description: ''
        });
      }
      
      if (onTicketCreated) {
        onTicketCreated(ticket);
      }
      
      setTimeout(() => {
        setSubmitStatus(null);
        setSubmittedTicket(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error saving ticket:', error);
      setSubmitStatus('error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      [TicketPriority.LOW]: 'secondary',
      [TicketPriority.MEDIUM]: 'primary',
      [TicketPriority.HIGH]: 'warning',
      [TicketPriority.CRITICAL]: 'danger'
    };
    return <Badge bg={variants[priority]}>{priority}</Badge>;
  };

  return (
    <div className="support-ticket-form">
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-start border-0">
          <h5 className="mb-0 fw-bold text-white">
            <AlertCircle size={20} className="me-2 text-white" />
            Submit Support Ticket
          </h5>
        </Card.Header>
        <Card.Body>
          {submitStatus === 'success' && submittedTicket && (
            <Alert variant="primary" className="mb-4">
              <CheckCircle size={20} className="me-2" />
              <strong>Ticket Created Successfully!</strong>
              <div className="mt-2">
                Your ticket <strong>{submittedTicket.ticketId}</strong> has been submitted. 
                Our support team will review it shortly.
              </div>
            </Alert>
          )}
          
          {submitStatus === 'error' && (
            <Alert variant="secondary" className="mb-4">
              <AlertCircle size={20} className="me-2" />
              Please correct the errors below and try again.
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Your Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleChange}
                    isInvalid={!!errors.userName}
                    placeholder={FIELD_PLACEHOLDERS.name.placeholder}
                    className="form-control-editable"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.userName}
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Email Address <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    isInvalid={!!errors.email}
                    placeholder={FIELD_PLACEHOLDERS.email.placeholder}
                    className="form-control-editable"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Issue Category <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    isInvalid={!!errors.category}
                  >
                    <option value="">Select a category...</option>
                    {Object.values(TicketCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.category}
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Priority <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    {Object.values(TicketPriority).map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Description <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                name="description"
                value={formData.description}
                onChange={handleChange}
                isInvalid={!!errors.description}
                placeholder={FIELD_PLACEHOLDERS.description.placeholder}
              />
              <Form.Control.Feedback type="invalid">
                {errors.description}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Minimum 10 characters. Be as specific as possible.
              </Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                <span className="text-danger">*</span> Required fields
              </div>
              <Button type="submit" variant="primary" size="lg">
                <Send size={18} className="me-2" />
                Submit Ticket
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SupportTicketForm;





