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
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Card,
  Table,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { Save, X, Upload, Package, RotateCcw, History, Info, Edit, Check } from 'lucide-react';
import QCMediaUpload from '../shared/QCMediaUpload.jsx';
import { FIELD_PLACEHOLDERS } from '../../config/fieldPlaceholders.js';
import { scrollToFirstError } from '../../utils/validationUIHelper.js';
// Removed useOrders

import { useProducts } from '../../hooks/useProducts.js';
import { useUsers } from '../../hooks/useUsers.js';
import { showSuccess, showError, showWarning } from '../shared/NotificationManager.jsx';
import ValidationErrorModal from '../shared/ValidationErrorModal.jsx';
import { workflowConnections } from '../../utils/helpers.jsx';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import ModuleAuditLog from '../shared/ModuleAuditLog.jsx';
import masterDataService from '../../services/masterDataService.js';
import { formatDateForInput, formatDisplayDate } from '../../utils/formatters.js';
import { useUserContext } from '../../contexts/UserContext.jsx';
import { resolveImageUrl } from '../../utils/urlHelper.js';
import api from '../../services/api.js';

function QCForm({ qcRecord, onSave, onCancel, onBack, selectedOrder, existingRecords = [] }) {
  const [orderSheets, setOrderSheets] = useState([]);
  const [allOrderSheets, setAllOrderSheets] = useState([]);

  useEffect(() => {
    const fetchOrderSheets = async () => {
      try {
        const res = await api.get('/order-sheets?limit=500');
        const responseData = res.data?.data || res.data;
        let items = responseData?.data || responseData?.items || responseData || [];
        if (!Array.isArray(items)) items = [];
        
        setAllOrderSheets(items);

        // Only allow QC on completed production, and filter out those that already have a QC record
        // (unless we are editing the existing QC record for that sheet)
        setOrderSheets(items.filter(os => {
          if (!os.status || os.status.toLowerCase() !== 'complete') return false;

          const sheetNo = os.productionSheetNo || os.production_sheet_no;
          const isAlreadyInspected = existingRecords.some(r => r.orderNumber === sheetNo);

          // Allow it if it's not inspected yet, or if we are currently editing it
          return !isAlreadyInspected || (qcRecord && qcRecord.orderNumber === sheetNo);
        }));
      } catch (err) {
        console.error('Failed to fetch order sheets', err);
      }
    };
    fetchOrderSheets();
  }, [existingRecords, qcRecord]);

  // Sync missing total boxes for old records once order sheets are loaded
  useEffect(() => {
    if (qcRecord && allOrderSheets.length > 0 && formData.productLines.length > 0) {
      const orderNumStr = String(formData.orderNumber || '').trim().toLowerCase();
      const matchedSheet = allOrderSheets.find(s => 
        String(s.productionSheetNo || s.production_sheet_no || '').trim().toLowerCase() === orderNumStr
      );

      if (matchedSheet && matchedSheet.lines) {
        setFormData(prev => {
          let updated = false;
          const newLines = prev.productLines.map(product => {
            if (product.totalBoxes && String(product.totalBoxes) !== '0') return product;

            const liveLine = matchedSheet.lines.find(l => {
              const pCat = String(l.productCategory || l.product_category || '').trim().toLowerCase();
              const targetCat = String(product.product || '').trim().toLowerCase();
              const lSize = String(l.size || '').trim().toLowerCase().replace(/\s/g, '');
              const targetSize = String(product.size || '').trim().toLowerCase().replace(/\s/g, '');
              return pCat === targetCat && lSize === targetSize;
            }) || matchedSheet.lines.find(l => {
              const pCat = String(l.productCategory || l.product_category || '').trim().toLowerCase();
              const targetCat = String(product.product || '').trim().toLowerCase();
              return pCat === targetCat;
            });

            if (liveLine) {
              const tb = (liveLine.boxes_required || liveLine.total_production_boxes || 0).toString();
              if (tb && tb !== '0') {
                updated = true;
                return { ...product, totalBoxes: tb };
              }
            }
            return product;
          });
          
          if (updated) return { ...prev, productLines: newLines };
          return prev;
        });
      }
    }
  }, [allOrderSheets, qcRecord, formData.orderNumber]);

  const { products } = useProducts();
  const [masterData, setMasterData] = useState({
    boxTypeObjects: []
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const boxTypes = await masterDataService.getAllBoxTypes();
        setMasterData(prev => ({
          ...prev,
          boxTypeObjects: boxTypes || []
        }));
      } catch (error) {
        console.error('Failed to fetch master data:', error);
      }
    };
    fetchMasterData();
  }, []);
  const { users } = useUsers();
  const { user: currentUser } = useUserContext();
  const { getNextQCNumber } = useDocumentNumber();

  const [formData, setFormData] = useState({
    qcId: '',
    orderId: '',
    orderNumber: '',
    clientName: '',
    productName: '',
    productLines: [],
    qcStatus: 'Pending',
    inspectorId: currentUser?.id || '',
    qcDate: new Date().toLocaleDateString('en-CA'),
    overallGrade: '',
    notes: '',
    inspectionDetails: qcRecord?.inspectionDetails || {
      dimensionalCheck: '',
      surfaceQuality: '',
      colorConsistency: '',
      packagingCondition: '',
    },
    inspectionMedia: qcRecord?.inspectionMedia || {
      onlineChecking: { images: [], videos: [] },
      flooring: { images: [], videos: [] },
      joint: { images: [], videos: [] },
      curvature: { images: [], videos: [] },
      thickness: { images: [], videos: [] },
      glossy: { images: [], videos: [] },
      lValue: { images: [], videos: [] },
      boxWeight: { images: [], videos: [] },
      palletPacking: { images: [], videos: [] },
      mor: { images: [], videos: [] },
    },
  });

  // Fetch next QC ID for new records
  useEffect(() => {
    if (!qcRecord) {
      const fetchNextId = async () => {
        const nextId = await getNextQCNumber();
        setFormData(prev => ({ ...prev, qcId: nextId }));
      };
      fetchNextId();
    }
  }, [qcRecord, getNextQCNumber]);

  // Set default inspector to current user for new records
  useEffect(() => {
    if (!qcRecord && currentUser?.id) {
      setFormData(prev => {
        if (!prev.inspectorId) {
          return { ...prev, inspectorId: currentUser.id };
        }
        return prev;
      });
    }
  }, [currentUser, qcRecord]);

  const [errors, setErrors] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const qcStatuses = [
    'Pending',
    'Passed',
    'Failed',
    'Under Process',
    'Re-inspection Required',
  ];
  const gradeOptions = ['A+', 'A', 'B+', 'B', 'C', 'Reject'];

  // Handle pre-selected order from props
  useEffect(() => {
    if (selectedOrder && !qcRecord) {
      const sheetNum = selectedOrder.production_sheet_no || selectedOrder.orderNo || selectedOrder.order_no;
      handleOrderChange(sheetNum, selectedOrder);
    }
  }, [selectedOrder, qcRecord]);

  useEffect(() => {
    if (qcRecord) {
      setFormData({
        qcId: qcRecord.qcId || '',
        orderId: qcRecord.orderId || '',
        orderNumber: qcRecord.orderNumber || '',
        clientName: qcRecord.clientName || '',
        productName: qcRecord.productName || '',
        productLines: qcRecord.productLines || [],
        qcStatus: qcRecord.qcStatus || 'Pending',
        inspectorId: qcRecord.inspectorId || qcRecord.inspector_id || '',
        qcDate: formatDateForInput(qcRecord.qcDate),
        overallGrade: qcRecord.overallGrade || '',
        notes: qcRecord.notes || '',
        inspectionDetails: qcRecord.inspectionDetails || {
          dimensionalCheck: '',
          surfaceQuality: '',
          colorConsistency: '',
          packagingCondition: '',
        },
        inspectionMedia: qcRecord.inspectionMedia || {
          onlineChecking: { images: [], videos: [] },
          flooring: { images: [], videos: [] },
          joint: { images: [], videos: [] },
          curvature: { images: [], videos: [] },
          thickness: { images: [], videos: [] },
          glossy: { images: [], videos: [] },
          lValue: { images: [], videos: [] },
          boxWeight: { images: [], videos: [] },
          palletPacking: { images: [], videos: [] },
          mor: { images: [], videos: [] },
        },
      });
    }
  }, [qcRecord]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleInspectionDetailChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      inspectionDetails: {
        ...prev.inspectionDetails,
        [field]: value,
      },
    }));
  };

  const handleOrderChange = async (sheetNumber, preloadedSheet = null) => {
    let selectedSheet = preloadedSheet;

    if (!selectedSheet && orderSheets && orderSheets.length > 0) {
      selectedSheet = orderSheets.find(
        (sheet) => ((sheet.productionSheetNo || sheet.production_sheet_no) === sheetNumber)
      );
    }

    if (sheetNumber && !selectedSheet) {
      try {
        const response = await api.get(`/order-sheets?search=${sheetNumber}`);
        if (response.data && response.data.data && response.data.data.items) {
          selectedSheet = response.data.data.items[0];
        }
      } catch (err) {
        console.error('Failed to fetch order sheet details:', err);
      }
    }

    if (selectedSheet) {
      const supplierName = selectedSheet.clientName || selectedSheet.client_name || selectedSheet.supplierName || selectedSheet.supplier_name || '';

      let productLines = [];
      if (selectedSheet.lines && selectedSheet.lines.length > 0) {
        productLines = selectedSheet.lines.map(line => ({
          product: line.productCategory || line.product_category || 'N/A',
          category: line.tile_category || line.tileCategory || line.category || 'N/A',
          size: line.size || 'N/A',
          surface: line.surface || line.finish || 'N/A',
          design: line.design || 'N/A',
          thickness: line.thickness || 'N/A',
          requiredSqm: (line.requiredSqm || line.required_sqm || 0).toString(),
          producedSqm: (line.producedSqm || line.produced_sqm || 0).toString(),
          totalBoxes: (line.boxes_required || line.total_production_boxes || line.totalBoxes || line.total_boxes || line.boxes || 0).toString(),
          boxType: selectedSheet.box_type || selectedSheet.boxType || line.boxType || line.box_type || 'N/A'
        }));
      } else {
        productLines = [{
          product: 'N/A',
          category: 'N/A',
          size: 'N/A',
          surface: 'N/A',
          design: 'N/A',
          thickness: 'N/A',
          requiredSqm: '0',
          producedSqm: '0',
          totalBoxes: '0',
          boxType: 'N/A'
        }];
      }

      const productName = productLines.map(p => p.product).filter(p => p !== 'N/A').join(', ') || '';

      setFormData((prev) => ({
        ...prev,
        orderId: selectedSheet.id || prev.orderId,
        orderNumber: sheetNumber,
        clientName: supplierName,
        productName: productName,
        productLines: productLines,
      }));
    } else {
      handleInputChange('orderNumber', sheetNumber);
    }
  };

  const handleInspectionMediaChange = (section, type, files) => {
    setFormData((prev) => ({
      ...prev,
      inspectionMedia: {
        ...prev.inspectionMedia,
        [section]: {
          ...prev.inspectionMedia[section],
          [type]: files,
        },
      },
    }));
  };

  const getTotalMediaCount = () => {
    let total = 0;
    if (formData.inspectionMedia) {
      Object.values(formData.inspectionMedia).forEach((section) => {
        if (section) {
          total += (section.images?.length || 0) + (section.videos?.length || 0);
        }
      });
    }
    return total;
  };

  const getProductImage = (productName) => {
    const product = (products || []).find((p) => p.name === productName);
    if (product && product.images && product.images.length > 0) {
      return resolveImageUrl(product.images[0].url);
    }
    return null;
  };

  const validateMediaRequirements = () => {
    // Media is now optional for all sections
    return true;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.orderNumber) {
      newErrors.orderNumber = 'Order number is required';
    }

    if (!formData.clientName || !formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.productLines || formData.productLines.length === 0) {
      newErrors.productLines = 'No products found in selected order';
    }

    if (!formData.qcDate) {
      newErrors.qcDate = 'QC date is required';
    }

    if (getTotalMediaCount() > 500) {
      newErrors.mediaLimit = 'Maximum 500 images and videos allowed in total';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    return Boolean(
      formData.orderNumber &&
      formData.qcDate &&
      formData.clientName &&
      formData.productLines &&
      formData.productLines.length > 0
    );
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!isFormValid()) {
      showWarning('Please fill all mandatory fields (Order, Client, Date, and Products)');
      validateForm(); // This will highlight the errors
      return;
    }

    if (!validateForm()) {
      scrollToFirstError();
      setShowErrorModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const finalQCStatus = formData.qcStatus;
      const qcId = qcRecord ? qcRecord.qcId : (formData.qcId || '');

      const matchedSheet = orderSheets.find(
        (s) => (s.productionSheetNo || s.production_sheet_no) === formData.orderNumber
      );
      const sheetBoxType = matchedSheet?.boxType || matchedSheet?.box_type || null;
      const enrichedProductLines = (formData.productLines || []).map((line) => {
        const current = line.boxType || line.box_type;
        const boxType = (current && current !== 'N/A') ? current : (sheetBoxType || current || null);
        return boxType ? { ...line, boxType, box_type: boxType } : line;
      });

      const qcData = {
        ...formData,
        productLines: enrichedProductLines,
        boxType: sheetBoxType || enrichedProductLines.find((l) => l.boxType)?.boxType || null,
        qcStatus: finalQCStatus,
        totalMediaCount: getTotalMediaCount(),
        qcId,
      };

      // Update workflow status when QC is completed
      if (finalQCStatus === 'Passed') {
        // Safety check for workflowConnections utility
        const workflowUtil = workflowConnections || (typeof window !== 'undefined' && window.workflowConnections);
        if (workflowUtil && typeof workflowUtil.updateLinkedStatus === 'function') {
          workflowUtil.updateLinkedStatus(
            formData.orderNumber,
            'Passed'
          );
        }
      }

      await onSave(qcData);
    } catch (error) {
      console.error('Save error in form:', error);
      showError('Failed to save QC record: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (onBack) onBack();
  };

  return (
    <Modal show={true} onHide={handleCancel} fullscreen backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          {qcRecord ? 'Edit QC Record' : 'Create QC Record'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <div className="d-flex justify-content-end mb-3">
            <Button variant="secondary" type="button" onClick={handleCancel}>
              <X size={16} className="me-1" />
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSaving}
              title={!isFormValid() ? 'Please select an Order and ensure Products are loaded' : ''}
            >
              {isSaving ? (
                <>
                  <RotateCcw size={16} className="me-1 spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} className="me-1" />
                  {qcRecord ? 'Update QC Record' : 'Save QC Record'}
                </>
              )}
            </Button>
          </div>
          <Row className="g-4">
            {/* Basic Information */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Basic Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Order Number is mandatory.</Tooltip>}>
                          <Form.Label className="fw-bold text-danger" style={{ cursor: 'help' }}>
                            Order Number * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Select
                          value={formData.orderNumber}
                          onChange={(e) => handleOrderChange(e.target.value)}
                          isInvalid={!!errors.orderNumber}
                        >
                          <option value="">Select Order Sheet</option>
                          {(orderSheets || [])
                            .map((sheet) => {
                              const sheetNo = sheet.productionSheetNo || sheet.production_sheet_no;
                              const client = sheet.clientName || sheet.client_name || sheet.supplierName || sheet.supplier_name;
                              return (
                                <option key={sheet.id} value={sheetNo}>
                                  {sheetNo}
                                  {client ? ` (${client})` : ''}
                                </option>
                              );
                            })}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.orderNumber}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>QC Date is mandatory.</Tooltip>}>
                          <Form.Label className="fw-bold text-danger" style={{ cursor: 'help' }}>
                            QC Date * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="date"
                          value={formData.qcDate}
                          onChange={(e) =>
                            handleInputChange('qcDate', e.target.value)
                          }
                          isInvalid={!!errors.qcDate}
                          placeholder={FIELD_PLACEHOLDERS.date.placeholder}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.qcDate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Supplier Name is mandatory.</Tooltip>}>
                          <Form.Label className="fw-bold text-danger" style={{ cursor: 'help' }}>
                            Supplier Name * <Info size={12} className="ms-1" />
                          </Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                          type="text"
                          value={formData.clientName}
                          onChange={(e) =>
                            handleInputChange('clientName', e.target.value)
                          }
                          isInvalid={!!errors.clientName}
                          placeholder="Enter supplier name"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.clientName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Products from Order</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={formData.productName}
                          readOnly
                          className="bg-light"
                          placeholder="Products will appear when order is selected"
                        />
                        {!formData.productLines || formData.productLines.length === 0 ? (
                          <small className="text-danger">No products loaded for this order</small>
                        ) : null}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>QC Status</Form.Label>
                        <Form.Select
                          value={formData.qcStatus}
                          onChange={(e) =>
                            handleInputChange('qcStatus', e.target.value)
                          }
                        >
                          {qcStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Assigned QC Person</Form.Label>
                        <Form.Select
                          value={formData.inspectorId}
                          onChange={(e) =>
                            handleInputChange('inspectorId', e.target.value)
                          }
                        >
                          <option value="">Select QC Person</option>
                          {(users || [])
                            .filter(u => ['qc', 'qc_inspector', 'company_admin', 'super_admin'].includes(u.role?.toLowerCase()))
                            .map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.role})
                              </option>
                            ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Inspection Details */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Inspection Details</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Dimensional Check</Form.Label>
                        <Form.Select
                          value={formData.inspectionDetails.dimensionalCheck}
                          onChange={(e) =>
                            handleInspectionDetailChange(
                              'dimensionalCheck',
                              e.target.value
                            )
                          }
                        >
                          <option value="">Select Result</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                          <option value="Minor Issues">Minor Issues</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Surface Quality</Form.Label>
                        <Form.Select
                          value={formData.inspectionDetails.surfaceQuality}
                          onChange={(e) =>
                            handleInspectionDetailChange(
                              'surfaceQuality',
                              e.target.value
                            )
                          }
                        >
                          <option value="">Select Result</option>
                          <option value="Excellent">Excellent</option>
                          <option value="Good">Good</option>
                          <option value="Average">Average</option>
                          <option value="Poor">Poor</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Color Consistency</Form.Label>
                        <Form.Select
                          value={formData.inspectionDetails.colorConsistency}
                          onChange={(e) =>
                            handleInspectionDetailChange(
                              'colorConsistency',
                              e.target.value
                            )
                          }
                        >
                          <option value="">Select Result</option>
                          <option value="Consistent">Consistent</option>
                          <option value="Minor Variation">
                            Minor Variation
                          </option>
                          <option value="Major Variation">
                            Major Variation
                          </option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Packaging Condition</Form.Label>
                        <Form.Select
                          value={formData.inspectionDetails.packagingCondition}
                          onChange={(e) =>
                            handleInspectionDetailChange(
                              'packagingCondition',
                              e.target.value
                            )
                          }
                        >
                          <option value="">Select Condition</option>
                          <option value="Excellent">Excellent</option>
                          <option value="Good">Good</option>
                          <option value="Damaged">Damaged</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Overall Grade</Form.Label>
                        <Form.Select
                          value={formData.overallGrade}
                          onChange={(e) =>
                            handleInputChange('overallGrade', e.target.value)
                          }
                        >
                          <option value="">Select Grade</option>
                          {gradeOptions.map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Products from Order */}
            {formData.productLines && formData.productLines.length > 0 && (
              <Col xs={12}>
                <Card>
                  <Card.Header>
                    <h6 className="mb-0 text-primary">
                      Products in Selected Order
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="table-responsive">
                      <Table striped bordered size="sm">
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>Image</th>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Size</th>
                            <th>Surface</th>
                            <th>Thickness</th>
                            <th>Total Boxes</th>
                            <th style={{ width: '120px' }}>Box Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.productLines.map((product, index) => {
                            const imageUrl = getProductImage(product.product);
                            const orderNumStr = String(formData.orderNumber || '').trim().toLowerCase();
                            const matchedSheet = allOrderSheets.find(s => 
                              String(s.productionSheetNo || s.production_sheet_no || '').trim().toLowerCase() === orderNumStr
                            );

                            // Always prefer the live Order Sheet's box type, as old QC JSON records might contain corrupted boxType data (e.g. shade values)
                            const rawBoxType = matchedSheet?.box_type || matchedSheet?.boxType || product.boxType || 'N/A';

                            const finalBoxType = rawBoxType || 'N/A';

                            const boxTypeObj = masterData?.boxTypeObjects?.find(b => {
                              const val = String(b.value || b.type || b).trim();
                              return val.toLowerCase() === String(finalBoxType).trim().toLowerCase();
                            });

                            let boxTypeImageUrl = boxTypeObj?.imageUrl || boxTypeObj?.image_url;
                            if (boxTypeImageUrl && Array.isArray(boxTypeImageUrl)) {
                              boxTypeImageUrl = boxTypeImageUrl[0];
                            }
                            if (boxTypeImageUrl) {
                              boxTypeImageUrl = resolveImageUrl(boxTypeImageUrl);
                            }

                            // Pull missing data from live sheet if old QC JSON is incomplete
                            const liveLine = matchedSheet?.lines?.find(l => {
                              const pCat = String(l.productCategory || l.product_category || '').trim().toLowerCase();
                              const targetCat = String(product.product || '').trim().toLowerCase();
                              
                              const lSize = String(l.size || '').trim().toLowerCase().replace(/\s/g, '');
                              const targetSize = String(product.size || '').trim().toLowerCase().replace(/\s/g, '');
                              
                              // If product name and size match, it's highly likely the same line
                              return pCat === targetCat && lSize === targetSize;
                            }) || matchedSheet?.lines?.find(l => {
                              // Fallback: just match product name
                              const pCat = String(l.productCategory || l.product_category || '').trim().toLowerCase();
                              const targetCat = String(product.product || '').trim().toLowerCase();
                              return pCat === targetCat;
                            });

                            const finalRequiredSqm = product.requiredSqm || product.required_sqm || liveLine?.requiredSqm || liveLine?.required_sqm || 0;
                            const finalProducedSqm = product.producedSqm || product.produced_sqm || liveLine?.producedSqm || liveLine?.produced_sqm || 0;
                            // Prefer liveLine data to override corrupted historical json records where totalBoxes might have been mistakenly set to SQM
                            const finalTotalBoxes = liveLine?.boxes_required || liveLine?.total_production_boxes || liveLine?.totalBoxes || liveLine?.total_boxes || liveLine?.boxes || product.totalBoxes || product.total_boxes || product.boxes || 0;

                            return (
                              <tr key={index}>
                                <td data-label="Image">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={product.product || 'Product'}
                                      style={{
                                        width: '64px',
                                        height: '64px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        border: '1px solid #dee2e6'
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: '64px',
                                        height: '64px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '8px',
                                        border: '2px dashed #dee2e6',
                                      }}
                                    >
                                      <Package size={24} color="#6c757d" />
                                    </div>
                                  )}
                                </td>
                                <td data-label="Product">{product.product}</td>
                                <td data-label="Category">{product.category || 'N/A'}</td>
                                <td data-label="Size">{product.size}</td>
                                <td data-label="Surface">{product.surface}</td>
                                <td data-label="Thickness">{product.thickness}</td>
                                <td data-label="Total Boxes">{finalTotalBoxes}</td>
                                <td data-label="Box Type" className="text-center">
                                  <div className="d-flex flex-column align-items-center">
                                    <img
                                      src={boxTypeImageUrl || `https://placehold.co/100x100/e9ecef/6c757d?text=${encodeURIComponent(finalBoxType)}`}
                                      alt={finalBoxType}
                                      style={{
                                        width: '40px',
                                        height: '40px',
                                        objectFit: 'contain',
                                        marginBottom: '4px',
                                        borderRadius: '4px',
                                        border: '1px solid #dee2e6'
                                      }}
                                    />
                                    <small className="fw-semibold text-muted text-truncate w-100 text-center" title={finalBoxType}>
                                      {finalBoxType}
                                    </small>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )}

            {/* QC Inspection Media */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">
                    QC Inspection Media ({getTotalMediaCount()}/500)
                  </h6>
                  <small className="text-white-50">
                    Media uploads are optional. Chunked upload supported. Max: 4MB per image, 10MB per video.
                  </small>
                </Card.Header>
                <Card.Body>
                  <Row className="g-4">
                    {Object.entries({
                      onlineChecking: 'Online Checking',
                      flooring: 'Flooring',
                      joint: 'Joint',
                      curvature: 'Curvature',
                      thickness: 'Thickness',
                      glossy: 'Glossy',
                      lValue: 'L Value',
                      boxWeight: 'Box Weight',
                      palletPacking: 'Pallet Packing',
                      mor: 'MOR (Breakage)',
                    }).map(([key, label]) => (
                      <Col key={key} xs={12} md={6}>
                        <QCMediaUpload
                          sectionName={label}
                          images={(formData.inspectionMedia?.[key]?.images) || []}
                          videos={(formData.inspectionMedia?.[key]?.videos) || []}
                          onChange={handleInspectionMediaChange}
                          maxFiles={50}
                          maxFileSize={10 * 1024 * 1024}
                        />
                      </Col>
                    ))}
                  </Row>

                  {errors.mediaLimit && (
                    <Alert variant="secondary" className="mt-3">
                      {errors.mediaLimit}
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Notes */}
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Notes & Comments</h6>
                </Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Label>QC Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={formData.notes || ''}
                      onChange={(e) =>
                        handleInputChange('notes', e.target.value)
                      }
                      placeholder={FIELD_PLACEHOLDERS.notes.placeholder}
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            {/* Activity History */}
            {qcRecord && (qcRecord.id || qcRecord._id) && (
              <Col xs={12}>
                <Card className="audit-history-card border-0 shadow-sm">
                  <Card.Header className="bg-light d-flex align-items-center">
                    <History size={18} className="me-2 text-primary" />
                    <h6 className="mb-0">Activity History</h6>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ModuleAuditLog resourceType="qc_record" resourceId={qcRecord.id || qcRecord._id} />
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </Form>
        <ValidationErrorModal
          show={showErrorModal}
          errors={errors}
          onClose={() => setShowErrorModal(false)}
          title="QC Form Validation Error"
        />
      </Modal.Body>
      <Modal.Footer className="qc-mobile-footer bg-white shadow-sm border-top" style={{ zIndex: 1020 }}>
        <Button variant="secondary" type="button" onClick={handleCancel}>
          <X size={16} className="me-1" />
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSaving}
          title={!isFormValid() ? 'Please select an Order and ensure Products are loaded' : ''}
        >
          {isSaving ? (
            <>
              <RotateCcw size={16} className="me-1 spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="me-1" />
              {qcRecord ? 'Update QC Record' : 'Save QC Record'}
            </>
          )}
        </Button>
      </Modal.Footer>

      <style>{`
        .inspection-section {
          border: 1px solid #dee2e6;
          transition: all 0.2s ease;
        }
        
        .inspection-section:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .inspection-section .card-header {
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }
        
        @media (max-width: 992px) {
          .inspection-section {
            margin-bottom: 1rem;
          }
          .qc-mobile-footer {
            position: sticky;
            bottom: 0;
            padding: 1rem;
          }
        }
      `}</style>
    </Modal>
  );
}

export default QCForm;
