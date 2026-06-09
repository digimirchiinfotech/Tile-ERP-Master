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
import supportTicketService from '../services/supportTicketService';
import RequestManager from '../utils/RequestManager';
import { tokenManager } from '../utils/tokenManager';
import { useAuthState } from './useAuthState';

export const useSupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    high: 0,
    critical: 0
  });
  const isAuthenticated = useAuthState();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await RequestManager.execute(() => supportTicketService.getAll(), '/support-tickets', 3);
      // supportTicketService.getAll() already returns the array or unwrap it
      const data = Array.isArray(response) ? response : (response?.data?.data || response?.data || []);
      setTickets(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching support tickets:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch support tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketById = async (id) => {
    try {
      const data = await supportTicketService.getById(id);
      return data;
    } catch (err) {
      console.error('Error fetching ticket by id:', err);
      throw err;
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await supportTicketService.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching ticket stats:', err);
    }
  };

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (token && isAuthenticated) {
      fetchTickets();
      fetchStats();
    }
  }, [isAuthenticated]);

  const createTicket = async (ticketData) => {
    try {
      const response = await supportTicketService.create(ticketData);
      await fetchTickets();
      await fetchStats();
      return response.data || response;
    } catch (err) {
      console.error('Error creating ticket:', err);
      throw err;
    }
  };

  const updateTicket = async (id, ticketData) => {
    try {
      const response = await supportTicketService.update(id, ticketData);
      await fetchTickets();
      await fetchStats();
      return response.data || response;
    } catch (err) {
      console.error('Error updating ticket:', err);
      throw err;
    }
  };

  const updateTicketStatus = async (id, status, comment = null) => {
    try {
      const response = await supportTicketService.updateStatus(id, status, comment);
      await fetchTickets();
      await fetchStats();
      return response.data || response;
    } catch (err) {
      console.error('Error updating ticket status:', err);
      throw err;
    }
  };

  const addComment = async (id, comment, userName = 'User') => {
    try {
      const response = await supportTicketService.addComment(id, comment, userName);
      await fetchTickets();
      return response.data || response;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  const deleteTicket = async (id) => {
    try {
      await supportTicketService.delete(id);
      await fetchTickets();
      await fetchStats();
    } catch (err) {
      console.error('Error deleting ticket:', err);
      throw err;
    }
  };

  const hardDeleteTicket = async (id) => {
    try {
      await supportTicketService.hardDelete(id);
      await fetchTickets();
      await fetchStats();
    } catch (err) {
      console.error('Error hard deleting ticket:', err);
      throw err;
    }
  };

  const toggleTicketStatus = async (id) => {
    try {
      await supportTicketService.toggleStatus(id);
      await fetchTickets();
      await fetchStats();
    } catch (err) {
      console.error('Error toggling ticket status:', err);
      throw err;
    }
  };

  return { 
    tickets, 
    loading, 
    error, 
    stats,
    fetchTickets, 
    fetchTicketById,
    createTicket, 
    updateTicket, 
    updateTicketStatus,
    addComment,
    deleteTicket,
    hardDeleteTicket,
    toggleTicketStatus
  };
};
