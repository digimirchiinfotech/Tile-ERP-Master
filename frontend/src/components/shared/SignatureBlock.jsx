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

/**
 * SignatureBlock — Reusable print-ready digital signature component
 *
 * Placed at the bottom-right corner of every export document print view.
 * Renders the signature image (if present) followed by the signatory name
 * and the "Authorized Signatory" label.
 *
 * Usage in print views:
 *   import SignatureBlock from '../shared/SignatureBlock';
 *   <SignatureBlock signatureUrl={signatureUrl} signatoryName={signatoryName} companyName={exporter.name} />
 *
 * @param {string|null} signatureUrl     - Resolved URL of the signature image
 * @param {string}      signatoryName    - e.g. "DIRECTOR" or "AUTHORIZED SIGNATORY"
 * @param {string}      companyName      - Company name printed above signatory label
 * @param {object}      style            - Optional additional style overrides
 */
const SignatureBlock = ({
  signatureUrl = null,
  signatoryName = 'AUTHORIZED SIGNATORY',
  companyName = '',
  style = {}
}) => {
  return (
    <div
      style={{
        textAlign: 'right',
        minWidth: '150px',
        ...style
      }}
    >
      {/* For company name line */}
      {companyName && (
        <div style={{ fontSize: '7pt', fontWeight: '600', marginBottom: '2mm' }}>
          FOR, {companyName}
        </div>
      )}

      {/* Signature image or empty space for manual signing */}
      <div
        style={{
          minHeight: '15mm',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          marginBottom: '1mm'
        }}
      >
        {signatureUrl ? (
          <img
            src={signatureUrl}
            alt="Authorized Signature"
            style={{
              maxHeight: '14mm',
              maxWidth: '55mm',
              objectFit: 'contain',
              display: 'block'
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          // Empty space when no signature — allows manual signing on printed copy
          <div style={{ height: '14mm', width: '55mm' }} />
        )}
      </div>

      {/* Divider line */}
      <div style={{ borderTop: '1px solid #000', paddingTop: '1mm' }}>
        <div style={{ fontSize: '7pt', fontWeight: '700', textTransform: 'uppercase' }}>
          {signatoryName}
        </div>
        <div style={{ fontSize: '6.5pt', color: '#444', marginTop: '0.5mm' }}>
          (AUTHORIZED SIGNATORY)
        </div>
      </div>
    </div>
  );
};

export default SignatureBlock;
