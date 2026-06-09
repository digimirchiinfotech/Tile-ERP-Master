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
import { Container, Row, Col, Card, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { Trash2, Check, CheckCheck, Bell, Info, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import Button from '../shared/Button.jsx';
import { notificationAPI } from '../../services/notificationAPI.js';
import { formatDisplayDate } from '../../utils/formatters.js';
import './NotificationsPage.css';

function NotificationsPage({ currentUser, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread
  const [typeFilter, setTypeFilter] = useState('all'); // all, info, success, warning, error

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = filter === 'unread' ? { unread: 'true' } : {};
      const response = await notificationAPI.getNotifications(filters);

      if (response.success) {
        setNotifications(response.data || []);
      }
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data?.count || 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const handleMarkAsRead = async (notificationId, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = async (notificationId, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationAPI.deleteNotification(notificationId);
      const wasUnread = notifications.find(n => n.id === notificationId && !n.is_read);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await Promise.all(notifications.map(n => notificationAPI.deleteNotification(n.id)));
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  const SAFE_ROUTES = new Set([
    'invoice-management', 'invoice-dashboard', 'export-invoice-form', 'order-dashboard',
    'qc-management', 'proforma-invoice', 'support-tickets', 'notifications',
    'packing-list-form', 'vgm-form', 'shipping-instructions-form', 'export-invoice-annexure-form',
    'user-management'
  ]);

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) handleMarkAsRead(notification.id);

    if (notification.action_url && onNavigate) {
      const url = notification.action_url.replace(/^\//, '');
      const parts = url.split('/');
      const baseView = parts[0];
      const id = parts[1];

      // Security: only navigate to known safe routes
      if (!SAFE_ROUTES.has(baseView)) return;

      if (baseView === 'invoice-management') {
        onNavigate('export-invoice-form', { invoiceId: id });
      } else if (baseView === 'order-dashboard') {
        onNavigate('order-dashboard');
      } else if (baseView === 'qc-management') {
        onNavigate('qc-management', { qcId: id });
      } else {
        onNavigate(url);
      }
    }
  };

  const displayedNotifications = typeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.type === typeFilter);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="text-success" />;
      case 'warning': return <AlertTriangle size={20} className="text-warning" />;
      case 'error': return <XCircle size={20} className="text-danger" />;
      case 'order': return <Clock size={20} className="text-primary" />;
      default: return <Info size={20} className="text-info" />;
    }
  };

  return (
    <Container fluid className="notifications-page">
      <Card className="border-0 shadow-sm overflow-hidden mb-4 bg-primary text-white" style={{ borderRadius: '16px' }}>
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col>
              <h2 className="mb-1 fw-bold text-white d-flex align-items-center gap-2">
                <Bell size={28} />
                Notifications Center
              </h2>
              <p className="text-white text-opacity-75 mb-0">Stay updated with system activities and alerts</p>
            </Col>
            <Col xs="auto" className="d-flex gap-2 flex-wrap">
              {unreadCount > 0 && (
                <Button variant="light" size="sm" className="text-primary fw-bold" onClick={handleMarkAllAsRead}>
                  <CheckCheck size={16} className="me-1" /> Mark All Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="light" size="sm" className="text-danger fw-bold" onClick={handleClearAll}>
                  <Trash2 size={16} className="me-1" /> Clear All
                </Button>
              )}
              <Badge bg="light" className="text-primary d-flex align-items-center px-3 fw-bold">
                {unreadCount} Unread
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      <Row>
        <Col lg={3} className="mb-4">
          <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
            <Card.Body className="p-3">
          <h6 className="text-uppercase text-muted small fw-bold mb-3">Filter By</h6>
              <div className="d-flex flex-column gap-2">
                <Button variant={filter === 'all' ? 'primary' : 'outline'} onClick={() => setFilter('all')} className="text-start justify-content-start" block>
                  All Notifications
                </Button>
                <Button variant={filter === 'unread' ? 'primary' : 'outline'} onClick={() => setFilter('unread')} className="text-start justify-content-start" block>
                  Unread
                  {unreadCount > 0 && <Badge bg="danger" className="ms-auto rounded-pill">{unreadCount}</Badge>}
                </Button>

                <hr className="my-2" />
                <p className="text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.5px', fontWeight: 700, margin: 0 }}>By Type</p>
                {['all', 'info', 'success', 'warning', 'error'].map(t => (
                  <Button key={t} variant={typeFilter === t ? 'primary' : 'outline'} size="sm" onClick={() => setTypeFilter(t)} className="text-start justify-content-start text-capitalize" block>
                    {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={9}>
          <Card className="border-0 shadow-sm overflow-hidden" style={{ borderRadius: '16px' }}>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted">Loading notifications...</p>
                </div>
              ) : error ? (
                <div className="text-center py-5">
                  <XCircle size={40} className="text-danger mb-3" />
                  <h6 className="text-danger">{error}</h6>
                  <Button variant="outline" size="sm" onClick={fetchNotifications} className="mt-2">
                    Retry
                  </Button>
                </div>
              ) : displayedNotifications.length === 0 ? (
                <div className="text-center py-5">
                  <Bell size={48} className="text-muted opacity-25 mb-3" />
                  <h5>No notifications found</h5>
                  <p className="text-muted">You're all caught up!</p>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {displayedNotifications.map((notification) => (
                    <ListGroup.Item
                      key={notification.id}
                      className={`notification-item p-3 border-start border-4 ${!notification.is_read ? 'unread border-primary bg-light' : 'border-transparent'}`}
                      action
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <Row className="align-items-start g-0">
                        <Col xs="auto" className="me-3">
                          <div className="notification-icon-wrapper p-2 bg-white rounded-3 shadow-sm">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </Col>
                        <Col>
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <h6 className={`mb-0 ${!notification.is_read ? 'fw-bold' : ''}`}>
                              {notification.title}
                            </h6>
                            <small className="text-muted">
                              {formatDisplayDate(notification.created_at)}
                            </small>
                          </div>
                          <p className="mb-0 text-muted small">{notification.message}</p>
                        </Col>
                        <Col xs="auto" className="ms-3">
                          <div className="d-flex gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="p-1 border-0"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                title="Mark as read"
                              >
                                <Check size={16} />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="p-1 border-0 text-danger"
                              onClick={(e) => handleDelete(notification.id, e)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style>{`
        .notification-item {
          transition: all 0.2s ease;
        }
        .notification-item:hover {
          transform: translateX(4px);
        }
        .notification-item.unread {
          background-color: #f8fbff !important;
        }
        .border-transparent {
          border-left-color: transparent !important;
        }
        .notification-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </Container>
  );
}

export default NotificationsPage;




