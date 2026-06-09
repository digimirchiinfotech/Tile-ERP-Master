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
import Button from '../shared/Button.jsx';
import { ArrowLeft } from 'lucide-react';

const BackButton = ({ onBack, label = 'Back' }) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onBack}
      className="d-flex align-items-center gap-2"
      aria-label={`Go back to ${label}`}
    >
      <ArrowLeft size={16} />
      {label}
    </Button>
  );
};

export default BackButton;




