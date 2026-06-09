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
import { Toast, ToastContainer } from 'react-bootstrap';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

/**
 * Professional Notification Manager
 * Provides glassmorphic toast notifications with self-flushing buffer and animations
 */
let notificationId = 0;
let notificationManagerInstance = null;
let pendingQueue = []; // Buffers any notifications called before components mount

const NotificationManager = ({ onRef }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (onRef) {
      onRef({
        addNotification,
        removeNotification,
        clearAll,
      });
    }
    notificationManagerInstance = {
      addNotification,
      removeNotification,
      clearAll,
    };

    // Flush any pending notifications that were triggered during early loading or route swaps
    if (pendingQueue.length > 0) {
      pendingQueue.forEach((notif) => {
        addNotification(notif.message, notif.type, notif.duration);
      });
      pendingQueue = [];
    }

    return () => {
      notificationManagerInstance = null;
    };
  }, [onRef]);

  /**
   * Add a new notification
   */
  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = ++notificationId;
    // Safely handle Error objects and other non-string messages
    let safeMessage = message;
    if (message instanceof Error) {
      safeMessage = message.message || 'An error occurred';
    } else if (typeof message !== 'string') {
      safeMessage = String(message) || 'A notification message';
    }
    
    const notification = {
      id,
      message: safeMessage,
      type,
      timestamp: new Date(),
      duration,
    };

    setNotifications((prev) => [...prev, notification]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  /**
   * Remove notification by ID
   */
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  /**
   * Clear all notifications
   */
  const clearAll = () => {
    setNotifications([]);
  };

  /**
   * Get icon for notification type
   */
  const getIcon = (type) => {
    const icons = {
      success: CheckCircle,
      error: XCircle,
      warning: AlertTriangle,
      info: Info,
    };
    const IconComponent = icons[type] || Info;
    return <IconComponent size={20} />;
  };

  return (
    <ToastContainer position="top-end" className="notification-container">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          show={true}
          onClose={() => removeNotification(notification.id)}
          className={`notification-toast notification-${notification.type}`}
          autohide={notification.duration > 0}
          delay={notification.duration}
        >
          <Toast.Header className="notification-header" closeButton={true}>
            <div className="notification-icon me-2">
              {getIcon(notification.type)}
            </div>
            <strong className="me-auto notification-title">
              {notification.type === 'error' ? 'Error' : notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
            </strong>
            <small className="notification-time">
              {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </small>
          </Toast.Header>
          <Toast.Body className="notification-body">
            {notification.message}
          </Toast.Body>
        </Toast>
      ))}

      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(120%) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        .notification-container {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 10000 !important;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-toast {
          margin-bottom: 0px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-left: 6px solid;
          animation: toastSlideIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
          transition: all 0.3s ease;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.9) !important;
        }

        /* High-Fidelity Color Theme Blocks */
        .notification-success {
          border-left-color: #10b981 !important; /* Emerald */
          background: rgba(255, 255, 255, 0.93) !important;
        }
        .notification-success .notification-icon {
          color: #10b981;
        }
        .notification-success .notification-title {
          color: #065f46;
        }

        .notification-error {
          border-left-color: #f43f5e !important; /* Rose */
          background: rgba(255, 255, 255, 0.93) !important;
        }
        .notification-error .notification-icon {
          color: #f43f5e;
        }
        .notification-error .notification-title {
          color: #9f1239;
        }

        .notification-warning {
          border-left-color: #f59e0b !important; /* Amber */
          background: rgba(255, 255, 255, 0.93) !important;
        }
        .notification-warning .notification-icon {
          color: #f59e0b;
        }
        .notification-warning .notification-title {
          color: #92400e;
        }

        .notification-info {
          border-left-color: #3b82f6 !important; /* Blue */
          background: rgba(255, 255, 255, 0.93) !important;
        }
        .notification-info .notification-icon {
          color: #3b82f6;
        }
        .notification-info .notification-title {
          color: #1e3a8a;
        }

        .notification-header {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
          padding: 14px 18px 8px;
          background: transparent !important;
          display: flex;
          align-items: center;
        }

        .notification-body {
          padding: 8px 18px 14px;
          font-size: 14px;
          color: #374151;
          font-weight: 500;
          line-height: 1.5;
        }

        .notification-icon {
          display: flex;
          align-items: center;
        }

        .notification-title {
          font-weight: 700;
          font-size: 14px;
        }

        .notification-time {
          color: #9ca3af;
          font-size: 12px;
          font-weight: 500;
        }

        .btn-close {
          font-size: 10px;
          opacity: 0.5;
          transition: opacity 0.2s ease;
        }
        .btn-close:hover {
          opacity: 0.8;
        }

        @media (max-width: 576px) {
          .notification-container {
            top: 16px;
            right: 16px;
            left: 16px;
            max-width: none;
          }
          .notification-toast {
            border-radius: 12px;
          }
        }
      `}</style>
    </ToastContainer>
  );
};

// Global notification functions

export const showNotification = (message, type = 'info', duration = 5000) => {
  if (notificationManagerInstance) {
    return notificationManagerInstance.addNotification(message, type, duration);
  } else {
    // Buffer early calls into the queue so they aren't lost
    pendingQueue.push({ message, type, duration });
    return null;
  }
};

export const showSuccess = (message, duration = 4000) => {
  return showNotification(message, 'success', duration);
};

export const showError = (message, duration = 6000) => {
  return showNotification(message, 'error', duration);
};

export const showWarning = (message, duration = 5000) => {
  return showNotification(message, 'warning', duration);
};

export const showInfo = (message, duration = 4000) => {
  return showNotification(message, 'info', duration);
};

export const showValidationError = (errors, duration = 6000) => {
  const errorMessage = Array.isArray(errors)
    ? errors.join(', ')
    : typeof errors === 'object'
    ? Object.values(errors).flat().join(', ')
    : errors.toString();

  return showNotification(
    `Validation Error: ${errorMessage}`,
    'error',
    duration
  );
};

export const showWorkflowUpdate = (message, duration = 4000) => {
  return showNotification(`Workflow Update: ${message}`, 'info', duration);
};

export default NotificationManager;
