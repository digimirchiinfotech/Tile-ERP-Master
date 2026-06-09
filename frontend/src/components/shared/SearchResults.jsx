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

import { useState } from 'react';
import { Row, Col, Card, Button, Table, Badge, Container } from 'react-bootstrap';
import {
  ArrowLeft,
  Eye,
  FileText,
  Package,
  Users,
  UserCheck,
  Layers,
  Receipt,
  ClipboardCheck,
  Box,
  FilePlus,
  Scale,
  Ship,
  FileStack,
  Calculator,
  ShieldCheck,
  Building2,
  BookOpen,
  Search,
  ChevronRight
} from 'lucide-react';
import { formatDisplayDate } from '../../utils/formatters.js';
import './SearchResults.css';

function SearchResults({ searchQuery, searchResults, onNavigate, onBack }) {
  const [activeTab, setActiveTab] = useState('all');

  const getResultCount = (category) => {
    return searchResults[category]?.length || 0;
  };

  const getTotalResults = () => {
    return Object.values(searchResults).reduce((total, results) => {
      return total + (Array.isArray(results) ? results.length : 0);
    }, 0);
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    const variants = {
      Pending: 'warning',
      Approved: 'success',
      Rejected: 'danger',
      Active: 'success',
      Inactive: 'secondary',
      Passed: 'success',
      Failed: 'danger',
      'Under Process': 'info',
      New: 'primary',
      Contacted: 'info',
      Qualified: 'warning',
      Converted: 'success',
      Lost: 'danger',
      'LOCKED': 'danger',
      'UNLOCKED': 'success'
    };
    return (
      <Badge 
        bg={variants[status] || 'secondary'} 
        className="status-badge-premium"
      >
        {status}
      </Badge>
    );
  };

  const handleViewItem = (item, type) => {
    const navigationConfig = {
      exportInvoices: { view: 'export-invoice-form', data: { invoiceId: item.id } },
      proformaInvoices: { view: 'invoice-form', data: { invoice: { id: item.id } } },
      orders: { view: 'order-form', data: { orderId: item.id } },
      clients: { view: 'client-management', data: { id: item.id } },
      products: { view: 'product-management', data: { id: item.id } },
      leads: { view: 'lead-management', data: { id: item.id } },
      qcRecords: { view: 'qc-management', data: { id: item.id } },
      packingLists: { view: 'packing-list-form', data: { exportInvoiceId: item.id } },
      suppliers: { view: 'supplier-management', data: { id: item.id } },
      users: { view: 'user-management', data: { id: item.id } },
      catalogues: { view: 'catalogue-management', data: { id: item.id } },

      shippingInstructions: { view: 'shipping-instruction', data: { exportInvoiceId: item.id } },
      accountEntries: { view: 'account-finance-management', data: { id: item.id } },
      companies: { view: 'company-management', data: { id: item.id } },
      annexure: { view: 'export-invoice-annexure-form', data: { exportInvoiceId: item.id } },
      vgm: { view: 'vgm-form', data: { exportInvoiceId: item.id } },
      invoiceBackside: { view: 'invoice-backside-form', data: { exportInvoiceId: item.id } },

      customsClearance: { view: 'export-invoice-customs-form', data: { exportInvoiceId: item.id } },
      certificate: { view: 'export-invoice-certificate-form', data: { exportInvoiceId: item.id } }
    };
    
    const config = navigationConfig[type];
    if (config) {
      onNavigate(config.view, config.data);
    }
  };

  const renderResultsTable = (results, type) => {
    if (!results || results.length === 0) {
      return (
        <div className="text-center py-5 text-muted">
          <p className="mb-0">No {getCategoryLabel(type)} found for "{searchQuery}"</p>
        </div>
      );
    }

    const TableHeader = ({ children }) => (
      <Table hover responsive className="search-table-premium mb-0">
        {children}
      </Table>
    );

    const ViewButton = ({ item, type }) => (
      <button 
        className="btn-view-premium" 
        onClick={() => handleViewItem(item, type)}
      >
        <Eye size={14} /> View Details
      </button>
    );

    switch (type) {
      case 'proformaInvoices':
      case 'exportInvoices':
        return (
          <TableHeader>
            <thead>
              <tr>
                <th>{type === 'exportInvoices' ? 'Export Inv No.' : 'Proforma No.'}</th>
                <th>Date</th>
                <th>Client</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="fw-bold" data-label={type === 'exportInvoices' ? 'Export Inv No.' : 'Proforma No.'}>{invoice.title}</td>
                  <td data-label="Date">{invoice.date ? formatDisplayDate(invoice.date) : 'N/A'}</td>
                  <td data-label="Client">{invoice.description}</td>
                  <td data-label="Status">{getStatusBadge(invoice.status)}</td>
                  <td className="text-end" data-label="Actions">
                    <ViewButton item={invoice} type={type} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableHeader>
        );

      case 'orders':
        return (
          <TableHeader>
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Date</th>
                <th>Supplier/Client</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((order) => (
                <tr key={order.id}>
                  <td className="fw-bold" data-label="Order No.">{order.title}</td>
                  <td data-label="Date">{order.date ? formatDisplayDate(order.date) : 'N/A'}</td>
                  <td data-label="Supplier/Client">{order.description}</td>
                  <td data-label="Status">{getStatusBadge(order.status)}</td>
                  <td className="text-end" data-label="Actions">
                    <ViewButton item={order} type={type} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableHeader>
        );

      case 'clients':
      case 'leads':
      case 'suppliers':
      case 'users':
      case 'companies':
      case 'catalogues':
        return (
          <TableHeader>
            <thead>
              <tr>
                <th>Name</th>
                <th>Details</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <tr key={item.id}>
                  <td className="fw-bold" data-label="Name">{item.title}</td>
                  <td className="text-muted" data-label="Details">{item.description}</td>
                  <td className="text-end" data-label="Actions">
                    <ViewButton item={item} type={type} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableHeader>
        );

      case 'products':
        return (
          <TableHeader>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((product) => (
                <tr key={product.id}>
                  <td className="fw-bold" data-label="Product Name">{product.title}</td>
                  <td data-label="Category">{product.description}</td>
                  <td className="text-end" data-label="Actions">
                    <ViewButton item={product} type={type} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableHeader>
        );



      case 'qcRecords':
        return (
          <TableHeader>
            <thead>
              <tr>
                <th>QC ID</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((qc) => (
                <tr key={qc.id}>
                  <td className="fw-bold" data-label="QC ID">{qc.title}</td>
                  <td data-label="Date">{qc.date ? formatDisplayDate(qc.date) : 'N/A'}</td>
                  <td data-label="Status">{getStatusBadge(qc.status || qc.description)}</td>
                  <td className="text-end" data-label="Actions">
                    <ViewButton item={qc} type={type} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableHeader>
        );

      default:
        return (
          <TableHeader>
            <thead>
              <tr>
                <th>Number/ID</th>
                <th>Status/Info</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <tr key={item.id}>
                  <td className="fw-bold" data-label="Number/ID">{item.title}</td>
                  <td data-label="Status/Info">{getStatusBadge(item.status || item.description)}</td>
                  <td className="text-end" data-label="Actions">
                    <ViewButton item={item} type={type} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableHeader>
        );
    }
  };

  const getTabIcon = (category) => {
    const icons = {
      exportInvoices: ClipboardCheck,
      proformaInvoices: Receipt,
      orders: Package,
      clients: Users,
      products: Box,
      leads: UserCheck,
      qcRecords: ShieldCheck,
      packingLists: Package,
      users: Users,
      suppliers: UserCheck,
      companies: Building2,
      catalogues: BookOpen,

      shippingInstructions: Ship,
      accountEntries: Calculator,
      annexure: FilePlus,
      vgm: Scale,
      invoiceBackside: FileStack,

      customsClearance: ShieldCheck,
      certificate: FilePlus
    };
    return icons[category] || FileText;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      exportInvoices: 'Export Invoices',
      proformaInvoices: 'Proforma Invoices',
      orders: 'Proforma Orders',
      clients: 'Clients',
      products: 'Products',
      leads: 'Leads',
      qcRecords: 'QC Records',
      packingLists: 'Packing Lists',
      suppliers: 'Suppliers',
      users: 'User Accounts',
      catalogues: 'Catalogues',

      shippingInstructions: 'Shipping Instructions',
      accountEntries: 'Account Entries',
      companies: 'Registered Companies',
      annexure: 'Export Annexures',
      vgm: 'VGM Documents',
      invoiceBackside: 'Invoice Backsides',

      customsClearance: 'Customs Clearances',
      certificate: 'Certificates'
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <Container fluid className="search-results-container py-4">
      {/* Premium Header */}
      <div className="search-header-card">
        <div className="search-header-content">
          <div className="d-flex align-items-center mb-4">
            <button className="back-button-premium border-0 me-4" onClick={onBack}>
              <ArrowLeft size={20} />
            </button>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white bg-opacity-25 p-2 rounded-3">
                <Search size={28} className="text-white" />
              </div>
              <div>
                <h1 className="h3 fw-bold mb-1 text-white">Search Intelligence</h1>
                <p className="mb-0 text-white text-opacity-75">
                  Discovery engine found <span className="fw-bold text-white">{getTotalResults()}</span> matches for <span className="px-2 py-1 bg-white text-primary fw-bold rounded ms-1">"{searchQuery}"</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Filter Navigation */}
      <div className="search-filter-pills">
        <button
          onClick={() => setActiveTab('all')}
          className={`filter-pill-premium ${activeTab === 'all' ? 'active' : ''}`}
        >
          <Layers size={16} />
          All Intelligence ({getTotalResults()})
        </button>
        {Object.entries(searchResults).map(([category, results]) => {
          const IconComponent = getTabIcon(category);
          const count = results.length;
          if (count === 0) return null;

          return (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`filter-pill-premium ${activeTab === category ? 'active' : ''}`}
            >
              <IconComponent size={16} />
              {getCategoryLabel(category)} ({count})
            </button>
          );
        })}
      </div>

      {/* Dynamic Results Grid */}
      <Row className="g-4">
        {activeTab === 'all' ? (
          Object.entries(searchResults).map(([category, results]) => {
            if (!results || results.length === 0) return null;
            const IconComponent = getTabIcon(category);
            return (
              <Col key={category} xs={12}>
                <Card className="result-category-card">
                  <div className="result-card-header-premium">
                    <h5>
                      <div className="category-icon-wrapper">
                        <IconComponent size={20} />
                      </div>
                      {getCategoryLabel(category)}
                    </h5>
                    <Badge bg="light" text="primary" className="rounded-pill px-3 py-2 border">
                      {results.length} Records Found
                    </Badge>
                  </div>
                  <Card.Body className="p-0">
                    {renderResultsTable(results, category)}
                  </Card.Body>
                  <div className="card-footer bg-white border-0 py-3 text-center border-top">
                    <button 
                      className="btn btn-link text-decoration-none text-primary fw-bold p-0 d-flex align-items-center gap-1 mx-auto"
                      onClick={() => setActiveTab(category)}
                    >
                      View all {getCategoryLabel(category)} <ChevronRight size={16} />
                    </button>
                  </div>
                </Card>
              </Col>
            );
          })
        ) : (
          <Col xs={12}>
            <Card className="result-category-card">
              <div className="result-card-header-premium">
                <h5>
                  <div className="category-icon-wrapper">
                    {(() => {
                      const IconComponent = getTabIcon(activeTab);
                      return <IconComponent size={20} />;
                    })()}
                  </div>
                  {getCategoryLabel(activeTab)} Results
                </h5>
                <Badge bg="primary" className="rounded-pill px-3 py-2">
                  {getResultCount(activeTab)} Matches
                </Badge>
              </div>
              <Card.Body className="p-0">
                {renderResultsTable(searchResults[activeTab], activeTab)}
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Elegant Empty State */}
      {getTotalResults() === 0 && (
        <div className="empty-state-premium mt-4">
          <div className="empty-icon-animated">
            <Search size={80} />
          </div>
          <h2 className="fw-bold text-dark mb-3">No matching records found</h2>
          <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '500px' }}>
            Our discovery engine couldn't find any data matching "<strong>{searchQuery}</strong>". 
            Try refining your search terms or exploring different categories.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Button variant="primary" onClick={onBack} className="rounded-pill px-4 py-2 fw-bold">
              Return to Dashboard
            </Button>
            <Button variant="outline-secondary" onClick={() => window.location.reload()} className="rounded-pill px-4 py-2 fw-bold">
              Refresh Search
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}

export default SearchResults;

