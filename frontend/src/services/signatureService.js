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

import api from './api';

/**
 * signatureService.js
 *
 * API wrapper for Digital Signature endpoints.
 * Used by: DigitalSignature.jsx (management), useSignature.js (display)
 */
export const signatureService = {
  /** Fetch the currently active signature for this company */
  getActive: () => api.get('/signatures/active'),

  /** Fetch all signature records (admin use) */
  getAll: () => api.get('/signatures'),

  /**
   * Upload an image file as the company signature
   * @param {FormData} formData - Must contain 'signature' file + optional 'signatory_name'
   */
  upload: (formData) =>
    api.post('/signatures/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  /**
   * Save a canvas-drawn signature
   * @param {string} base64Data  - data:image/png;base64,... string from canvas
   * @param {string} signatoryName - e.g. "AUTHORIZED SIGNATORY" / "DIRECTOR"
   */
  draw: (base64Data, signatoryName) =>
    api.post('/signatures/draw', {
      signature_data: base64Data,
      signatory_name: signatoryName
    }),

  /**
   * Soft-delete (deactivate) a specific signature record
   * @param {string} id - UUID of the signature record
   */
  delete: (id) => api.delete(`/signatures/${id}`),

  /**
   * Activate a specific previous signature record
   * @param {string} id - UUID of the signature record
   */
  activate: (id) => api.patch(`/signatures/${id}/activate`),
};

export default signatureService;
