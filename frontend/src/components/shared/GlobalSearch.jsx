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
import { Form, Dropdown, Badge, InputGroup, Button, Card, ListGroup } from 'react-bootstrap';
import { Search, Filter, X, Calendar, DollarSign, FileText, Users, Package, Zap } from 'lucide-react';
import searchService from '../../services/searchService.js';

/**
 * Global Search & Advanced Filters Component
 */
function GlobalSearch({ onSearch, onFilterChange, placeholder = "Search across clients, invoices, products..." }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    amountMin: '',
    amountMax: '',
    category: '',
    sortBy: 'recent',
    sortOrder: 'desc',
  });

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'pending', label: 'Pending' },
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'clients', label: 'Clients' },
    { value: 'invoices', label: 'Invoices' },
    { value: 'products', label: 'Products' },
    { value: 'orders', label: 'Orders' },
    { value: 'leads', label: 'Leads' },
  ];

  const sortOptions = [
    { value: 'recent', label: 'Recent First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'amount-high', label: 'Amount: High to Low' },
    { value: 'amount-low', label: 'Amount: Low to High' },
  ];

  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery, filters);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (onSearch) {
      onSearch(searchQuery, newFilters);
    }
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const clearFilters = () => {
    const clearedFilters = {
      dateFrom: '',
      dateTo: '',
      status: '',
      amountMin: '',
      amountMax: '',
      category: '',
      sortBy: 'recent',
      sortOrder: 'desc',
    };
    setFilters(clearedFilters);
    setSearchQuery('');
    setSearchResults([]);
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== '' && value !== 'recent' && value !== 'desc').length;
  };

  return (
    <div className="global-search-component">
      <Form onSubmit={handleSearchSubmit}>
        <InputGroup className="search-input-group mb-3">
          <InputGroup.Text>
            <Search size={20} />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
          <Button
            variant="primary"
            type="submit"
            className="px-4"
          >
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="filter-toggle-btn"
          >
            <Filter size={16} className="me-1" />
            Filters
            {getActiveFilterCount() > 0 && (
              <Badge bg="primary" className="ms-1">
                {getActiveFilterCount()}
              </Badge>
            )}
          </Button>
          {(searchQuery || getActiveFilterCount() > 0) && (
            <Button variant="outline" onClick={clearFilters}>
              <X size={16} />
            </Button>
          )}
        </InputGroup>
      </Form>

      {showAdvancedFilters && (
        <Card className="advanced-filters-panel mb-3">
          <Card.Body>
            <div className="row g-3">
              <div className="col-md-3">
                <Form.Label className="filter-label">
                  <Calendar size={16} className="me-1" />
                  Date From
                </Form.Label>
                <Form.Control
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <Form.Label className="filter-label">Date To</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <Form.Label className="filter-label">Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-3">
                <Form.Label className="filter-label">Category</Form.Label>
                <Form.Select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-3">
                <Form.Label className="filter-label">
                  <DollarSign size={16} className="me-1" />
                  Min Amount
                </Form.Label>
                <Form.Control
                  type="number"
                  placeholder="0"
                  value={filters.amountMin}
                  onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <Form.Label className="filter-label">Max Amount</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="100000"
                  value={filters.amountMax}
                  onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <Form.Label className="filter-label">Sort By</Form.Label>
                <Form.Select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <Button variant="outline" onClick={clearFilters} className="w-100">
                  Clear All Filters
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {searchQuery && (
        <Card className="search-results-panel">
          <Card.Body className="text-center py-4">
            <Search size={32} className="mb-2 text-primary" />
            <p className="text-muted">
              <strong>Searching across all enterprise modules...</strong><br/>
              <small>Your search results will appear on the next page</small>
            </p>
          </Card.Body>
        </Card>
      )}

      <style>{`
        .global-search-component {
          margin-bottom: 2rem;
        }
        .search-input-group {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          overflow: hidden;
        }
        .search-input {
          border: none;
          font-size: 1rem;
          padding: 1rem;
        }
        .search-input:focus {
          box-shadow: none;
          border-color: transparent;
        }
        .filter-toggle-btn {
          border: none;
          background: #f8fafc;
          color: #64748b;
          font-weight: 600;
          padding: 1rem 1.5rem;
        }
        .filter-toggle-btn:hover {
          background: #e2e8f0;
          color: #475569;
        }
        .advanced-filters-panel {
          border: none;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        .filter-label {
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .search-results-panel {
          border: none;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          max-height: 400px;
        }
      `}</style>
    </div>
  );
}

export default GlobalSearch;




