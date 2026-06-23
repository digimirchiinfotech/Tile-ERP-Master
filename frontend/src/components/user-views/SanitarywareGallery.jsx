import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Form, Spinner } from 'react-bootstrap';
import { Search, Filter, X } from 'lucide-react';
import { useSanitarywareProducts } from '../../hooks/useSanitarywareProducts.js';
import ProductCard from './ProductCard.jsx';
import SanitarywareProductView from '../sanitaryware-product-management/SanitarywareProductView.jsx'; // Existing view
import PaginationControls from '../common/PaginationControls.jsx';
import './UserViews.css';

const SanitarywareGallery = () => {
  const { sanitarywareProducts, loading } = useSanitarywareProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [viewingProduct, setViewingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  // Extract unique categories and colors for filters
  const availableCategories = useMemo(() => {
    const cats = new Set();
    sanitarywareProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [sanitarywareProducts]);

  const availableColors = useMemo(() => {
    const colors = new Set();
    sanitarywareProducts.forEach(p => {
      if (p.color) {
        if (Array.isArray(p.color)) p.color.forEach(c => colors.add(c));
        else p.color.split(',').forEach(c => colors.add(c.trim()));
      }
    });
    return Array.from(colors).sort();
  }, [sanitarywareProducts]);

  const filteredProducts = useMemo(() => {
    return sanitarywareProducts.filter(p => {
      if (p.status !== 'Active') return false;

      const matchesSearch = (p.companyProductName || p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesCategory = true;
      if (selectedCategory) {
        matchesCategory = p.category === selectedCategory;
      }

      let matchesColor = true;
      if (selectedColor) {
        const pColors = Array.isArray(p.color) ? p.color : (p.color ? p.color.split(',').map(s=>s.trim()) : []);
        matchesColor = pColors.includes(selectedColor);
      }

      return matchesSearch && matchesCategory && matchesColor;
    });
  }, [sanitarywareProducts, searchTerm, selectedCategory, selectedColor]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedColor('');
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
          <h1 className="uv-title">Sanitaryware Collection</h1>
          <p className="uv-subtitle">Discover our elegant and modern bathware solutions.</p>
        </div>

        <Row className="g-4">
          <Col lg={3} xl={2}>
            <div className="uv-filter-sidebar">
              <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <h5 className="mb-0 fw-bold d-flex align-items-center">
                  <Filter size={18} className="me-2 text-primary" /> Filters
                </h5>
                {(searchTerm || selectedCategory || selectedColor) && (
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
                    placeholder="Search bathware..."
                    className="uv-search-input"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>

              <div className="uv-filter-group">
                <label className="uv-filter-label">Category</label>
                <Form.Select 
                  value={selectedCategory} 
                  onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  className="rounded-3 shadow-sm border-0 bg-light py-2"
                >
                  <option value="">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </div>

              <div className="uv-filter-group">
                <label className="uv-filter-label">Color</label>
                <Form.Select 
                  value={selectedColor} 
                  onChange={(e) => { setSelectedColor(e.target.value); setCurrentPage(1); }}
                  className="rounded-3 shadow-sm border-0 bg-light py-2"
                >
                  <option value="">All Colors</option>
                  {availableColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </Form.Select>
              </div>
            </div>
          </Col>

          <Col lg={9} xl={10}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="text-muted fw-medium">
                Showing <span className="text-dark fw-bold">{filteredProducts.length}</span> items
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

      {viewingProduct && (
        <SanitarywareProductView 
          product={viewingProduct} 
          onClose={() => setViewingProduct(null)} 
        />
      )}
    </div>
  );
};

export default SanitarywareGallery;
