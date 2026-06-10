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

import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, InputGroup, Offcanvas, ListGroup, Spinner } from 'react-bootstrap';
import { Bot, Send, X, MessageSquare, Zap } from 'lucide-react';
import Button from '../shared/Button.jsx';
import api from '../../services/api.js';

const AIAssistant = ({ currentUser }) => {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: userMessage.content,
        history: chatHistory
      });

      if (response.data.success) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <>
      <Button
        variant="primary"
        className="ai-toggle-btn rounded-circle shadow-lg"
        onClick={() => setShow(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-label="Open AI Assistant"
      >
        <Bot size={30} />
      </Button>

      <Offcanvas show={show} onHide={() => setShow(false)} placement="end" style={{ width: '400px' }}>
        <Offcanvas.Header closeButton className="bg-primary text-white border-0">
          <Offcanvas.Title className="d-flex align-items-center text-white fw-bold">
            <Bot size={24} className="me-2 text-white" />
            AI Assistant
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-0">
          <div 
            className="chat-container flex-grow-1 p-3" 
            ref={scrollRef}
            style={{ overflowY: 'auto', backgroundColor: '#f8fafc' }}
          >
            {chatHistory.length === 0 && (
              <div className="text-center mt-5 text-muted">
                <MessageSquare size={48} className="mb-3 opacity-25" />
                <p>Hello! How can I help you with your export operations today?</p>
              </div>
            )}
            {chatHistory.map((msg, idx) => (
              <div 
                key={idx} 
                className={`mb-3 d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                <Card 
                  className={`p-2 border-0 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white'}`}
                  style={{ maxWidth: '85%', borderRadius: '12px' }}
                >
                  <Card.Text style={{ fontSize: '0.9rem', marginBottom: 0 }}>
                    {msg.content}
                  </Card.Text>
                </Card>
              </div>
            ))}
            {loading && (
              <div className="d-flex justify-content-start mb-3">
                <Card className="p-2 border-0 shadow-sm bg-white" style={{ borderRadius: '12px' }}>
                  <Spinner animation="border" size="sm" variant="primary" />
                </Card>
              </div>
            )}
          </div>
          <div className="p-3 border-top bg-white">
            <Form onSubmit={handleSend}>
              <InputGroup>
                <Form.Control
                  placeholder="Ask me anything..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="border-0 bg-light"
                />
                <Button variant="primary" type="submit" disabled={loading} aria-label="Send message">
                  <Send size={18} />
                </Button>
              </InputGroup>
            </Form>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <style>{`
        .ai-toggle-btn {
          transition: transform 0.2s;
        }
        .ai-toggle-btn:hover {
          transform: scale(1.1);
        }
        .chat-container::-webkit-scrollbar {
          width: 6px;
        }
        .chat-container::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </>
  );
};

export default AIAssistant;
