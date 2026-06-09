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
import { Toast, ToastContainer, Badge, Dropdown, Button, Modal, Card } from 'react-bootstrap';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  Clock,
  FileText,
  Users,
  Package,
  X,
  Settings} from 'lucide-react';

/**
 * Enhanced Notification System with Payment Reminders & Status Alerts
 * Provides comprehensive notification management for the ERP system
 */

let notificationSystemInstance = null;

const EnhancedNotificationSystem = ({ onRef, currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    paymentReminders: true,
    statusUpdates: true,
    systemAlerts: true,
    orderUpdates: true,
    emailNotifications: true,
    pushNotifications: true,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [activeToasts, setActiveToasts] = useState([]);
  const toastRef = useRef(null);

  useEffect(() => {
    if (onRef) {
      onRef({
        addNotification,
        removeNotification,
        clearAll,
        addPaymentReminder,
        addStatusUpdate,
        addSystemAlert,
      });
    }
    notificationSystemInstance = {
      addNotification,
      removeNotification,
      clearAll,
      addPaymentReminder,
      addStatusUpdate,
      addSystemAlert,
    };
  }, [onRef]);

  /**
   * Add a new notification
   */
  const addNotification = (message, type = 'info', category = 'general', options = {}) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      category,
      timestamp: new Date(),
      read: false,
      priority: options.priority || 'normal',
      title: options.title || getDefaultTitle(type),
      actionUrl: options.actionUrl,
      actionText: options.actionText,
      metadata: options.metadata || {},
      ...options,
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Also show it as a floating toast
    setActiveToasts(prev => [...prev, notification]);

    // Cleanup toast after timeout
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    } else if (type === 'warning' || type === 'error') {
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== id));
      }, 8000);
    }

    return id;
  };

  /**
   * Add payment reminder notification
   */
  const addPaymentReminder = (reminderType, message, metadata = {}) => {
    const titles = {
      overdue: 'Payment Overdue',
      due_soon: 'Payment Due Soon',
      received: 'Payment Received',
    };

    const types = {
      overdue: 'error',
      due_soon: 'warning',
      received: 'success',
    };

    return addNotification(message, types[reminderType], 'payment', {
      title: titles[reminderType],
      priority: reminderType === 'overdue' ? 'high' : 'normal',
      metadata,
      actionUrl: '/account-finance-management',
      actionText: reminderType === 'received' ? 'View Details' : 'Review Payment',
    });
  };

  /**
   * Add status update notification
   */
  const addStatusUpdate = (entity, oldStatus, newStatus, entityId, metadata = {}) => {
    const message = `${entity} status changed from "${oldStatus}" to "${newStatus}"`;
    return addNotification(message, 'info', 'status', {
      title: 'Status Update',
      priority: 'normal',
      metadata: { entity, oldStatus, newStatus, entityId, ...metadata },
    });
  };

  /**
   * Add system alert notification
   */
  const addSystemAlert = (alertType, message, metadata = {}) => {
    const types = {
      maintenance: 'warning',
      error: 'error',
      update: 'info',
      security: 'error',
    };

    return addNotification(message, types[alertType] || 'info', 'system', {
      title: 'System Alert',
      priority: alertType === 'security' || alertType === 'error' ? 'high' : 'normal',
      metadata,
    });
  };

  /**
   * Remove notification by ID
   */
  const removeNotification = (id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  };

  /**
   * Clear all notifications
   */
  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  /**
   * Mark notification as read
   */
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id && !n.read) {
        setUnreadCount(count => Math.max(0, count - 1));
        return { ...n, read: true };
      }
      return n;
    }));
  };

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  /**
   * Get default title based on notification type
   */
  const getDefaultTitle = (type) => {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
    };
    return titles[type] || 'Notification';
  };

  /**
   * Get icon for notification type
   */
  const getNotificationIcon = (type, category) => {
    if (category === 'payment') return DollarSign;
    if (category === 'qc') return CheckCircle;
    if (category === 'order') return Package;
    if (category === 'lead') return Users;
    
    const icons = {
      success: CheckCircle,
      error: AlertTriangle,
      warning: AlertTriangle,
      info: Info,
    };
    return icons[type] || Info;
  };

  /**
   * Get badge variant for notification type
   */
  const getBadgeVariant = (type) => {
    const variants = {
      success: 'success',
      error: 'danger',
      warning: 'warning',
      info: 'info',
    };
    return variants[type] || 'secondary';
  };

  /**
   * Handle notification click
   */
  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      // In a real app, this would use React Router
    }
  };

  /**
   * Filter notifications by category
   */
  const getFilteredNotifications = (category = 'all') => {
    if (category === 'all') return notifications;
    return notifications.filter(n => n.category === category);
  };

  const categories = ['all', 'payment', 'status', 'system', 'order', 'qc'];

  return (
    <>
      {/* Notification Bell */}
      <Dropdown align="end">
        <Dropdown.Toggle 
          variant="link" 
          id="notification-dropdown"
          className="position-relative p-2 notification-bell"
          style={{ border: 'none', boxShadow: 'none' }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge 
              bg="danger" 
              pill 
              className="position-absolute top-0 start-100 translate-middle notification-badge"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Dropdown.Toggle>

        <Dropdown.Menu className="notification-dropdown-menu" style={{ width: '350px', maxHeight: '400px', overflowY: 'auto' }}>
          <div className="notification-header d-flex justify-content-between align-items-center p-3 border-bottom">
            <h6 className="mb-0">Notifications</h6>
            <div className="d-flex gap-2">
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setShowSettings(true)}
                className="p-0"
              >
                <Settings size={16} />
              </Button>
              {unreadCount > 0 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="p-0"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="text-center p-4">
                <Bell size={32} className="text-muted mb-2" />
                <p className="text-muted mb-0">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(notification => {
                const Icon = getNotificationIcon(notification.type, notification.category);
                return (
                  <div
                    key={notification.id}
                    className={`notification-item p-3 border-bottom cursor-pointer ${!notification.read ? 'notification-unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="d-flex align-items-start">
                      <div className={`notification-icon me-3 text-${getBadgeVariant(notification.type)}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="notification-title fw-medium">
                          {notification.title}
                        </div>
                        <div className="notification-message text-muted small">
                          {notification.message}
                        </div>
                        <div className="notification-time text-muted small">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="notification-unread-indicator"></div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 10 && (
            <div className="text-center p-2 border-top">
              <Button 
                variant="link" 
                size="sm"
                onClick={() => setShowNotificationCenter(true)}
              >
                View all notifications
              </Button>
            </div>
          )}
        </Dropdown.Menu>
      </Dropdown>

      {/* Floating Toasts for active notifications */}
      <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 1060 }}>
        {activeToasts.map(toast => {
          const Icon = getNotificationIcon(toast.type, toast.category);
          return (
            <Toast 
              key={toast.id} 
              onClose={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
              show={true}
              bg={toast.type === 'error' ? 'danger' : toast.type === 'warning' ? 'warning' : toast.type === 'success' ? 'success' : 'info'}
              className="text-white"
            >
              <Toast.Header closeButton={true}>
                <Icon size={16} className={`me-2 text-${getBadgeVariant(toast.type)}`} />
                <strong className="me-auto">{toast.title}</strong>
                <small>{new Date(toast.timestamp).toLocaleTimeString()}</small>
              </Toast.Header>
              <Toast.Body>{toast.message}</Toast.Body>
            </Toast>
          );
        })}
      </ToastContainer>

      {/* Notification Settings Modal */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Notification Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="notification-settings">
            {Object.entries(notificationSettings).map(([key, value]) => (
              <div key={key} className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`setting-${key}`}
                  checked={value}
                  onChange={(e) => setNotificationSettings(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                />
                <label className="form-check-label" htmlFor={`setting-${key}`}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSettings(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowSettings(false)}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .notification-bell:hover {
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 50%;
        }

        .notification-badge {
          font-size: 0.7rem;
          min-width: 18px;
          height: 18px;
        }

        .notification-dropdown-menu {
          border: none;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
        }

        .notification-item {
          transition: background-color 0.2s ease;
        }

        .notification-item:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-unread {
          background-color: rgba(13, 110, 253, 0.02);
        }

        .notification-unread-indicator {
          width: 8px;
          height: 8px;
          background-color: #0d6efd;
          border-radius: 50%;
          margin-top: 6px;
        }

        .notification-icon {
          margin-top: 2px;
        }

        .notification-title {
          font-size: 0.9rem;
          line-height: 1.3;
        }

        .notification-message {
          font-size: 0.8rem;
          line-height: 1.3;
          margin-top: 2px;
        }

        .notification-time {
          font-size: 0.75rem;
          margin-top: 4px;
        }

        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </>
  );
};

// Global notification functions
export const showNotification = (message, type = 'info', category = 'general', options = {}) => {
  if (notificationSystemInstance) {
    return notificationSystemInstance.addNotification(message, type, category, options);
  }
  return null;
};

export const showPaymentReminder = (reminderType, message, metadata = {}) => {
  if (notificationSystemInstance) {
    return notificationSystemInstance.addPaymentReminder(reminderType, message, metadata);
  }
  return null;
};

export const showStatusUpdate = (entity, oldStatus, newStatus, entityId, metadata = {}) => {
  if (notificationSystemInstance) {
    return notificationSystemInstance.addStatusUpdate(entity, oldStatus, newStatus, entityId, metadata);
  }
  return null;
};

export const showSystemAlert = (alertType, message, metadata = {}) => {
  if (notificationSystemInstance) {
    return notificationSystemInstance.addSystemAlert(alertType, message, metadata);
  }
  return null;
};

export const showSuccess = (message, options = {}) => {
  return showNotification(message, 'success', 'general', options);
};

export const showError = (message, options = {}) => {
  return showNotification(message, 'error', 'general', options);
};

export const showWarning = (message, options = {}) => {
  return showNotification(message, 'warning', 'general', options);
};

export const showInfo = (message, options = {}) => {
  return showNotification(message, 'info', 'general', options);
};

export default EnhancedNotificationSystem;




