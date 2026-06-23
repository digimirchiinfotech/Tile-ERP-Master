import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Form, Spinner } from 'react-bootstrap';
import { Search, BookOpen, ArrowRight } from 'lucide-react';
import { useCatalogues } from '../../hooks/useCatalogues.js';
import CatalogueView from '../catalogue-management/CatalogueView.jsx'; // Existing detailed view
import PaginationControls from '../common/PaginationControls.jsx';
import { normalizeCatalogue } from '../../utils/dataTransformers.js';
import './UserViews.css';

const CatalogueGallery = () => {
  const { catalogues, loading } = useCatalogues();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingCatalogue, setViewingCatalogue] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  const filteredCatalogues = useMemo(() => {
    return catalogues.filter(c => {
      if (c.status !== 'Active') return false;
      const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [catalogues, searchTerm]);

  const totalPages = Math.ceil(filteredCatalogues.length / PAGE_SIZE);
  const paginatedCatalogues = filteredCatalogues.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const handleView = async (catalogue) => {
    try {
      const { catalogueService } = await import('../../services/catalogueService.js');
      const response = await catalogueService.getById(catalogue.id);
      const data = response?.data?.data || response?.data;
      setViewingCatalogue(normalizeCatalogue(data));
    } catch (err) {
      console.error('Failed to load full catalogue', err);
    }
  };

  return (
    <div className="uv-gallery-container">
      <Container className="px-4">
        <div className="text-center mb-5 mt-3">
          <div className="d-inline-flex align-items-center justify-content-center p-3 bg-primary-subtle text-primary rounded-circle mb-3">
            <BookOpen size={32} />
          </div>
          <h1 className="fw-bold text-dark mb-3" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Digital Catalogues</h1>
          <p className="text-muted mx-auto" style={{ maxWidth: '600px', fontSize: '1.15rem' }}>
            Browse our comprehensive digital brochures featuring detailed product specifications and beautiful room concepts.
          </p>
        </div>

        <Row className="justify-content-center mb-5">
          <Col md={8} lg={6}>
            <div className="position-relative">
              <Search className="position-absolute text-muted" size={20} style={{ left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
              <Form.Control
                type="text"
                placeholder="Search catalogues by name..."
                className="py-3 px-5 border-0 shadow-sm rounded-pill"
                style={{ fontSize: '1.1rem' }}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </Col>
        </Row>

        {filteredCatalogues.length === 0 ? (
          <div className="text-center py-5">
            <h4 className="text-muted fw-normal">No catalogues found matching your criteria.</h4>
          </div>
        ) : (
          <>
            <Row className="g-4 mb-5">
              {paginatedCatalogues.map(catalogue => (
                <Col key={catalogue.id} md={6} lg={4}>
                  <div 
                    className="uv-catalogue-card h-100 p-4 cursor-pointer d-flex flex-column"
                    onClick={() => handleView(catalogue)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="uv-catalogue-icon-wrap">
                      <BookOpen size={28} />
                    </div>
                    <h3 className="fw-bold text-dark mb-2 h5">{catalogue.name}</h3>
                    <p className="text-muted small flex-grow-1 mb-4" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {catalogue.description || 'No description available.'}
                    </p>
                    
                    <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top border-light">
                      <div className="text-muted small fw-medium">
                        <span className="text-dark fw-bold">{catalogue.productCount || catalogue.totalProducts || 0}</span> Products
                      </div>
                      <div className="text-primary fw-bold small d-flex align-items-center">
                        View Catalogue <ArrowRight size={14} className="ms-1" />
                      </div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>

            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredCatalogues.length}
                  pageSize={PAGE_SIZE}
                />
              </div>
            )}
          </>
        )}
      </Container>

      {/* Existing Catalogue View Modal */}
      {viewingCatalogue && (
        <CatalogueView
          catalogue={viewingCatalogue}
          onClose={() => setViewingCatalogue(null)}
          canEdit={false}
          products={[]} // The catalogue view handles fetching if needed, or it primarily shows PDF
        />
      )}
    </div>
  );
};

export default CatalogueGallery;
