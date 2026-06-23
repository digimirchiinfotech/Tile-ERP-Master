import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Form, Spinner } from 'react-bootstrap';
import { Search, Filter, X } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts.js';
import ProductCard from './ProductCard.jsx';
import ProductView from '../product-management/ProductView.jsx'; // Reuse the existing detailed view modal
import PaginationControls from '../common/PaginationControls.jsx';
import './UserViews.css';

const TileProductGallery = () => {
  const { products, loading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSize, setSelectedSize] = sizes => useState('');
  const [selectedSurface, setSelectedSurface] = useState('');
  const [viewingProduct, setViewingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  // Extract unique sizes and surfaces for filters
  const availableSizes = useMemo(() => {
    const sizes = new Set();
    products.forEach(p => {
      if (p.size) {
        if (Array.isArray(p.size)) p.size.forEach(s => sizes.add(s));
        else p.size.split(',').forEach(s => sizes.add(s.trim()));
      }
    });
    return Array.from(sizes).sort();
  }, [products]);

  const availableSurfaces = useMemo(() => {
    const surfaces = new Set();
    products.forEach(p => {
      if (p.surface) {
        if (Array.isArray(p.surface)) p.surface.forEach(s => surfaces.add(s));
        else p.surface.split(',').forEach(s => surfaces.add(s.trim()));
      }
    });
    return Array.from(surfaces).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Only show active products to end-users ideally, but we'll show all or Active based on standard logic. Let's show only Active for the gallery.
      if (p.status !== 'Active') return false;

      // Ensure it's not sanitaryware (assuming sanitaryware might be mixed or in a separate hook, but useProducts might return tiles)
      // If we use separate endpoints, this is fine.

      const matchesSearch = (p.companyProductName || p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesSize = true;
      if (selectedSize) {
        const pSizes = Array.isArray(p.size) ? p.size : (p.size ? p.size.split(',').map(s=>s.trim()) : []);
        matchesSize = pSizes.includes(selectedSize);
      }

      let matchesSurface = true;
      if (selectedSurface) {
        const pSurfaces = Array.isArray(p.surface) ? p.surface : (p.surface ? p.surface.split(',').map(s=>s.trim()) : []);
        matchesSurface = pSurfaces.includes(selectedSurface);
      }

      return matchesSearch && matchesSize && matchesSurface;
    });
  }, [products, searchTerm, selectedSize, selectedSurface]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSize('');
    setSelectedSurface('');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="uv-gallery-container">
      <Container fluid className="px-4">
        <div className="uv-header">
          <h1 className="uv-title">Tile Collection</h1>
          <p className="uv-subtitle">Explore our premium selection of floor and wall tiles.</p>
        </div>

        <Row className="g-4">
          {/* Sidebar Filters */}
          <Col lg={3} xl={2}>
            <div className="uv-filter-sidebar">
              <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <h5 className="mb-0 fw-bold d-flex align-items-center">
                  <Filter size={18} className="me-2 text-primary" /> Filters
                </h5>
                {(searchTerm || selectedSize || selectedSurface) && (
                  <button 
                    className="btn btn-link text-muted p-0 text-decoration-none small d-flex align-items-center"
                    onClick={resetFilters}
                  >
                    <X size={14} className="me-1" /> Clear
                  </button>
                )}
              </div>

              <div className="uv-filter-group">
                <div className="position-relative">
                  <Search className="uv-search-icon" size={16} />
                  <Form.Control
                    type="text"
                    placeholder="Search tiles..."
                    className="uv-search-input"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>

              <div className="uv-filter-group">
                <label className="uv-filter-label">Size</label>
                <Form.Select 
                  value={selectedSize} 
                  onChange={(e) => { setSelectedSize(e.target.value); setCurrentPage(1); }}
                  className="rounded-3 shadow-sm border-0 bg-light py-2"
                >
                  <option value="">All Sizes</option>
                  {availableSizes.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </Form.Select>
              </div>

              <div className="uv-filter-group">
                <label className="uv-filter-label">Surface Finish</label>
                <Form.Select 
                  value={selectedSurface} 
                  onChange={(e) => { setSelectedSurface(e.target.value); setCurrentPage(1); }}
                  className="rounded-3 shadow-sm border-0 bg-light py-2"
                >
                  <option value="">All Finishes</option>
                  {availableSurfaces.map(surface => (
                    <option key={surface} value={surface}>{surface}</option>
                  ))}
                </Form.Select>
              </div>
            </div>
          </Col>

          {/* Product Grid */}
          <Col lg={9} xl={10}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="text-muted fw-medium">
                Showing <span className="text-dark fw-bold">{filteredProducts.length}</span> products
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-4 shadow-sm border border-light mt-4">
                <div className="opacity-50 mb-3">
                  <Search size={48} className="text-muted" />
                </div>
                <h4 className="fw-bold text-dark">No products found</h4>
                <p className="text-muted">Try adjusting your filters or search term.</p>
                <button className="btn btn-primary mt-2 rounded-pill px-4" onClick={resetFilters}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <Row className="g-4 mb-5">
                  {paginatedProducts.map(product => (
                    <Col key={product.id} sm={6} md={4} xl={3}>
                      <ProductCard product={product} onView={setViewingProduct} />
                    </Col>
                  ))}
                </Row>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center bg-white p-3 rounded-4 shadow-sm border border-light">
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      totalItems={filteredProducts.length}
                      pageSize={PAGE_SIZE}
                    />
                  </div>
                )}
              </>
            )}
          </Col>
        </Row>
      </Container>

      {/* Reusing the administrative ProductView modal but maybe passing a flag if needed. For now, just reuse it as is. */}
      {viewingProduct && (
        <ProductView 
          product={viewingProduct} 
          onClose={() => setViewingProduct(null)} 
        />
      )}
    </div>
  );
};

export default TileProductGallery;
