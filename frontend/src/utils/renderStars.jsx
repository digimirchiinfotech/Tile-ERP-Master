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
import { Star } from 'lucide-react';

// Render star icons safely for a numeric rating.
// rating: number-like value (will be coerced)
// options: { max: 5, size: 12, showNumber: true }
export default function renderStars(rating, options = {}) {
  const { max = 5, size = 12, showNumber = true } = options;
  let r = Number(rating);
  if (!Number.isFinite(r) || isNaN(r)) r = 0;
  r = Math.max(0, Math.min(max, r));

  const fullStars = Math.floor(r);
  const hasHalfStar = r - fullStars >= 0.5;
  const emptyStars = Math.max(0, max - fullStars - (hasHalfStar ? 1 : 0));

  return (
    <div className="d-inline-flex align-items-center">
      {fullStars > 0 &&
        [...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} size={size} fill="#ffc107" stroke="#ffc107" />
        ))}
      {hasHalfStar && (
        <Star size={size} fill="#ffc107" stroke="#ffc107" opacity={0.5} />
      )}
      {emptyStars > 0 &&
        [...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} size={size} stroke="#ddd" />
        ))}
      {showNumber && <span className="ms-2 text-muted">({r.toFixed(1)})</span>}
    </div>
  );
}




