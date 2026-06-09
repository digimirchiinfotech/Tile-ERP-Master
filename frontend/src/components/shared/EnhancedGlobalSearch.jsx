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

import React, { useState, useRef } from 'react';
import {
  Form,
  InputGroup,
  Card,
  Badge,
  Button,
  Spinner
} from 'react-bootstrap';
import {
  Search,
  X,
  Package,
  Users,
  FileText} from 'lucide-react';
import searchService from '../../services/searchService.js';

const EnhancedGlobalSearch = ({ onNavigate, onSelectResult, className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  const searchCategories = {
    all: { name: 'All', icon: Search, color: 'primary' },
    products: { name: 'Products', icon: Package, color: 'success' },
    clients: { name: 'Clients', icon: Users, color: 'info' },
  };

  const performSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const resp = await searchService.globalSearch(query);
      if (!resp || !resp.success) {
        setSearchResults([]);
        return;
      }

      const resultsArray = Array.isArray(resp.data) ? resp.data : [];

      // Map backend result shape { type, key, id, title, description, view }
      const mapped = resultsArray.map((r) => ({
        type: (r.key || r.type || '').toString().toLowerCase(),
        id: r.id,
        title: r.title || r.name || r.invoice_no || r.order_no || '',
        subtitle: r.description || '',
        raw: r,
      }));

      // Prioritize clients and products for faster discovery
      mapped.sort((a, b) => {
        const score = (t) => (t === 'client' ? 2 : t === 'product' ? 1 : 0);
        return score(b.type) - score(a.type);
      });

      setSearchResults(mapped.slice(0, 10));
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSelectResult = (result) => {
    // Default navigation handler: prefer `onNavigate` via parent
    if (onSelectResult) {
      onSelectResult(result);
    } else if (onNavigate) {
      // Map types to views
      const type = (result.type || '').toLowerCase();
      
      if (type === 'client' || type === 'clients') {
        onNavigate('client-management', { clientId: result.id });
      } else if (type === 'product' || type === 'products') {
        onNavigate('product-management', { productId: result.id });
      } else if (type === 'invoice' || type === 'proformainvoices') {
        onNavigate('invoice-management', { invoiceId: result.id });
      } else if (type === 'exportinvoices') {
        onNavigate('export-invoice-form', { invoiceId: result.id });
      } else if (type === 'packinglists') {
        onNavigate('packing-list-form', { exportInvoiceId: result.id });
      } else if (type === 'annexure') {
        onNavigate('export-invoice-annexure-form', { exportInvoiceId: result.id });
      } else if (type === 'vgm') {
        onNavigate('vgm-form', { exportInvoiceId: result.id });
      } else if (type === 'shippinginstructions') {
        onNavigate('shipping-instruction', { exportInvoiceId: result.id });
      } else if (type === 'billoflading') {
        onNavigate('export-invoice-bl-form', { exportInvoiceId: result.id });
      } else if (type === 'customsclearance') {
        onNavigate('export-invoice-customs-form', { exportInvoiceId: result.id });
      } else if (type === 'certificate') {
        onNavigate('export-invoice-certificate-form', { exportInvoiceId: result.id });
      } else if (type === 'orders') {
        onNavigate('client-order-management', { orderId: result.id });
      } else if (type === 'lead' || type === 'leads') {
        onNavigate('lead-management', { leadId: result.id });
      } else if (type === 'supplier' || type === 'suppliers') {
        onNavigate('supplier-management', { supplierId: result.id });
      } else if (type === 'user' || type === 'users') {
        onNavigate('user-management', { userId: result.id });
      } else if (type === 'qcrecords') {
        onNavigate('qc-management', { qcId: result.id });
      } else if (type === 'accountentries') {
        onNavigate('account-management', { entryId: result.id });
      } else if (type === 'invoicebackside') {
        onNavigate('invoice-backside-form', { exportInvoiceId: result.id });
      } else if (type === 'company') {
        onNavigate('company-management', { companyId: result.id });
      } else if (type === 'catalogues' || type === 'catalogue') {
        onNavigate('catalogue-management', { id: result.id });
      } else if (type === 'pallets' || type === 'pallet') {
        onNavigate('pallet-management', { id: result.id });
      } else {
        // Fallback: open search-results view
        onNavigate('search-results', { query: searchQuery, results: [result] });
      }
    }

    setShowResults(false);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className={`enhanced-global-search ${className}`}>
      <InputGroup>
        <InputGroup.Text>
          <Search size={18} />
        </InputGroup.Text>
        <Form.Control
          ref={searchInputRef}
          type="text"
          placeholder="Search products, clients..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowResults(true)}
        />
        {searchQuery && (
          <Button variant="outline" onClick={clearSearch}>
            <X size={16} />
          </Button>
        )}
      </InputGroup>

      {showResults && (searchResults.length > 0 || isLoading) && (
        <Card className="search-results-dropdown mt-2 position-absolute" style={{ zIndex: 1000, width: '100%' }}>
          <Card.Body>
            {isLoading ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : (
              <div>
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      className="search-result-item p-2 border-bottom"
                      onClick={() => handleSelectResult(result)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex align-items-center">
                        {(result.type === 'product' || result.type === 'products') && <Package size={16} className="me-2 text-success" />}
                        {(result.type === 'client' || result.type === 'clients') && <Users size={16} className="me-2 text-info" />}
                        {(['catalogues', 'catalogue'].includes(result.type)) && <FileText size={16} className="me-2 text-secondary" />}
                        {(['pallets', 'pallet'].includes(result.type)) && <Package size={16} className="me-2 text-warning" />}
                        {(['invoice', 'proformainvoices', 'exportinvoices', 'packinglists', 'annexure', 'vgm', 'shippinginstructions', 'invoicebackside', 'billoflading', 'customsclearance', 'certificate'].includes(result.type)) && <FileText size={16} className="me-2 text-primary" />}
                        <div>
                          <strong>{result.title}</strong>
                          <Badge bg="light" text="dark" className="ms-2 fw-normal" style={{ fontSize: '10px' }}>
                            {result.raw?.type}
                          </Badge>
                          <br />
                          <small className="text-muted">{result.subtitle}</small>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 text-muted">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      <style>{`
        .enhanced-global-search {
          position: relative;
        }
        
        .search-results-dropdown {
          max-height: 400px;
          overflow-y: auto;
        }
        
        .search-result-item:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
};

export default EnhancedGlobalSearch;




