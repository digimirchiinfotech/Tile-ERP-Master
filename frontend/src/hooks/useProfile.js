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
import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = tokenManager.getAccessToken();
      
      if (!token) {
        setProfile(null);
        setError('Not authenticated');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success && response.data?.data) {
        const userData = response.data.data;
        
        // Ensure all fields are populated
        const completeProfile = {
          id: userData.id,
          name: userData.name || '',
          email_id: userData.email_id || userData.emailId || '',
          email: userData.email_id || userData.emailId || '',
          contact_number: userData.contact_number || userData.contactNumber || '',
          phone: userData.contact_number || userData.contactNumber || '',
          address: userData.address || (userData.settings && (userData.settings.address || userData.settings.address) ) || '',
          bio: userData.bio || (userData.settings && (userData.settings.bio || userData.settings.bio)) || '',
          role: userData.role || 'Unknown',
          department: userData.department || '',
          designation: userData.designation || '',
          company_id: userData.company_id || userData.companyId,
          company_name: userData.company_name || userData.companyName || '',
          status: userData.status || 'Active',
          avatar_url: userData.avatar_url || userData.avatarUrl || '',
          last_login: userData.last_login || userData.lastLogin,
          created_at: userData.created_at || userData.createdAt
        };

        setProfile(completeProfile);
        setError(null);
      } else {
        setError(response.data?.message || 'Failed to fetch profile');
        setProfile(null);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenManager.isAuthenticated()) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, []);

  // Listen for auth events
  useEffect(() => {
    const handleAuthChange = () => {
      if (tokenManager.isAuthenticated()) {
        fetchProfile();
      } else {
        setProfile(null);
      }
    };

    window.addEventListener('auth:logout', handleAuthChange);
    window.addEventListener('auth:login', handleAuthChange);

    return () => {
      window.removeEventListener('auth:logout', handleAuthChange);
      window.removeEventListener('auth:login', handleAuthChange);
    };
  }, []);

  return { profile, loading, error, refetch: fetchProfile };
};
