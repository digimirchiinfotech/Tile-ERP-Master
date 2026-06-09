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
import signatureService from '../services/signatureService';
import { resolveImageUrl } from '../utils/urlHelper';

/**
 * useSignature — Smart signature resolver for document print views
 *
 * Priority logic:
 *   1. If document has a signature_snapshot (locked document) → use frozen URL
 *   2. Otherwise → fetch current active signature from API
 *
 * This ensures:
 *   ✅ Locked documents always show their original frozen signature
 *   ✅ New / unlocked documents always show the latest active signature
 *
 * @param {object|null} snapshotData - The document's signature_snapshot JSONB field
 *   Shape: { signature_url, signatory_name, signature_type, captured_at }
 */
const useSignature = (snapshotData = null) => {
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [signatoryName, setSignatoryName] = useState('AUTHORIZED SIGNATORY');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      setLoading(true);
      try {
        // ── Priority 1: Use frozen snapshot (locked document) ────────────────
        if (snapshotData?.signature_url) {
          if (!cancelled) {
            setSignatureUrl(resolveImageUrl(snapshotData.signature_url));
            setSignatoryName(snapshotData.signatory_name || 'AUTHORIZED SIGNATORY');
          }
          return;
        }

        // ── Priority 2: Fetch live active signature from API ─────────────────
        const response = await signatureService.getActive();
        if (!cancelled && response.data?.success && response.data?.data) {
          const sig = response.data.data;
          // API normalizer converts snake_case → camelCase; support both
          const sigPath = sig.signaturePath || sig.signature_path;
          const sigName = sig.signatoryName || sig.signatory_name || 'AUTHORIZED SIGNATORY';
          setSignatureUrl(resolveImageUrl(sigPath));
          setSignatoryName(sigName);
        }
      } catch {
        // Signature is optional — document rendering must not break
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    resolve();

    return () => { cancelled = true; };
  }, [snapshotData]);

  return { signatureUrl, signatoryName, loading };
};

export default useSignature;
