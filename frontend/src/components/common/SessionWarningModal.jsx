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
import { Modal, Button, Alert } from 'react-bootstrap';
import { Clock, AlertTriangle } from 'lucide-react';
import './SessionWarningModal.css';

function SessionWarningModal({ 
  show, 
  timeRemaining, 
  onStayLoggedIn, 
  onLogout 
}) {
  const [displayTime, setDisplayTime] = useState('5:00');

  // Format time remaining
  useEffect(() => {
    if (!show) return;

    const formatTime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const startTime = Date.now();
    setDisplayTime(formatTime(timeRemaining));

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, timeRemaining - elapsed);
      setDisplayTime(formatTime(remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [show, timeRemaining]);

  return (
    <Modal 
      show={show} 
      backdrop="static" 
      keyboard={false}
      centered
      className="session-warning-modal"
    >
      <Modal.Header className="warning-header">
        <div className="header-content">
          <AlertTriangle size={24} className="warning-icon" />
          <Modal.Title>Session Expiring Soon</Modal.Title>
        </div>
      </Modal.Header>

      <Modal.Body className="warning-body">
        <Alert variant="warning" className="mb-4">
          <div className="d-flex align-items-center gap-2">
            <Clock size={20} />
            <span>
              Your session will expire due to inactivity in <strong>{displayTime}</strong>
            </span>
          </div>
        </Alert>

        <p className="mb-3">
          To protect your data, we automatically log out inactive users after 30 minutes of inactivity.
        </p>

        <p className="text-muted small">
          Your current work can be saved if you stay logged in. Choose an option below:
        </p>
      </Modal.Body>

      <Modal.Footer className="warning-footer">
        <Button 
          variant="outline" 
          onClick={onLogout}
          size="sm"
        >
          Log Out Now
        </Button>
        <Button 
          variant="primary" 
          onClick={onStayLoggedIn}
          size="sm"
        >
          Stay Logged In
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SessionWarningModal;




