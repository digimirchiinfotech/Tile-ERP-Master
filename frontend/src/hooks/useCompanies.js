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
import { companyService } from '../services/companyService';
import RequestManager from '../utils/RequestManager';
import { tokenManager } from '../utils/tokenManager';
import { useAuthState } from './useAuthState';
import { normalizeCompanyDataArray, normalizeCompanyData } from '../utils/dataTransformers';

export const useCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isAuthenticated = useAuthState();

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await RequestManager.execute(() => companyService.getAll(), '/companies', 3);
      const responseData = response?.data?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      const normalizedData = normalizeCompanyDataArray(Array.isArray(data) ? data : []);
      setCompanies(normalizedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (token && isAuthenticated) {
      fetchCompanies();
    }
  }, [isAuthenticated]);

  const createCompany = async (companyData, isNewRegistration = false) => {
    try {
      const response = await companyService.create(companyData, isNewRegistration);
      await fetchCompanies();
      return { ...response.data, data: normalizeCompanyData(response.data?.data) };
    } catch (err) {
      console.error('Error creating company:', err);
      throw err;
    }
  };

  const updateCompany = async (id, companyData) => {
    try {
      const response = await companyService.update(id, companyData);
      
      await fetchCompanies();
      return { ...response.data, data: normalizeCompanyData(response.data?.data) };
    } catch (err) {
      console.error('Error updating company:', err);
      throw err;
    }
  };

  const deleteCompany = async (id) => {
    try {
      await companyService.delete(id);
      await fetchCompanies();
    } catch (err) {
      console.error('Error deleting company:', err);
      throw err;
    }
  };

  const hardDeleteCompany = async (id) => {
    try {
      await companyService.hardDelete(id);
      await fetchCompanies();
    } catch (err) {
      console.error('Error hard deleting company:', err);
      throw err;
    }
  };

  const toggleCompanyStatus = async (id) => {
    try {
      await companyService.toggleStatus(id);
      await fetchCompanies();
    } catch (err) {
      console.error('Error toggling company status:', err);
      throw err;
    }
  };

  const getCompanyById = async (id) => {
    try {
      const response = await RequestManager.execute(() => companyService.getById(id), `/companies/${id}`, 3);
      const company = response?.data?.data;
      return normalizeCompanyData(company);
    } catch (err) {
      console.error('Error fetching company details:', err);
      throw err;
    }
  };

  return { companies, loading, error, fetchCompanies, createCompany, updateCompany, deleteCompany, hardDeleteCompany, toggleCompanyStatus, getCompanyById };
};
