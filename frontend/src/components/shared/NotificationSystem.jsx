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
import { Toast, ToastContainer, Alert, Badge, Button, Dropdown } from 'react-bootstrap';
import { Bell, CheckCircle, AlertCircle, Info, X, Clock, DollarSign, FileText, Send } from 'lucide-react';

/**
 * Notifications & Alerts System
 * Features:
 * - Payment Due Reminders
 * - Status Change Notifications 
 * - Dashboard Alerts for overdue invoices/low stock
 */
function NotificationSystem({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Generate role-specific notifications
    const generateNotifications = () => {
      const baseNotifications = [
        {
          id: 1,
          type: 'payment_due',
          title: 'Payment Due Reminder',
          message: 'Invoice PI/01/25/001 from ABC Trading Co. is due in 2 days',
          time: '2 hours ago',
          read: false,
          icon: DollarSign,
          color: 'warning',
          priority: 'high',
          actionable: true,
          action: 'view_invoice',
          data: { invoiceId: 'PI/01/25/001' }
        },
        {
          id: 2,
          type: 'status_change',
          title: 'Invoice Status Updated',
          message: 'Invoice PI/01/25/003 has been marked as paid',
          time: '4 hours ago',
          read: false,
          icon: CheckCircle,
          color: 'success',
          priority: 'medium',
          actionable: false,
        },
        {
          id: 3,
          type: 'overdue_alert',
          title: 'Overdue Invoice Alert',
          message: 'Invoice PI/12/24/089 from European Tiles Ltd. is 5 days overdue',
          time: '6 hours ago',
          read: true,
          icon: AlertCircle,
          color: 'danger',
          priority: 'high',
          actionable: true,
          action: 'send_reminder',
          data: { invoiceId: 'PI/12/24/089' }
        },
        {
          id: 4,
          type: 'new_lead',
          title: 'New Lead Assigned',
          message: 'You have been assigned a new lead: Global Imports Inc.',
          time: '1 day ago',
          read: true,
          icon: Info,
          color: 'info',
          priority: 'medium',
          actionable: true,
          action: 'view_lead',
          data: { leadId: 'LD001' }
        },
        {
          id: 5,
          type: 'system_alert',
          title: 'System Maintenance',
          message: 'Scheduled maintenance on Sunday, 2:00 AM - 4:00 AM',
          time: '2 days ago',
          read: false,
          icon: Info,
          color: 'info',
          priority: 'low',
          actionable: false,
        },
      ];

      // Filter notifications based on user role
      let filteredNotifications = baseNotifications;
      
      if (currentUser?.role === 'sales_manager' || currentUser?.role === 'sales_executive') {
        filteredNotifications = baseNotifications.filter(n => 
          ['new_lead', 'status_change', 'system_alert'].includes(n.type)
        );
      } else if (currentUser?.role === 'account') {
        filteredNotifications = baseNotifications.filter(n => 
          ['payment_due', 'overdue_alert', 'status_change'].includes(n.type)
        );
      }

      return filteredNotifications;
    };

    setNotifications(generateNotifications());
  }, [currentUser]);

  // Show toast notification
  const showToast = (notification) => {
    const toast = {
      id: Date.now(),
      ...notification,
      show: true,
    };
    setToasts(prev => [...prev, toast]);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideToast(toast.id);
    }, 5000);
  };

  // Hide toast notification
  const hideToast = (toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Handle notification action
  const handleNotificationAction = (notification) => {
    markAsRead(notification.id);
    
    switch (notification.action) {
      case 'view_invoice':
        // Navigate to invoice view
        // Navigate to invoice view with invoice ID
        break;
      case 'send_reminder':
        // Send payment reminder
        showToast({
          type: 'success',
          title: 'Reminder Sent',
          message: 'Payment reminder has been sent to the client',
          color: 'success',
          icon: CheckCircle,
        });
        break;
      case 'view_lead':
        // Navigate to lead view
        // Navigate to lead view with lead ID
        break;
      default:
        break;
    }
  };

  // Get unread count
  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  // Get priority notifications for dashboard alerts
  const getPriorityAlerts = () => {
    return notifications.filter(n => n.priority === 'high' && !n.read);
  };

  return (
    <>
      {/* Notification Bell */}
      <Dropdown show={showDropdown} onToggle={setShowDropdown}>
        <Dropdown.Toggle
          variant="link"
          className="notification-toggle"
          id="notification-dropdown"
        >
          <Bell size={20} />
          {getUnreadCount() > 0 && (
            <Badge bg="danger" className="notification-badge">
              {getUnreadCount()}
            </Badge>
          )}
        </Dropdown.Toggle>

        <Dropdown.Menu className="notification-dropdown-menu">
          <div className="notification-header">
            <h6 className="mb-0">Notifications</h6>
            {getUnreadCount() > 0 && (
              <Button variant="link" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationAction(notification)}
                >
                  <div className="notification-icon">
                    {(() => {
                      const Icon = notification.icon;
                      return <Icon size={16} className={`text-${notification.color}`} />;
                    })()}
                  </div>
                  <div className="notification-content">
                    <h6 className="notification-title">{notification.title}</h6>
                    <p className="notification-message">{notification.message}</p>
                    <small className="notification-time">
                      <Clock size={12} className="me-1" />
                      {notification.time}
                    </small>
                  </div>
                  {!notification.read && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-notifications">
                <Bell size={32} className="text-muted mb-2" />
                <p className="text-muted mb-0">No notifications</p>
              </div>
            )}
          </div>

          {notifications.length > 5 && (
            <div className="notification-footer">
              <Button variant="link" size="sm">View all notifications</Button>
            </div>
          )}
        </Dropdown.Menu>
      </Dropdown>

      {/* Dashboard Priority Alerts */}
      {getPriorityAlerts().length > 0 && (
        <div className="priority-alerts mb-4">
          {getPriorityAlerts().map(alert => (
            <Alert
              key={alert.id}
              variant={alert.color}
              dismissible
              onClose={() => markAsRead(alert.id)}
              className="priority-alert"
            >
              {(() => {
                const Icon = alert.icon;
                return <Icon size={20} className="me-2" />;
              })()}
              <strong>{alert.title}</strong> - {alert.message}
              {alert.actionable && (
                <Button
                  variant={`outline-${alert.color}`}
                  size="sm"
                  className="ms-2"
                  onClick={() => handleNotificationAction(alert)}
                >
                  Take Action
                </Button>
              )}
            </Alert>
          ))}
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            show={toast.show}
            onClose={() => hideToast(toast.id)}
            className="notification-toast"
          >
            <Toast.Header>
              {(() => {
                const Icon = toast.icon;
                return <Icon size={16} className={`text-${toast.color} me-2`} />;
              })()}
              <strong className="me-auto">{toast.title}</strong>
              <Button
                variant="link"
                size="sm"
                onClick={() => hideToast(toast.id)}
                className="toast-close"
              >
                <X size={14} />
              </Button>
            </Toast.Header>
            <Toast.Body>{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      <style>{`
        .notification-toggle {
          position: relative;
          border: none;
          background: none;
          color: #6b7280;
          padding: 0.5rem;
        }

        .notification-toggle:hover {
          color: #374151;
        }

        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          font-size: 0.6rem;
          padding: 0.2rem 0.4rem;
        }

        .notification-dropdown-menu {
          width: 350px;
          max-height: 400px;
          border: none;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .notification-header {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: between;
          align-items: center;
        }

        .notification-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .notification-item {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: flex-start;
          cursor: pointer;
          transition: background-color 0.2s ease;
          position: relative;
        }

        .notification-item:hover {
          background: #f9fafb;
        }

        .notification-item.unread {
          background: #f0f9ff;
        }

        .notification-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }

        .notification-content {
          flex-grow: 1;
        }

        .notification-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1f2937;
        }

        .notification-message {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
          line-height: 1.4;
        }

        .notification-time {
          font-size: 0.75rem;
          color: #9ca3af;
          display: flex;
          align-items: center;
        }

        .unread-indicator {
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          position: absolute;
          top: 1rem;
          right: 1rem;
        }

        .no-notifications {
          padding: 2rem;
          text-align: center;
        }

        .notification-footer {
          padding: 0.75rem;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .priority-alerts {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1050;
          max-width: 400px;
        }

        .priority-alert {
          display: flex;
          align-items: center;
          border: none;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          margin-bottom: 0.5rem;
        }

        .toast-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1060;
        }

        .notification-toast {
          border: none;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          margin-bottom: 0.5rem;
        }

        .toast-close {
          border: none;
          background: none;
          color: #6b7280;
          padding: 0;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .notification-dropdown-menu {
            width: 300px;
          }

          .priority-alerts {
            left: 1rem;
            right: 1rem;
            max-width: none;
          }
        }
      `}</style>
    </>
  );
}

// Helper functions for showing notifications
export const showSuccess = (message, title = 'Success') => {
  window.dispatchEvent(new CustomEvent('showNotification', {
    detail: { type: 'success', title, message, color: 'success', icon: CheckCircle }
  }));
};

export const showError = (message, title = 'Error') => {
  window.dispatchEvent(new CustomEvent('showNotification', {
    detail: { type: 'error', title, message, color: 'danger', icon: AlertCircle }
  }));
};

export const showInfo = (message, title = 'Information') => {
  window.dispatchEvent(new CustomEvent('showNotification', {
    detail: { type: 'info', title, message, color: 'info', icon: Info }
  }));
};

export const showWarning = (message, title = 'Warning') => {
  window.dispatchEvent(new CustomEvent('showNotification', {
    detail: { type: 'warning', title, message, color: 'warning', icon: AlertCircle }
  }));
};

export default NotificationSystem;




