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

import { useState, useEffect, useRef } from 'react';
import { Badge, Spinner } from 'react-bootstrap';
import { Bell, Check, CheckCheck, Trash2, X, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { notificationAPI } from '../../services/notificationAPI.js';
import { formatDisplayDate } from '../../utils/formatters.js';
import { useSocket } from '../../hooks/useSocket';
import './NotificationDropdown.css';

function NotificationDropdown({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef(null);

  const { socket } = useSocket();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000); // Remove animation class after 1s
    };

    const handleNotificationRead = ({ id }) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('notification_read', handleNotificationRead);
    socket.on('all_notifications_read', handleAllRead);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('notification_read', handleNotificationRead);
      socket.off('all_notifications_read', handleAllRead);
    };
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationAPI.getNotifications({ limit: 10 });
      if (response.success) {
        setNotifications(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await notificationAPI.deleteNotification(notificationId);
      const wasUnread = notifications.find(n => n.id === notificationId && !n.is_read);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id, { stopPropagation: () => {} });
    }
    
    const redirectUrl = notification.redirect_url || notification.action_url;
    
    if (redirectUrl) {
      const url = redirectUrl.replace(/^\//, '');
      const parts = url.split('/');
      
      // Handle routes with IDs: e.g. "invoice-management/123"
      if (parts.length >= 2) {
        const baseView = parts[0];
        const id = parts[1];
        
        // Map common notification routes to App.jsx views
        if (baseView === 'invoice-management') {
          onNavigate('export-invoice-form', { invoiceId: id });
        } else if (baseView === 'order-dashboard') {
          // If we had a specific order view, we'd use it here
          onNavigate('order-dashboard'); 
        } else if (baseView === 'qc-management') {
          onNavigate('qc-management', { qcId: id });
        } else {
          onNavigate(url);
        }
      } else {
        onNavigate(url);
      }
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="notification-icon success" />;
      case 'warning':
        return <AlertTriangle size={16} className="notification-icon warning" />;
      case 'error':
        return <X size={16} className="notification-icon error" />;
      case 'order':
        return <Clock size={16} className="notification-icon order" />;
      default:
        return <Info size={16} className="notification-icon info" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDisplayDate(dateString);
  };

  return (
    <div className="notification-dropdown-container" ref={dropdownRef}>
      <button
        className={`notification-bell-btn ${isAnimating ? 'ring-animation' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-count-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-menu">
          <div className="notification-dropdown-header">
            <h6 className="notification-dropdown-title">Notifications</h6>
            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="notification-dropdown-list">
            {loading ? (
              <div className="notification-loading">
                <Spinner animation="border" size="sm" />
                <span>Loading...</span>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-item-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-title">{notification.title}</div>
                    <div className="notification-item-message">{notification.message}</div>
                    <div className="notification-item-time">{formatTime(notification.created_at)}</div>
                  </div>
                  <div className="notification-item-actions">
                    {!notification.is_read && (
                      <button
                        className="notification-action-btn"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      className="notification-action-btn delete"
                      onClick={(e) => handleDelete(notification.id, e)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="notification-empty">
                <Bell size={32} className="empty-icon" />
                <p>No notifications</p>
              </div>
            )}
          </div>

          <div className="notification-dropdown-footer">
            <button
              className="view-all-btn"
              onClick={() => {
                onNavigate('notifications');
                setIsOpen(false);
              }}
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;




