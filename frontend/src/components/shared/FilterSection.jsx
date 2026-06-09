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

import { Row, Col, Form, Button } from 'react-bootstrap';
import { Search, RotateCcw } from 'lucide-react';
import DateRangeFilter from '../common/DateRangeFilter.jsx';
import FilterPanel from './FilterPanel.jsx';
import './FilterSection.css';

/**
 * Premium Filter Section Component
 */
function FilterSection({ filters, onFiltersChange, data = [], countries = [], statuses = [], clients = [], labels = {} }) {
  // Dynamically extract options from data if provided, otherwise use provided props or defaults
  const extractUnique = (key, fallbackKey) => {
    if (!data || data.length === 0) return [];
    const values = data.map(item => item[key] || item[fallbackKey]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const dynamicCountries = extractUnique('country');
  const dynamicStatuses = extractUnique('status');
  const dynamicClients = extractUnique('clientName', 'client_name');

  const filterCountries = countries.length > 0 ? countries : (dynamicCountries.length > 0 ? dynamicCountries : ['USA', 'UK', 'Germany', 'France', 'Italy', 'Spain', 'Canada', 'Australia']);
  const filterStatuses = statuses.length > 0 ? statuses : (dynamicStatuses.length > 0 ? dynamicStatuses : ['Draft', 'Submitted', 'Approved', 'Locked', 'Revised', 'Converted']);
  const filterClients = clients.length > 0 ? clients : dynamicClients;

  const defaultLabels = {
    search: 'Search',
    searchPlaceholder: 'Search by name, email...',
    clientName: 'Client Name',
    country: 'Country',
    status: 'Status'
  };
  const activeLabels = { ...defaultLabels, ...labels };

  const handleFilterChange = (key, value) => {
    onFiltersChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDateRangeChange = (start, end) => {
    onFiltersChange((prev) => ({
      ...prev,
      dateRange: { start, end },
    }));
  };

  const resetFilters = () => {
    onFiltersChange({
      search: '',
      clientName: '',
      country: '',
      status: '',
      dateRange: { start: '', end: '' },
    });
  };

  return (
    <FilterPanel 
      onClear={resetFilters} 
      title="Search & Filters"
      className="mb-4"
    >
      <Form onSubmit={(e) => e.preventDefault()}>
        <Row className="g-3 align-items-end">
          <Col lg={3} md={6} sm={12}>
            <Form.Group>
              <Form.Label className="fw-bold small text-muted text-uppercase">{activeLabels.search}</Form.Label>
              <div className="position-relative">
                <Search size={16} className="position-absolute ms-3 top-50 translate-middle-y text-muted" />
                <Form.Control
                  type="text"
                  className="ps-5 py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  placeholder={activeLabels.searchPlaceholder}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </Form.Group>
          </Col>
          <Col lg={3} md={6} sm={12}>
            <Form.Group>
              <Form.Label className="fw-bold small text-muted text-uppercase">{activeLabels.clientName}</Form.Label>
              {filterClients.length > 0 ? (
                <Form.Select
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  value={filters.clientName}
                  onChange={(e) => handleFilterChange('clientName', e.target.value)}
                >
                  <option value="">All Clients</option>
                  {filterClients.map((client) => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control
                  type="text"
                  className="py-2 border-primary-subtle"
                  style={{ borderRadius: '10px' }}
                  placeholder="All Clients"
                  value={filters.clientName}
                  onChange={(e) => handleFilterChange('clientName', e.target.value)}
                />
              )}
            </Form.Group>
          </Col>
          <Col lg={3} md={6} sm={6}>
            <Form.Group>
              <Form.Label className="fw-bold small text-muted text-uppercase">{activeLabels.country}</Form.Label>
              <Form.Select
                className="py-2 border-primary-subtle"
                style={{ borderRadius: '10px' }}
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
              >
                <option value="">All Countries</option>
                {filterCountries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col lg={3} md={6} sm={6}>
            <Form.Group>
              <Form.Label className="fw-bold small text-muted text-uppercase">{activeLabels.status}</Form.Label>
              <Form.Select
                className="py-2 border-primary-subtle"
                style={{ borderRadius: '10px' }}
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                                  <option value="">All Status</option>
                                      <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Revised">Revised</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Finalized">Finalized</option>
                    <option value="Rejected">Rejected</option>
                  </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12}>
            <DateRangeFilter onFilterChange={handleDateRangeChange} />
          </Col>
        </Row>
      </Form>
    </FilterPanel>
  );
}

export default FilterSection;
