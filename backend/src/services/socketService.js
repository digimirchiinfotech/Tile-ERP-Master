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

import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { debugLogger } from '../utils/debugLogger.js';

let io;

export const initSocket = (serverIo) => {
  io = serverIo;

  // Middleware to authenticate socket connection
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token.replace('Bearer ', ''), env.jwt.secret);
      socket.user = decoded; // Contains id, company_id, role, etc.
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const companyId = socket.user.companyId || socket.user.company_id;
    const role = socket.user.role;

    debugLogger.info('Socket', `User connected: ${userId} (Company: ${companyId})`);

    // Join user-specific room
    socket.join(`user_${userId}`);

    // Join company-specific room
    if (companyId) {
      socket.join(`company_${companyId}`);
      // Join role-specific room within the company
      socket.join(`company_${companyId}_role_${role}`);
    }

    socket.on('disconnect', () => {
      debugLogger.info('Socket', `User disconnected: ${userId}`);
    });
    
    // Allow frontend to manually mark notifications as read (optional, REST API can also do this)
    socket.on('mark_read', async (notificationId) => {
       // Typically handled by REST API, but good to have here if needed
       debugLogger.info('Socket', `Notification ${notificationId} marked as read via socket`);
    });
  });

  debugLogger.info('Socket', 'Socket.IO initialized successfully');
};

/**
 * Emit notification to a specific user
 */
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  } else {
    debugLogger.warn('Socket', 'Socket.io not initialized, cannot emit to user');
  }
};

/**
 * Emit notification to all users in a company
 */
export const emitToCompany = (companyId, event, data) => {
  if (io) {
    io.to(`company_${companyId}`).emit(event, data);
  }
};

/**
 * Emit notification to specific roles in a company
 */
export const emitToCompanyRoles = (companyId, roles, event, data) => {
  if (io && Array.isArray(roles)) {
    roles.forEach(role => {
      io.to(`company_${companyId}_role_${role}`).emit(event, data);
    });
  }
};

export const getIo = () => io;

export default {
  initSocket,
  emitToUser,
  emitToCompany,
  emitToCompanyRoles,
  getIo
};
