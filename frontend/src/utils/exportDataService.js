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

import api from '../services/api';
import {
  transformShippingInstructionToFrontend,
  transformCustomsClearanceToFrontend,
  transformCertificateToFrontend,
  transformArray
} from './dataTransformers';

export const shippingInstructionsService = {
  getAll: () => api.get('/export-shipping-instructions')
    .then(r => transformArray(r.data?.data || [], transformShippingInstructionToFrontend)),
  getById: (id) => api.get(`/export-shipping-instructions/${id}`)
    .then(r => transformShippingInstructionToFrontend(r.data?.data)),
  create: (data) => api.post('/export-shipping-instructions', data)
    .then(r => transformShippingInstructionToFrontend(r.data?.data)),
  update: (id, data) => api.put(`/export-shipping-instructions/${id}`, data)
    .then(r => transformShippingInstructionToFrontend(r.data?.data)),
  delete: (id) => api.delete(`/export-shipping-instructions/${id}`).then(r => r.data)
};

export const customsClearancesService = {
  getAll: () => api.get('/export-customs-clearances')
    .then(r => transformArray(r.data?.data || [], transformCustomsClearanceToFrontend)),
  getById: (id) => api.get(`/export-customs-clearances/${id}`)
    .then(r => transformCustomsClearanceToFrontend(r.data?.data)),
  create: (data) => api.post('/export-customs-clearances', data)
    .then(r => transformCustomsClearanceToFrontend(r.data?.data)),
  update: (id, data) => api.put(`/export-customs-clearances/${id}`, data)
    .then(r => transformCustomsClearanceToFrontend(r.data?.data)),
  delete: (id) => api.delete(`/export-customs-clearances/${id}`).then(r => r.data)
};


export const certificatesService = {
  getAll: () => api.get('/export-certificates')
    .then(r => transformArray(r.data?.data || [], transformCertificateToFrontend)),
  getById: (id) => api.get(`/export-certificates/${id}`)
    .then(r => transformCertificateToFrontend(r.data?.data)),
  create: (data) => api.post('/export-certificates', data)
    .then(r => transformCertificateToFrontend(r.data?.data)),
  update: (id, data) => api.put(`/export-certificates/${id}`, data)
    .then(r => transformCertificateToFrontend(r.data?.data)),
  delete: (id) => api.delete(`/export-certificates/${id}`).then(r => r.data)
};

export const getExportStatistics = async () => {
  try {
    const results = await Promise.allSettled([
      api.get('/export-invoices'),
      api.get('/vgm'),
      api.get('/export-certificates'),
      api.get('/export-shipping-instructions')
    ]);

    const invoices = results[0].status === 'fulfilled' ? (results[0].value.data.data || results[0].value.data || []) : [];
    const vgms = results[1].status === 'fulfilled' ? (results[1].value.data.data || results[1].value.data || []) : [];
    const certs = results[2].status === 'fulfilled' ? (results[2].value.data.data || results[2].value.data || []) : [];
    
    // Normalize data (handle array in data or direct data array)
    const invoiceList = Array.isArray(invoices) ? invoices : (invoices.data || []);
    const vgmList = Array.isArray(vgms) ? vgms : (vgms.data || []);
    const finalizedInvoices = invoiceList.filter(i => i.status === 'Finalized' || i.status === 'Shipped');

    return {
      totalShipments: invoiceList.length,
      clearedShipments: finalizedInvoices.length,
      certificates: certs.length || vgmList.length, // Include VGM as a "certificate" or just count actual certs
      clearanceRate: invoiceList.length === 0 ? 0 : Math.round((finalizedInvoices.length / invoiceList.length) * 100)
    };
  } catch (error) {
    console.error('Error fetching export stats:', error);
    return {
      totalShipments: 0,
      clearedShipments: 0,
      certificates: 0,
      clearanceRate: 0
    };
  }
};
