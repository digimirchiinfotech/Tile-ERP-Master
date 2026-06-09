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

/**
 * Component: ExportDocumentReferenceSelector
 * Searchable, single-select reference dropdown for export documents
 * Features:
 * - Real-time search filtering
 * - Auto-fetch inherited data on selection
 * - Reference validation
 * - Read-only after save (optional)
 */

import { useState, useEffect } from 'react';
import { Form, Spinner, Alert } from 'react-bootstrap';
import { Search, AlertCircle } from 'lucide-react';
import useExportDocumentReferences from '../../hooks/useExportDocumentReferences';

function ExportDocumentReferenceSelector({
  referenceType, // 'export_invoice' | 'packing_list' | 'annexure' | 'backside' | 'vgm'
  onReferenceSelect, // callback(reference, inheritedData)
  onError, // callback(error)
  parentId, // optional: ID from parent document to filter references
  isReadOnly = false,
  selectedValue = null,
  required = true,
  label = 'Select Reference',
  currentId = null
}) {
  const {
    loading,
    error,
    references,
    inheritedData,
    fetchExportInvoiceReferences,
    fetchPackingListReferences,
    fetchAnnexureReferences,
    fetchBacksideReferences,
    fetchVGMReferences,
    getPackingListInheritedData,
    getAnnexureInheritedData,
    getBacksideInheritedData,
    getVGMInheritedData,
    getShippingInheritedData,
    validateReference,
    clearError
  } = useExportDocumentReferences();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReferences, setFilteredReferences] = useState([]);
  const [selectedRef, setSelectedRef] = useState(selectedValue);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Determine which references to use based on type
  const getReferencesList = () => {
    switch (referenceType) {
      case 'export_invoice':
        return references.exportInvoices;
      case 'packing_list':
        return references.packingLists;
      case 'annexure':
        return references.annexures;
      case 'backside':
        return references.backsides;
      case 'vgm':
        return references.vgmDocuments;
      default:
        return [];
    }
  };

  const getRefLabel = (ref) => {
    switch (referenceType) {
      case 'export_invoice':
        return `${ref.invoice_no} - ${ref.client_name} (${ref.status})`;
      case 'packing_list':
        return `${ref.packing_list_no} - ${ref.invoice_no} (${ref.status})`;
      case 'annexure':
        return `${ref.invoice_no} - ${ref.packing_list_no} (${ref.status})`;
      case 'backside':
        return `${ref.invoice_no} - ${ref.annexure_no} (${ref.status})`;
      case 'vgm':
        return `${ref.vgm_no} (${ref.status})`;
      default:
        return ref.id;
    }
  };

  // Initial fetch based on reference type
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const activeCurrentId = currentId || selectedValue?.id || (typeof selectedValue === 'string' ? selectedValue : null);
        switch (referenceType) {
          case 'export_invoice':
            await fetchExportInvoiceReferences('', activeCurrentId);
            break;
          case 'packing_list':
            await fetchPackingListReferences(parentId, '', activeCurrentId);
            break;
          case 'annexure':
            await fetchAnnexureReferences(parentId, '', activeCurrentId);
            break;
          case 'backside':
            await fetchBacksideReferences(parentId, '', null, activeCurrentId);
            break;
          case 'vgm':
            await fetchVGMReferences(parentId, '', activeCurrentId);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Error fetching references:', err);
      }
    };

    fetchReferences();
  }, [referenceType, parentId, selectedValue, currentId]);

  // Update filtered list based on search term
  useEffect(() => {
    const refList = getReferencesList();
    if (!searchTerm) {
      setFilteredReferences(refList);
    } else {
      const filtered = refList.filter(ref => {
        const searchLower = searchTerm.toLowerCase();
        if (ref.invoice_no && ref.invoice_no.toLowerCase().includes(searchLower)) return true;
        if (ref.packing_list_no && ref.packing_list_no.toLowerCase().includes(searchLower)) return true;
        if (ref.annexure_no && ref.annexure_no.toLowerCase().includes(searchLower)) return true;
        if (ref.vgm_no && ref.vgm_no.toLowerCase().includes(searchLower)) return true;
        if (ref.client_name && ref.client_name.toLowerCase().includes(searchLower)) return true;
        return false;
      });
      setFilteredReferences(filtered);
    }
  }, [searchTerm, references]);

  const handleReferenceChange = async (e) => {
    const refId = e.target.value;
    if (!refId) {
      setSelectedRef(null);
      clearError();
      return;
    }

    try {
      setIsLoadingData(true);
      clearError();

      // Find the selected reference
      const refList = getReferencesList();
      const selected = refList.find(r => r.id === refId);
      if (!selected) {
        throw new Error('Reference not found');
      }

      // Validate reference
      const isValid = await validateReference(referenceType, refId);
      if (!isValid) {
        throw new Error('Invalid reference or reference is not in approved status');
      }

      // Fetch inherited data based on reference type
      let inherited = null;
      switch (referenceType) {
        case 'export_invoice':
          inherited = await getPackingListInheritedData(refId);
          break;
        case 'packing_list':
          inherited = await getAnnexureInheritedData(refId);
          break;
        case 'annexure':
          inherited = await getBacksideInheritedData(refId);
          break;
        case 'backside':
          inherited = await getVGMInheritedData(refId);
          break;
        case 'vgm':
          inherited = await getShippingInheritedData(refId);
          break;
        default:
          break;
      }

      setSelectedRef(selected);
      if (onReferenceSelect) {
        onReferenceSelect(selected, inherited);
      }
    } catch (err) {
      console.error('Error selecting reference:', err);
      if (onError) {
        onError(err.response?.data?.message || err.message);
      }
      setSelectedRef(null);
    } finally {
      setIsLoadingData(false);
    }
  };

  const refList = getReferencesList();

  return (
    <Form.Group className="mb-3">
      <Form.Label>
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </Form.Label>

      {error && (
        <Alert variant="warning" className="mb-2 d-flex gap-2" dismissible onClose={clearError}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{error?.message || error?.toString() || 'Error loading references'}</div>
        </Alert>
      )}

      <div className="input-group">
        <span className="input-group-text bg-light">
          <Search size={18} className="text-muted" />
        </span>
        <Form.Control
          type="text"
          placeholder={`Search ${referenceType}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isReadOnly || isLoadingData}
          className="border-start-0"
        />
      </div>

      <Form.Select
        value={selectedRef?.id || ''}
        onChange={handleReferenceChange}
        disabled={isReadOnly || loading || isLoadingData}
        required={required}
        className="mt-2"
        size="sm"
      >
        <option value="">
          {loading ? 'Loading references...' : `-- Select a ${referenceType} --`}
        </option>
        {filteredReferences.map((ref) => (
          <option key={ref.id} value={ref.id}>
            {getRefLabel(ref)}
          </option>
        ))}
      </Form.Select>

      {isLoadingData && (
        <div className="mt-2 d-flex align-items-center gap-2">
          <Spinner animation="border" size="sm" />
          <small className="text-muted">Loading reference data...</small>
        </div>
      )}

      {isReadOnly && selectedRef && (
        <small className="text-muted d-block mt-2">
          ℹ️ Reference locked (cannot be changed after saving)
        </small>
      )}

      {!refList.length && !loading && (
        <small className="text-danger d-block mt-2">
          No valid {referenceType} available. Please create one first.
        </small>
      )}
    </Form.Group>
  );
}

export default ExportDocumentReferenceSelector;




