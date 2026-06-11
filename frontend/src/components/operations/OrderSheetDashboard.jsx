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

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Dropdown, Form, Collapse, Modal } from 'react-bootstrap';
import { 
  FileText, Search, Filter, Download, MoreVertical, 
  Factory, AlertTriangle, CheckCircle, Clock, Truck, Plus, CheckSquare, Layers, ChevronDown, ChevronRight, Box, Eye, FileSpreadsheet, Edit
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Button from '../shared/Button.jsx';
import '../shared/DashboardButtons.css';
import { UpdateProductionModal, FactoryAssignmentModal, CreateOrderSheetModal, EditOrderSheetModal } from './OrderSheetModals.jsx';
import LogProductionModal from './LogProductionModal.jsx';
import NotificationManager, { showSuccess, showError } from '../shared/NotificationManager.jsx';
import api from '../../services/api';
import OrderSheetPrintView from './OrderSheetPrintView.jsx';
import { downloadPDF } from '../../utils/pdfGenerator.js';
import DashboardStatusDropdown from '../shared/DashboardStatusDropdown.jsx';
import { useUserContext } from '../../contexts/UserContext.jsx';

const OrderSheetDashboard = () => {
  const { user: currentUser } = useUserContext();
  const [summary, setSummary] = useState({
    total_orders: 0,
    total_required_sqm: 0,
    total_produced_sqm: 0,
    total_pending_sqm: 0,
    completion_percentage: 0,
    pending_orders: 0,
    in_production_orders: 0,
    completed_orders: 0,
    qc_pending_sqm: 0,
    ready_for_packing_sqm: 0,
    loaded_containers: 0
  });

  const [orderSheets, setOrderSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  
  const [filters, setFilters] = useState({
    client_name: '',
    po_no: '',
    factory_name: '',
    product: '',
    size: '',
    surface: ''
  });
  const [filterOptions, setFilterOptions] = useState({ customers: [], pis: [], products: [], sizes: [], surfaces: [] });
  
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isFactoryModalOpen, setIsFactoryModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [availableFactories, setAvailableFactories] = useState([]);
  const printRef = React.useRef(null);

  useEffect(() => {
    fetchSummary();
    fetchFactories();
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/order-sheets/filters');
      const responseData = response.data?.data || response.data;
      if (responseData.customers) {
        setFilterOptions(responseData);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchFactories = async () => {
    try {
      const response = await api.get('/factory-master?limit=1000');
      const responseData = response.data?.data || response.data;
      setAvailableFactories(Array.isArray(responseData) ? responseData : []);
    } catch (error) {
      console.error('Error fetching factories:', error);
    }
  };

  const handleCreateSave = async (data) => {
    try {
      await api.post(`/order-sheets`, data);
      showSuccess('Master Order Sheet created successfully');
      setIsCreateModalOpen(false);
      fetchOrderSheets();
      fetchSummary();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to create order sheet');
    }
  };

  const handleUpdateSave = async (id, data) => {
    try {
      await api.put(`/order-sheets/${id}`, data);
      showSuccess('Production progress updated successfully');
      setIsUpdateModalOpen(false);
      fetchOrderSheets();
      fetchSummary();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update progress');
    }
  };

  const handleEditSave = async (id, data) => {
    try {
      await api.put(`/order-sheets/${id}`, data);
      showSuccess('Order sheet updated successfully');
      setIsEditModalOpen(false);
      fetchOrderSheets();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update order sheet');
    }
  };

  const handleFactorySave = async (id, data) => {
    try {
      await api.put(`/order-sheets/${id}`, data);
      showSuccess('Factory assignment saved successfully');
      setIsFactoryModalOpen(false);
      fetchOrderSheets();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save factory assignment');
    }
  };

  const handleInlineSheetUpdate = async (sheetId, field, value) => {
    try {
      await api.put(`/order-sheets/${sheetId}`, { [field]: value });
      fetchOrderSheets();
      showSuccess('Status updated');
    } catch (err) {
      showError('Failed to update status');
    }
  };

  const handleInlineLineUpdate = async (sheetId, lineId, field, value) => {
    try {
      await api.put(`/order-sheets/${sheetId}`, {
        lines: [{ id: lineId, [field]: value }]
      });
      fetchOrderSheets();
      showSuccess('Line updated');
    } catch (err) {
      showError('Failed to update line');
    }
  };

  const handleSyncLines = async (sheetId) => {
    try {
      const res = await api.post(`/order-sheets/${sheetId}/sync-lines`);
      showSuccess(res.data?.message || 'Product lines synced successfully');
      fetchOrderSheets();
      fetchSummary();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to sync product lines from PO');
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.client_name) params.append('client_name', filters.client_name);
      if (filters.po_no) params.append('po_no', filters.po_no);
      if (filters.factory_name) params.append('factory_name', filters.factory_name);
      if (filters.product) params.append('product', filters.product);
      if (filters.size) params.append('size', filters.size);
      if (filters.surface) params.append('surface', filters.surface);

      const response = await api.get(`/order-sheets/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'Master_Order_Sheet.xlsx';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch && fileNameMatch.length >= 2) {
          fileName = fileNameMatch[1];
        }
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      showError('Failed to download Excel file');
    }
  };

  const handleDownloadExcel = (sheet) => {
    try {
      const wb = XLSX.utils.book_new();
      
      const reqBoxes = parseFloat(sheet.total_required_boxes || sheet.totalRequiredBoxes || 0);
      const prodBoxes = parseFloat(sheet.total_produced_boxes || sheet.totalProducedBoxes || 0);

      const aoa = [
        ['MASTER ORDER SHEET'],
        [],
        ['Production Sheet No', sheet.production_sheet_no || sheet.productionSheetNo || '-', 'PO Reference', sheet.po_no || sheet.poNo || '-'],
        ['Customer', sheet.client_name || sheet.clientName || '-', 'Priority', sheet.priority || '-'],
        ['Booking Number', sheet.booking_number || sheet.bookingNumber || '-', 'Container No', sheet.container_no || sheet.containerNo || '-'],
        ['Shipment Date', sheet.shipment_date ? new Date(sheet.shipment_date).toLocaleDateString() : '-', 'Overall Status', sheet.status || 'Pending'],
        [],
        ['PRODUCTION SUMMARY'],
        ['Total Required Boxes', reqBoxes, 'Total Completed Boxes', prodBoxes, 'Pending Boxes', (reqBoxes - prodBoxes)],
        [],
        ['PRODUCT LINES BREAKDOWN'],
        ['Product Category', 'Size', 'Surface / Finish', 'Thickness', 'Req. Boxes', 'Completed', 'Pending', 'Assigned Factory', 'Production Status', 'QC Status']
      ];

      if (sheet.lines && sheet.lines.length > 0) {
        sheet.lines.forEach(line => {
          aoa.push([
            line.product_category || line.productCategory || 'Unknown',
            line.size || '-',
            line.surface || line.finish || '-',
            line.thickness || '-',
            line.total_production_boxes || line.totalProductionBoxes || line.totalBoxes || line.total_boxes || line.boxes || 0,
            line.production_completed_boxes || line.productionCompletedBoxes || 0,
            (line.total_production_boxes || line.totalProductionBoxes || 0) - (line.production_completed_boxes || line.productionCompletedBoxes || 0),
            line.factory_name || line.factoryName || 'Unassigned',
            line.production_status || line.productionStatus || line.status || 'Pending',
            line.qc_status || line.qcStatus || 'Pending'
          ]);
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      
      // Auto-size columns slightly for better readability
      const wscols = [
        { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }
      ];
      ws['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, ws, 'Master Order Sheet');

      XLSX.writeFile(wb, `Order_Sheet_${sheet.production_sheet_no || sheet.productionSheetNo}.xlsx`);
      showSuccess('Excel downloaded successfully');
    } catch (err) {
      console.error(err);
      showError('Failed to generate Excel');
    }
  };

  const handleDownloadPDF = async (sheet) => {
    try {
      setSelectedSheet(sheet);
      setTimeout(async () => {
        if (printRef.current) {
          const filename = `${sheet.production_sheet_no || sheet.productionSheetNo || 'MasterSheet'}.pdf`;
          await downloadPDF(printRef.current, filename);
          showSuccess('PDF downloaded successfully');
        }
      }, 300);
    } catch (err) {
      console.error(err);
      showError('Failed to generate PDF');
    }
  };

  const handleView = (sheet) => {
    setSelectedSheet(sheet);
    setIsViewModalOpen(true);
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/order-sheets/summary');
      const responseData = response.data?.data || response.data;
      setSummary(responseData || {});
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchOrderSheets = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ limit: 50 });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const response = await api.get(`/order-sheets?${queryParams.toString()}`);
      const responseData = response.data?.data || response.data;
      const items = responseData?.data || responseData?.items || responseData || [];
      setOrderSheets(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Error fetching order sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderSheets();
  }, [filters]);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredOrderSheets = orderSheets.filter(sheet => {
    if (!sheet.lines) return true;
    
    // Front-end filtering for line-level properties
    const hasMatchingFactory = filters.factory_name ? sheet.lines.some(l => filters.factory_name === 'unassigned' ? !(l.factory_name || l.factoryName) : (l.factory_name || l.factoryName) === filters.factory_name) : true;
    const hasMatchingProduct = filters.product ? sheet.lines.some(l => {
        const pCat = l.product_category || l.productCategory || 'Unknown Product';
        const des = l.design || '';
        const name = des ? `${pCat} - ${des}` : pCat;
        return name === filters.product;
    }) : true;
    const hasMatchingSize = filters.size ? sheet.lines.some(l => l.size === filters.size) : true;
    const hasMatchingSurface = filters.surface ? sheet.lines.some(l => (l.surface || l.finish) === filters.surface) : true;

    return hasMatchingFactory && hasMatchingProduct && hasMatchingSize && hasMatchingSurface;
  });

  // Calculate real-time dynamic summary based on currently filtered lines
  const dynamicSummary = {
    reqBoxes: 0,
    compBoxes: 0,
    pendBoxes: 0,
    qcApproved: 0
  };

  filteredOrderSheets.forEach(sheet => {
    let lines = sheet.lines || [];
    
    if (filters.factory_name) {
      lines = lines.filter(l => filters.factory_name === 'unassigned' ? !(l.factory_name || l.factoryName) : (l.factory_name || l.factoryName) === filters.factory_name);
    }
    if (filters.product) {
      lines = lines.filter(l => {
        const pCat = l.product_category || l.productCategory || 'Unknown Product';
        const des = l.design || '';
        const name = des ? `${pCat} - ${des}` : pCat;
        return name === filters.product;
      });
    }
    if (filters.size) {
      lines = lines.filter(l => l.size === filters.size);
    }
    if (filters.surface) {
      lines = lines.filter(l => (l.surface || l.finish) === filters.surface);
    }

    lines.forEach(l => {
      const rBoxes = parseFloat(l.total_production_boxes || l.totalProductionBoxes || 0);
      const cBoxes = parseFloat(l.production_completed_boxes || l.productionCompletedBoxes || 0);
      const qcBoxes = parseFloat(l.qc_approved_boxes || l.qcApprovedBoxes || 0);
      
      dynamicSummary.reqBoxes += rBoxes;
      dynamicSummary.compBoxes += cBoxes;
      dynamicSummary.pendBoxes += Math.max(0, rBoxes - cBoxes);
      dynamicSummary.qcApproved += qcBoxes;
    });
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return <Badge bg="danger">Pending</Badge>;
      case 'In Production': return <Badge bg="warning" text="dark">In Prod</Badge>;
      case 'Ready For QC': return <Badge bg="info">QC Ready</Badge>;
      case 'Completed': return <Badge bg="success">Completed</Badge>;
      case 'Ready For Packing': return <Badge bg="primary">Pack Ready</Badge>;
      default: return <Badge bg="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const handleDownloadFactorySheet = async () => {
    try {
      const response = await api.get('/order-sheets/export-factory', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factory_Assignment_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError('Network error during export');
    }
  };

  return (
    <>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0 fw-bold text-dark">Order Sheet</h2>
          <p className="text-muted small">
            Master Order Sheets tracking POs, Factory Allocation, and Container Loading
          </p>
        </Col>
      </Row>

      <Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">
        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-primary-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <Box size={18} className="text-primary" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Req. Boxes</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dynamicSummary.reqBoxes.toLocaleString()}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-info-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <CheckSquare size={18} className="text-info" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Completed Boxes</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dynamicSummary.compBoxes.toLocaleString()}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-danger flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px', '--bs-bg-opacity': 0.1 }}>
                <AlertTriangle size={18} className="text-danger" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>Pending Boxes</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dynamicSummary.pendBoxes.toLocaleString()}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-success-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <CheckCircle size={18} className="text-success" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>QC Status</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>{dynamicSummary.qcApproved.toLocaleString()}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-primary text-white d-flex flex-row justify-content-between align-items-center p-3 border-0">
          <h5 className="mb-0 fw-bold text-nowrap me-2">Master Order Sheets</h5>
          <div className="d-flex gap-2 flex-nowrap align-items-center">

            <Button
              variant="outline-light"
              size="sm"
              onClick={handleExportExcel}
              className="border-white text-white d-flex align-items-center flex-shrink-0 mx-1"
              style={{ width: 'auto' }}
            >
              <FileSpreadsheet size={14} className="me-1" />
              <span className="d-none d-md-inline small">Export Excel</span>
            </Button>
            <Button 
              variant="light" 
              size="sm" 
              className="text-primary fw-bold d-flex align-items-center flex-shrink-0" 
              onClick={() => setIsCreateModalOpen(true)} 
              style={{ width: 'auto' }}
            >
              <Plus size={16} className="me-1" />
              <span className="d-none d-sm-inline small">Create Master Sheet</span>
              <span className="d-sm-none small">Create</span>
            </Button>
          </div>
        </Card.Header>
        
        <div className="bg-white p-3 border-bottom shadow-sm">
          <Row className="g-3 align-items-center">
            <Col md={2}>
              <div className="d-flex flex-column">
                <Form.Label className="small fw-bold text-dark mb-1">Customer</Form.Label>
                <Form.Select value={filters.client_name} onChange={(e) => setFilters({ ...filters, client_name: e.target.value })} size="sm" className="cursor-pointer shadow-none">
                  <option value="">All Customers</option>
                  {filterOptions.customers.map(c => <option key={c} value={c}>{c}</option>)}
                </Form.Select>
              </div>
            </Col>
            <Col md={2}>
              <div className="d-flex flex-column">
                <Form.Label className="small fw-bold text-dark mb-1">PI No.</Form.Label>
                <Form.Select value={filters.po_no} onChange={(e) => setFilters({ ...filters, po_no: e.target.value })} size="sm" className="cursor-pointer shadow-none">
                  <option value="">All PI Numbers</option>
                  {filterOptions.pis.map(p => <option key={p} value={p}>{p}</option>)}
                </Form.Select>
              </div>
            </Col>
            <Col md={2}>
              <div className="d-flex flex-column">
                <Form.Label className="small fw-bold text-dark mb-1">Assigned Factory</Form.Label>
                <Form.Select value={filters.factory_name} onChange={(e) => setFilters({ ...filters, factory_name: e.target.value })} size="sm" className="cursor-pointer shadow-none">
                  <option value="">All Factories</option>
                  <option value="unassigned">Unassigned</option>
                  {availableFactories.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </Form.Select>
              </div>
            </Col>
            <Col md={2}>
              <div className="d-flex flex-column">
                <Form.Label className="small fw-bold text-dark mb-1">Product / Design</Form.Label>
                <Form.Select value={filters.product} onChange={(e) => setFilters({ ...filters, product: e.target.value })} size="sm" className="cursor-pointer shadow-none">
                  <option value="">All Products</option>
                  {filterOptions.products.map(p => <option key={p} value={p}>{p}</option>)}
                </Form.Select>
              </div>
            </Col>
            <Col md={2}>
              <div className="d-flex flex-column">
                <Form.Label className="small fw-bold text-dark mb-1">Size</Form.Label>
                <Form.Select value={filters.size} onChange={(e) => setFilters({ ...filters, size: e.target.value })} size="sm" className="cursor-pointer shadow-none">
                  <option value="">All Sizes</option>
                  {filterOptions.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                </Form.Select>
              </div>
            </Col>
            <Col md={2}>
              <div className="d-flex flex-column">
                <Form.Label className="small fw-bold text-dark mb-1">Surface</Form.Label>
                <Form.Select value={filters.surface} onChange={(e) => setFilters({ ...filters, surface: e.target.value })} size="sm" className="cursor-pointer shadow-none">
                  <option value="">All Surfaces</option>
                  {filterOptions.surfaces.map(s => <option key={s} value={s}>{s}</option>)}
                </Form.Select>
              </div>
            </Col>
          </Row>
        </div>
        
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0" style={{ fontSize: '0.9rem' }}>
              <thead className="bg-light text-secondary">
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th className="fw-bold py-3 text-center">Status</th>
                  <th className="fw-bold py-3">Order Sheet</th>
                  <th className="fw-bold py-3">PO Reference</th>
                  <th className="fw-bold py-3">PI No.</th>
                  <th className="fw-bold py-3">Customer</th>
                  <th className="fw-bold py-3 text-end">Total Boxes</th>
                  <th className="fw-bold py-3 text-end">Production Complete</th>
                  <th className="fw-bold py-3 text-end">Production Pending</th>
                  <th className="fw-bold py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" />
                      Loading Master Sheets...
                    </td>
                  </tr>
                ) : filteredOrderSheets.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      No Master Order Sheets found.
                    </td>
                  </tr>
                ) : (
                  filteredOrderSheets.map((sheet) => {
                    const isExpanded = expandedRows[sheet.id];
                    let lines = sheet.lines || [];
                    
                    if (filters.factory_name) {
                      lines = lines.filter(l => filters.factory_name === 'unassigned' ? !(l.factory_name || l.factoryName) : (l.factory_name || l.factoryName) === filters.factory_name);
                    }
                    if (filters.product) {
                      lines = lines.filter(l => {
                        const pCat = l.product_category || l.productCategory || 'Unknown Product';
                        const des = l.design || '';
                        const name = des ? `${pCat} - ${des}` : pCat;
                        return name === filters.product;
                      });
                    }
                    if (filters.size) {
                      lines = lines.filter(l => l.size === filters.size);
                    }
                    if (filters.surface) {
                      lines = lines.filter(l => (l.surface || l.finish) === filters.surface);
                    }
                    const reqBoxes = parseFloat(sheet.total_required_boxes || sheet.totalRequiredBoxes || 0);
                    const prodBoxes = parseFloat(sheet.total_produced_boxes || sheet.totalProducedBoxes || 0);
                    
                    return (
                      <React.Fragment key={sheet.id || sheet._id}>
                        <tr className={`bg-white ${isExpanded ? 'border-bottom-0' : ''}`}>
                          <td data-label="" className="text-center">
                            <button 
                              className="btn btn-sm btn-link text-dark p-0 shadow-none" 
                              onClick={() => toggleRow(sheet.id || sheet._id)}
                            >
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                          </td>
                          <td data-label="Status" className="text-center">
                            <DashboardStatusDropdown 
                                module="ORDER_SHEET" 
                                endpoint="order-sheets" 
                                documentId={sheet.id || sheet._id} 
                                value={sheet.status || 'Pending'} 
                                onSuccess={fetchOrderSheets} 
                                disabled={!['super_admin', 'company_admin', 'qc_management', 'qc_inspector', 'sales_manager', 'purchase_manager'].includes(currentUser?.role)} 
                            />
                          </td>
                          <td data-label="Order Sheet" className="fw-bold text-primary">{sheet.production_sheet_no || sheet.productionSheetNo}</td>
                          <td data-label="PO Reference" className="fw-medium">{sheet.po_no || sheet.poNo}</td>
                          <td data-label="PI No." className="fw-medium text-muted">{sheet.pi_reference || sheet.piReference || '-'}</td>
                          <td data-label="Customer" className="fw-bold">{sheet.client_name || sheet.clientName}</td>
                          <td data-label="Total Boxes" className="text-end fw-bold">{reqBoxes.toLocaleString()}</td>
                          <td data-label="Prod. Complete" className="text-end fw-medium text-success">{prodBoxes.toLocaleString()}</td>
                          <td data-label="Prod. Pending" className="text-end fw-medium text-danger">{(reqBoxes - prodBoxes).toLocaleString()}</td>
                          <td data-label="Actions" className="text-center">
                            <div className="d-flex align-items-center justify-content-center gap-2">
                              <Button variant="light" size="sm" className="text-primary p-1 border-0" onClick={() => handleView(sheet)} title="View Details" style={{ backgroundColor: 'transparent' }}>
                                <Eye size={16} />
                              </Button>
                              <Button variant="light" size="sm" className="text-warning p-1 border-0" onClick={() => { setSelectedSheet(sheet); setIsEditModalOpen(true); }} title="Edit Details" style={{ backgroundColor: 'transparent' }}>
                                <Edit size={16} />
                              </Button>
                              <Button variant="light" size="sm" className="text-success p-1 border-0" onClick={() => handleDownloadExcel(sheet)} title="Download Excel" style={{ backgroundColor: 'transparent' }}>
                                <FileSpreadsheet size={16} />
                              </Button>
                              <Button variant="light" size="sm" className="text-danger p-1 border-0" onClick={() => handleDownloadPDF(sheet)} title="Download PDF" style={{ backgroundColor: 'transparent' }}>
                                <Download size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Nested Product Lines Table */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="10" className="p-0 border-top-0">
                              <div className="bg-light p-3 border-bottom shadow-inner" style={{ boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.05)' }}>
                                <h6 className="small fw-bold text-muted text-uppercase mb-3 d-flex align-items-center">
                                  <Box size={14} className="me-2" /> Product Lines Breakdown
                                </h6>
                                <div className="table-responsive">
                                  <Table size="sm" bordered hover className="mb-0 bg-white shadow-sm" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                    <thead className="bg-secondary bg-opacity-10">
                                      <tr>
                                        <th className="text-muted">Assigned Factory</th>
                                        <th className="text-muted">Product / Design</th>
                                        <th className="text-muted">Category</th>
                                        <th className="text-muted">Size</th>
                                        <th className="text-muted">Surface</th>
                                        <th className="text-muted text-end">Req. Boxes</th>
                                        <th className="text-muted text-end">Completed Boxes</th>
                                        <th className="text-muted text-end">Pending Boxes</th>
                                        <th className="text-muted">Prod Status</th>
                                        <th className="text-muted">QC Status</th>
                                        <th className="text-muted text-center">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lines.map((line, idx) => {
                                        const productCategory = line.product_category || line.productCategory || 'Unknown Product';
                                        const design = line.design || '';
                                        const factoryName = line.factory_name || line.factoryName;
                                        const reqBoxes = parseFloat(line.total_production_boxes || line.totalProductionBoxes || 0);
                                        const completedBoxes = parseFloat(line.production_completed_boxes || line.productionCompletedBoxes || 0);
                                        return (
                                        <tr key={line.id || idx}>
                                          <td data-label="Factory">
                                            <div>
                                              <Dropdown>
                                                <Dropdown.Toggle as="div" className={`badge rounded-pill cursor-pointer hide-caret ${factoryName ? 'bg-info' : 'bg-secondary bg-opacity-50 text-dark fst-italic'}`} style={{ cursor: 'pointer', padding: '5px 10px', fontSize: '11px', display: 'inline-block' }}>
                                                  {factoryName || 'Unassigned'}
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu renderOnMount={true} popperConfig={{ strategy: 'fixed' }} className="shadow-sm border-0" style={{ fontSize: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                                                  <Dropdown.Item onClick={() => handleInlineLineUpdate(sheet.id || sheet._id, line.id, 'factory_id', null)}>-- Unassigned --</Dropdown.Item>
                                                  {availableFactories.map(f => (
                                                    <Dropdown.Item key={f.id} onClick={() => handleInlineLineUpdate(sheet.id || sheet._id, line.id, 'factory_id', f.id)}>{f.name}</Dropdown.Item>
                                                  ))}
                                                </Dropdown.Menu>
                                              </Dropdown>
                                            </div>
                                          </td>
                                          <td data-label="Product" className="fw-medium text-dark">{design ? `${productCategory} - ${design}` : productCategory}</td>
                                          <td data-label="Category">{line.tile_category || line.tileCategory || line.category || '-'}</td>
                                          <td data-label="Size">{line.size}</td>
                                          <td data-label="Finish">{line.surface || line.finish || '-'}</td>
                                          <td data-label="Req. Qty" className="text-end fw-bold">{reqBoxes.toLocaleString()}</td>
                                          <td data-label="Produced" className="text-end text-success fw-medium">{completedBoxes.toLocaleString()}</td>
                                          <td data-label="Pending" className="text-end text-danger fw-medium">{(reqBoxes - completedBoxes).toLocaleString()}</td>
                                          <td data-label="Prod. Status">
                                            <div>{getStatusBadge(line.production_status || line.productionStatus || line.status)}</div>
                                          </td>
                                          <td data-label="QC Status">
                                            <div>
                                              <Dropdown>
                                                <Dropdown.Toggle as="div" className="badge rounded-pill cursor-pointer hide-caret" style={{ 
                                                  cursor: 'pointer',
                                                  padding: '5px 10px', fontSize: '11px', display: 'inline-block',
                                                  backgroundColor: (line.qc_status || line.qcStatus) === 'Complete' ? '#e8f5e9' : '#ffebee',
                                                  color: (line.qc_status || line.qcStatus) === 'Complete' ? '#2e7d32' : '#c62828'
                                                }}>
                                                  {line.qc_status || line.qcStatus || 'Pending'}
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu renderOnMount={true} popperConfig={{ strategy: 'fixed' }} className="shadow-sm border-0" style={{ fontSize: '12px', minWidth: '120px' }}>
                                                  <Dropdown.Item onClick={() => handleInlineLineUpdate(sheet.id || sheet._id, line.id, 'qc_status', 'Pending')}>Pending</Dropdown.Item>
                                                  <Dropdown.Item onClick={() => handleInlineLineUpdate(sheet.id || sheet._id, line.id, 'qc_status', 'Complete')}>Complete</Dropdown.Item>
                                                </Dropdown.Menu>
                                              </Dropdown>
                                            </div>
                                          </td>
                                          <td data-label="Actions" className="text-center">
                                            <div>
                                              <Button size="sm" variant="light" className="text-primary border-0 p-1" onClick={() => { setSelectedSheet(sheet); setSelectedLine(line); setLogModalOpen(true); }} title="Log Production" style={{ backgroundColor: 'transparent' }}>
                                                <FileText size={16} />
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      )})}
                                        {lines.length === 0 && (
                                          <tr>
                                            <td colSpan="11" className="text-center text-muted py-3">
                                              <div className="d-flex flex-column align-items-center gap-2">
                                                <span className="small">No product lines found for this sheet.</span>
                                                <button
                                                  className="btn btn-sm btn-outline-primary"
                                                  style={{ fontSize: '0.75rem' }}
                                                  onClick={() => handleSyncLines(sheet.id || sheet._id)}
                                                  title="Pull product lines from the linked Proforma Order"
                                                >
                                                  🔄 Sync Lines from PO
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                    </tbody>
                                  </Table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <UpdateProductionModal 
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        sheet={selectedSheet}
        onSave={handleUpdateSave}
      />

      <FactoryAssignmentModal
        isOpen={isFactoryModalOpen}
        onClose={() => setIsFactoryModalOpen(false)}
        sheet={selectedSheet}
        availableFactories={availableFactories}
        onSave={handleFactorySave}
      />

      <CreateOrderSheetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateSave}
        availableFactories={availableFactories}
      />

      <EditOrderSheetModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        sheet={selectedSheet}
        onSave={handleEditSave}
      />

      {selectedSheet && selectedLine && (
        <LogProductionModal 
          isOpen={logModalOpen} 
          onClose={() => { setLogModalOpen(false); fetchOrderSheets(); fetchSummary(); }} 
          sheetId={selectedSheet.id || selectedSheet._id} 
          line={selectedLine} 
        />
      )}

      {/* Hidden Print View for Download */}
      <div style={{ display: 'none' }}>
        <OrderSheetPrintView ref={printRef} sheet={selectedSheet} />
      </div>

      {/* View Modal */}
      <Modal show={isViewModalOpen} onHide={() => setIsViewModalOpen(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="h5 fw-bold mb-0">View Master Order Sheet</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 bg-light">
          <div className="shadow-sm m-4 rounded overflow-hidden" style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '800px', backgroundColor: '#fff' }}>
              <OrderSheetPrintView sheet={selectedSheet} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button variant="outline-secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          <Button variant="primary" onClick={() => handleDownloadPDF(selectedSheet)} className="d-flex align-items-center">
            <Download size={16} className="me-2" />
            Download PDF
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default OrderSheetDashboard;
