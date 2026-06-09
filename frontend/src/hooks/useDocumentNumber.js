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

import { useState, useCallback } from 'react';
import api from '../services/api';
import { tokenManager } from '../utils/tokenManager';

export const useDocumentNumber = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getNextInvoiceNumber = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // If user is super_admin and no company is assigned to the token, try to
      // resolve a single company automatically and pass it to the backend.
      const user = tokenManager.getUser();
      const params = {};
      if (user?.role === 'super_admin' && !user?.companyId) {
        try {
          const companiesResp = await api.get('/companies', { params: { page: 1, limit: 2 } });
          const companies = companiesResp.data?.data?.data || companiesResp.data?.data || [];
          if (Array.isArray(companies) && companies.length === 1) {
            params.company_id = companies[0].id;
          }
        } catch (e) {
          // ignore - fallback will be used
        }
      } else if (user?.companyId) {
        params.company_id = user.companyId;
      }

      const response = await api.get('/proforma-invoices/next-number', { params });
      return response.data?.data?.invoiceNo || 'PI/12/25/001';
    } catch (err) {
      setError(err.message);
      console.error('Error fetching next invoice number:', err);
      return 'PI/12/25/001'; // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const getNextOrderNumber = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build company context similar to invoice path
      const user = tokenManager.getUser();
      const params = {};
      if (user?.role === 'super_admin' && !user?.companyId) {
        try {
          const companiesResp = await api.get('/companies', { params: { page: 1, limit: 2 } });
          const companies = companiesResp.data?.data?.data || companiesResp.data?.data || [];
          if (Array.isArray(companies) && companies.length === 1) {
            params.company_id = companies[0].id;
          }
        } catch (e) {
          // ignore - fallback will be used
        }
      } else if (user?.companyId) {
        params.company_id = user.companyId;
      }

      const response = await api.get('/proforma-orders/next-number', { params });
      return response.data?.data?.orderNo || 'PO/12/25/001';
    } catch (err) {
      setError(err.message);
      console.error('Error fetching next order number:', err);
      return 'PO/12/25/001'; // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const getNextQCNumber = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = tokenManager.getUser();
      const params = {};
      if (user?.role === 'super_admin' && !user?.companyId) {
        try {
          const companiesResp = await api.get('/companies', { params: { page: 1, limit: 2 } });
          const companies = companiesResp.data?.data?.data || companiesResp.data?.data || [];
          if (Array.isArray(companies) && companies.length === 1) {
            params.company_id = companies[0].id;
          }
        } catch (e) {}
      } else if (user?.companyId) {
        params.company_id = user.companyId;
      }

      const response = await api.get('/qc-records/next-number', { params });
      return response.data?.data?.qcId || 'QC/001';
    } catch (err) {
      setError(err.message);
      console.error('Error fetching next QC number:', err);
      return 'QC/001';
    } finally {
      setLoading(false);
    }
  }, []);

  const getNextExportInvoiceNumber = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = tokenManager.getUser();
      const params = {};
      if (user?.role === 'super_admin' && !user?.companyId) {
        try {
          const companiesResp = await api.get('/companies', { params: { page: 1, limit: 2 } });
          const companies = companiesResp.data?.data?.data || companiesResp.data?.data || [];
          if (Array.isArray(companies) && companies.length === 1) {
            params.company_id = companies[0].id;
          }
        } catch (e) {}
      } else if (user?.companyId) {
        params.company_id = user.companyId;
      }

      const response = await api.get('/export-invoices/next-number/generate', { params });
      return response.data?.data?.invoiceNo || 'EXP/01/26/0001';
    } catch (err) {
      setError(err.message);
      console.error('Error fetching next export invoice number:', err);
      return 'EXP/01/26/0001';
    } finally {
      setLoading(false);
    }
  }, []);

  return { getNextInvoiceNumber, getNextOrderNumber, getNextQCNumber, getNextExportInvoiceNumber, loading, error };
};
