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

import React from 'react';
import { Lock } from 'lucide-react';
import { formatDisplayDate } from '../../utils/formatters.js';

export default function DocumentLockHeader({ isLocked, documentType, documentNo, lockedBy, lockedAt }) {
  if (!isLocked) return null;

  return (
    <div className="bg-danger text-white px-4 py-2 rounded-3 shadow-sm d-flex align-items-center gap-3 mb-3">
      <div className="fw-bold fs-5 d-flex align-items-center gap-2">
        <Lock size={20} /> LOCKED
      </div>
      <div className="border-start border-white border-opacity-25 ps-3 py-1 small">
        <div><strong>{documentType || 'Document'}:</strong> {documentNo || 'N/A'}</div>
        <div><strong>Locked By:</strong> {lockedBy || 'Admin'}</div>
        <div><strong>Locked On:</strong> {lockedAt ? formatDisplayDate(lockedAt) : 'N/A'}</div>
      </div>
    </div>
  );
}
