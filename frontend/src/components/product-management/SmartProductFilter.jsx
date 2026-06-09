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
import { Row, Col, Card, Form, Button, Badge } from 'react-bootstrap';
import { Search, Filter, RotateCcw } from 'lucide-react';
import FilterPanel from '../shared/FilterPanel.jsx';
import DateRangeFilter from '../common/DateRangeFilter.jsx';

/**
 * Smart Product Filter Component with Application-Based Grouping
 * Features:
 * - Smart filters by application (Bathroom, Kitchen, Outdoor)
 * - Cross-category filtering
 * - Bundle product filtering
 * - Advanced search with multiple criteria
 */
function SmartProductFilter({ filters, onFiltersChange, products = [], dateRange, setDateRange, masterData }) {
  const [productStats, setProductStats] = useState({});


  useEffect(() => {
    const stats = {
      total: products.length,
      tiles: products.filter(p => p.catalogue === 'Tiles').length,
      bundles: products.filter(p => p.isBundle).length,
    };
    setProductStats(stats);
  }, [products]);


  const resetAllFilters = () => {
    onFiltersChange('reset', true);
  };


  return (
    <FilterPanel 
      onClear={resetAllFilters} 
      title="Smart Product Filters"
      className="mb-4"
    >
      <Row className="g-3 align-items-end mb-3">
        <Col lg={2} md={4} sm={12}>
          <Form.Group>
            <Form.Label className="fw-bold small text-muted text-uppercase">Factory Name</Form.Label>
            <Form.Select
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={filters.factoryName || ''}
              onChange={(e) => onFiltersChange('factoryName', e.target.value)}
            >
              <option value="">All Factories</option>
              {[...new Set(products.map(p => p.factoryName).filter(Boolean))].sort().map((factory, idx) => (
                <option key={idx} value={factory}>{factory}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col lg={2} md={4} sm={12}>
          <Form.Group>
            <Form.Label className="fw-bold small text-muted text-uppercase">Factory Product</Form.Label>
            <Form.Select
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={filters.factoryProductName || ''}
              onChange={(e) => onFiltersChange('factoryProductName', e.target.value)}
            >
              <option value="">All Factory Products</option>
              {[...new Set(products.map(p => p.factoryProductName).filter(Boolean))].sort().map((prod, idx) => (
                <option key={idx} value={prod}>{prod}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col lg={2} md={4} sm={12}>
          <Form.Group>
            <Form.Label className="fw-bold small text-muted text-uppercase">Company Product</Form.Label>
            <Form.Select
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={filters.companyProductName || ''}
              onChange={(e) => onFiltersChange('companyProductName', e.target.value)}
            >
              <option value="">All Company Products</option>
              {[...new Set(products.map(p => p.companyProductName || p.name).filter(Boolean))].sort().map((prod, idx) => (
                <option key={idx} value={prod}>{prod}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Form.Group>
            <Form.Label className="fw-bold small text-muted text-uppercase">Category</Form.Label>
            <Form.Select
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={filters.category || ''}
              onChange={(e) => onFiltersChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {masterData?.categories?.map((item, idx) => (
                <option key={idx} value={typeof item === 'object' ? (item.value || item.name) : item}>
                  {typeof item === 'object' ? (item.value || item.name) : item}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Form.Group>
            <Form.Label className="fw-bold small text-muted text-uppercase">Size</Form.Label>
            <Form.Select
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={filters.size || ''}
              onChange={(e) => onFiltersChange('size', e.target.value)}
            >
              <option value="">All Sizes</option>
              {masterData?.sizes?.map((item, idx) => (
                <option key={idx} value={typeof item === 'object' ? (item.value || item.name) : item}>
                  {typeof item === 'object' ? (item.value || item.name) : item}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Form.Group>
            <Form.Label className="fw-bold small text-muted text-uppercase">Application</Form.Label>
            <Form.Select
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={filters.application || ''}
              onChange={(e) => onFiltersChange('application', e.target.value)}
            >
              <option value="">All Applications</option>
              {masterData?.applications?.map((item, idx) => (
                <option key={idx} value={typeof item === 'object' ? (item.value || item.name) : item}>
                  {typeof item === 'object' ? (item.value || item.name) : item}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Form.Group>
            <Form.Label className="fw-bold small text-muted text-uppercase">Thickness</Form.Label>
            <Form.Select
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={filters.thickness || ''}
              onChange={(e) => onFiltersChange('thickness', e.target.value)}
            >
              <option value="">All Thickness</option>
              {masterData?.thickness?.map((item, idx) => (
                <option key={idx} value={typeof item === 'object' ? (item.value || item.name) : item}>
                  {typeof item === 'object' ? (item.value || item.name) : item}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Form.Group>
            <Form.Label className="fw-bold small text-muted text-uppercase">Surface</Form.Label>
            <Form.Select
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={filters.surface || ''}
              onChange={(e) => onFiltersChange('surface', e.target.value)}
            >
              <option value="">All Surfaces</option>
              {masterData?.surfaces?.map((item, idx) => (
                <option key={idx} value={typeof item === 'object' ? (item.value || item.name) : item}>
                  {typeof item === 'object' ? (item.value || item.name) : item}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Form.Group>
            <Form.Label className="fw-bold small text-muted text-uppercase">Status</Form.Label>
            <Form.Select
              className="py-2 border-primary-subtle"
              style={{ borderRadius: '10px' }}
              value={filters.status || ''}
              onChange={(e) => onFiltersChange('status', e.target.value)}
            >
                                <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Filter Info */}
      <div className="mt-3">
        <small className="text-muted fw-medium">
          Showing {productStats.total} products
        </small>
      </div>

      <style>{`
        .smart-filter-group {
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .smart-filter-btn {
          border: 1px solid #f1f5f9 !important;
        }
        .smart-filter-btn.active-filter {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
        .smart-filter-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        @media (max-width: 768px) {
          .smart-filter-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
      {/* Date Range Section */}
      <Row className="mt-3">
        <Col xs={12}>
          <div className="pt-3 border-top">
            <DateRangeFilter onFilterChange={(start, end) => setDateRange({ start, end })} />
          </div>
        </Col>
      </Row>
    </FilterPanel>
  );
}

export default SmartProductFilter;




