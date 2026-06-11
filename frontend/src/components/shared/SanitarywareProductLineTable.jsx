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

import React, { useState } from 'react';
import { Table, Button, Form, Card, Row, Col, Modal } from 'react-bootstrap';
import { Plus, Trash2, Camera, Package, AlertTriangle } from 'lucide-react';
import { showSuccess, showError, showWarning } from './NotificationManager.jsx';
import { formatPrice, formatWeight, formatQuantity } from '../../utils/formatters.js';
import AddableDropdown from './AddableDropdown.jsx';
import DoubleScrollbarWrapper from './DoubleScrollbarWrapper.jsx';

export default function SanitarywareProductLineTable({
  productLines,
  onChange,
  products = [],
  currency = '',
}) {
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [selectedProductImage, setSelectedProductImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);



  const handleCreateProductLine = () => {
    const newProductLine = {
      id: Date.now(),
      product_type: 'sanitaryware',
      product: '',
      factoryProductName: '',
      category: '',
      hsnCode: '',
      color: '',
      size: '',
      modelNo: '',
      pieces: 0,
      cartons: 0,
      cbm: 0,
      rate: '',
      amount: 0,
      netWeight: 0,
      grossWeight: 0,
      baseWeightPerPiece: 0,
      baseBoxWeight: 0,
      baseCbmPerPiece: 0,
      pcsPerBox: 1
    };
    onChange([...productLines, newProductLine]);
  };

  const handleProductLineChange = (index, field, value) => {
    const newLines = [...productLines];
    const line = { ...newLines[index] };

    if (field === 'product') {
      const selectedProduct = products.find(p => p.name === value);
      if (selectedProduct) {
        line.product = selectedProduct.name;
        line.sanitarywareProductId = selectedProduct.id || selectedProduct.sanitaryware_product_id || null;
        line.product_type = 'sanitaryware';
        line.factoryProductName = selectedProduct.factoryProductName || selectedProduct.factory_product_name || '';
        line.category = selectedProduct.category || '';
        line.color = selectedProduct.color || '';
        line.size = Array.isArray(selectedProduct.size) ? selectedProduct.size[0] : (selectedProduct.size || '');
        line.hsnCode = selectedProduct.hsnCode || selectedProduct.hsn_code || selectedProduct.hsCode || selectedProduct.hs_code || '';

        // Model / Item Ref mapping
        line.modelNo = selectedProduct.itemRef || selectedProduct.item_ref || selectedProduct.collection || selectedProduct.model_no || '';

        // Store base metrics for auto-calculations
        const weightPerPiece = parseFloat(selectedProduct.weightPerPiece || selectedProduct.weight_per_piece || selectedProduct.netWeight || selectedProduct.net_weight || 0);
        const boxWeight = parseFloat(selectedProduct.boxWeight || selectedProduct.box_weight || selectedProduct.grossWeight || selectedProduct.gross_weight || 0);
        const cbmPerPiece = parseFloat(selectedProduct.cbmPerPiece || selectedProduct.cbm_per_piece || selectedProduct.cbm || 0);
        const pcsPerBox = parseInt(selectedProduct.pcs_per_box || selectedProduct.pcsPerBox || selectedProduct.box_pcs || 1) || 1;

        line.baseWeightPerPiece = weightPerPiece;
        line.baseBoxWeight = boxWeight;
        line.boxWeight = boxWeight;
        line.baseCbmPerPiece = cbmPerPiece;
        line.pcsPerBox = pcsPerBox;

        // Auto fill weight details if available (initially based on pieces which might be 0)
        const bwt = parseFloat(boxWeight || 0);
        line.cartons = line.pieces;
        line.netWeight = parseFloat((line.pieces * bwt).toFixed(2));
        line.grossWeight = parseFloat((line.pieces * bwt).toFixed(2));
        line.cbm = parseFloat((line.pieces * cbmPerPiece).toFixed(4));

        // Auto fill rate
        const rate = parseFloat(selectedProduct.sellingPrice || selectedProduct.selling_price || selectedProduct.basePrice || selectedProduct.base_price || 0);
        if (rate > 0) {
          line.rate = rate;
          line.amount = parseFloat((line.pieces * rate).toFixed(2));
        }

        if (selectedProduct.images && selectedProduct.images.length > 0) {
          const mainImg = selectedProduct.images.find(i => i.isMain) || selectedProduct.images[0];
          line.image = mainImg.url;
        }
        showSuccess(`Product ${line.product} auto-filled`);
      } else {
        line.product = value;
      }
    } else if (field === 'pieces') {
      const pcs = value;
      line.pieces = pcs;
      const bwt = parseFloat(line.boxWeight || line.baseBoxWeight || 0);
      line.cartons = pcs;
      line.netWeight = parseFloat((pcs * bwt).toFixed(2));
      line.grossWeight = parseFloat((pcs * bwt).toFixed(2));
      line.cbm = parseFloat((pcs * (line.baseCbmPerPiece || line.cbmPerPiece || 0)).toFixed(4));
    } else if (field === 'boxWeight') {
      const bwt = value;
      line.boxWeight = bwt;
      line.cartons = line.pieces;
      line.netWeight = parseFloat((line.pieces * bwt).toFixed(2));
      line.grossWeight = parseFloat((line.pieces * bwt).toFixed(2));
    } else if (field === 'pcsPerBox') {
      const ppb = parseInt(value, 10) || 1;
      line.pcsPerBox = ppb;
    } else if (field === 'cartons') {
      const ctns = value;
      line.cartons = ctns;
      line.pieces = ctns;
      const bwt = parseFloat(line.boxWeight || line.baseBoxWeight || 0);
      line.netWeight = parseFloat((ctns * bwt).toFixed(2));
      line.grossWeight = parseFloat((ctns * bwt).toFixed(2));
    } else {
      line[field] = ['pieces', 'cartons', 'cbm', 'rate', 'netWeight', 'grossWeight'].includes(field)
        ? (value)
        : value;
    }

    line.amount = parseFloat((line.pieces * (parseFloat(line.rate) || 0)).toFixed(2));

    newLines[index] = line;
    onChange(newLines);
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) {
      const newLines = productLines.filter((_, i) => i !== deleteIndex);
      onChange(newLines);
      setDeleteIndex(null);
    }
  };

  const openImageModal = (imageUrl) => {
    setSelectedProductImage(imageUrl);
    setShowImageModal(true);
  };

  const getProductImage = (productName) => {
    const p = products.find(prod => prod.name === productName);
    if (!p?.images || p.images.length === 0) return null;
    return p.images.find(img => img.isMain) || p.images[0];
  };

  return (
    <div className="product-table-container mt-4">
      <div className="product-line-header" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '12px 12px 0 0', padding: '1.25rem 1.5rem', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h6 className="text-success fw-bold mb-1" style={{ display: 'flex', alignItems: 'center' }}>
            <Package size={20} className="me-2" />
            Sanitaryware Products ({productLines.length})
          </h6>
          <p className="mb-0 text-muted small">Sanitaryware items are measured in Pieces.</p>
        </div>
        <Button variant="success" size="sm" onClick={handleCreateProductLine}>
          <Plus size={16} className="me-1" /> Add Sanitaryware Product
        </Button>
      </div>

      {productLines.length > 0 ? (
        <>
          <DoubleScrollbarWrapper deps={[productLines]} wrapperClassName="table-responsive">
          <Table bordered hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="text-center" style={{ minWidth: '50px' }}>#</th>
                <th style={{ minWidth: '220px' }}>Product</th>
                <th className="text-center" style={{ minWidth: '70px' }}>Image</th>
                <th style={{ minWidth: '130px' }}>HSN Code</th>
                <th style={{ minWidth: '120px' }}>Category</th>
                <th style={{ minWidth: '110px' }}>Color</th>
                <th style={{ minWidth: '110px' }}>Model</th>
                <th style={{ minWidth: '95px' }}>Pieces</th>
                <th style={{ minWidth: '95px' }}>Box Wt.</th>
                <th style={{ minWidth: '100px' }}>Total Boxes</th>
                <th style={{ minWidth: '100px' }}>Rate/Box</th>
                <th style={{ minWidth: '110px' }}>Amount</th>
                <th style={{ minWidth: '100px' }}>Net Wt.</th>
                <th style={{ minWidth: '100px' }}>Gross Wt.</th>
                <th className="text-center" style={{ minWidth: '70px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {productLines.map((line, idx) => {
                const img = getProductImage(line.product);
                return (
                  <tr key={line.id || idx}>
                    <td className="text-center">{idx + 1}</td>
                     <td>
                      <Form.Select size="sm" value={line.product || ''} onChange={e => handleProductLineChange(idx, 'product', e.target.value)}>
                        <option value="">Select Sanitaryware</option>
                        {products.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </Form.Select>
                    </td>
                    <td className="text-center">
                      {img ? (
                        <img src={img.url} alt={line.product} style={{ width: 40, height: 40, objectFit: 'cover', cursor: 'pointer', borderRadius: '4px' }} onClick={() => openImageModal(img.url)} />
                      ) : <Camera size={16} className="text-muted" />}
                    </td>
                    <td>
                      <AddableDropdown
                        value={line.hsnCode || ''}
                        onChange={(val) => handleProductLineChange(idx, 'hsnCode', val)}
                        masterDataType="tariffCodes"
                        placeholder="HSN Code"
                        selectClassName="form-control-sm text-uppercase"
                        addButtonLabel="+ Add New"
                      />
                    </td>
                    <td><Form.Control size="sm" value={line.category || ''} onChange={e => handleProductLineChange(idx, 'category', e.target.value)} /></td>
                    <td><Form.Control size="sm" value={line.color || ''} onChange={e => handleProductLineChange(idx, 'color', e.target.value)} /></td>
                    <td><Form.Control size="sm" value={line.modelNo || ''} onChange={e => handleProductLineChange(idx, 'modelNo', e.target.value)} /></td>
                    <td><Form.Control size="sm" type="number" value={line.pieces ?? 0} onChange={e => handleProductLineChange(idx, 'pieces', e.target.value)} /></td>
                    <td><Form.Control size="sm" type="number" step="0.01" value={line.boxWeight || line.baseBoxWeight || 0} onChange={e => handleProductLineChange(idx, 'boxWeight', e.target.value)} style={{ width: '80px' }} /></td>
                    <td><Form.Control size="sm" type="number" value={line.cartons ?? 0} readOnly className="bg-light border-0 fw-bold" style={{ width: '90px' }} /></td>
                    <td><Form.Control size="sm" type="number" step="0.01" value={line.rate ?? ''} onChange={e => handleProductLineChange(idx, 'rate', e.target.value)} /></td>
                    <td className="fw-bold bg-light" style={{ fontSize: '14px' }}>{formatPrice(line.amount, currency)}</td>
                    <td><Form.Control size="sm" type="number" step="0.1" value={line.netWeight ?? 0} onChange={e => handleProductLineChange(idx, 'netWeight', e.target.value)} /></td>
                    <td><Form.Control size="sm" type="number" step="0.1" value={line.grossWeight ?? 0} onChange={e => handleProductLineChange(idx, 'grossWeight', e.target.value)} /></td>
                    <td className="text-center">
                      <Button variant="link" className="text-danger p-0" onClick={() => setDeleteIndex(idx)}><Trash2 size={16} /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-light fw-bold">
              <tr>
                <td colSpan={7} className="text-end text-success" style={{ fontSize: '14px' }}>SANITARYWARE TOTAL</td>
                <td style={{ fontSize: '14px' }}>{formatQuantity(productLines.reduce((s, l) => s + (parseFloat(l.pieces) || 0), 0))}</td>
                <td></td>
                <td style={{ fontSize: '14px' }}>{formatQuantity(productLines.reduce((s, l) => s + (parseFloat(l.cartons) || 0), 0))}</td>
                <td></td>
                <td style={{ fontSize: '14px' }}>{formatPrice(productLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0), currency)}</td>
                <td style={{ fontSize: '14px' }}>{formatWeight(productLines.reduce((s, l) => s + (parseFloat(l.netWeight) || 0), 0))}</td>
                <td style={{ fontSize: '14px' }}>{formatWeight(productLines.reduce((s, l) => s + (parseFloat(l.grossWeight) || 0), 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
          </DoubleScrollbarWrapper>
      </>
    ) : (
        <div className="text-center py-4 border border-top-0 rounded-bottom text-muted" style={{ backgroundColor: '#fdfdfd' }}>
          No sanitaryware products added yet.
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={deleteIndex !== null} onHide={() => setDeleteIndex(null)} centered backdrop="static">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger flex-grow-1 d-flex align-items-center">
            <AlertTriangle size={24} className="me-2" />
            Confirm Deletion
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to remove this sanitaryware item?</Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={() => setDeleteIndex(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Yes, Remove</Button>
        </Modal.Footer>
      </Modal>

      {/* Image Modal */}
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Product Image</Modal.Title></Modal.Header>
        <Modal.Body className="text-center">
          {selectedProductImage && <img src={selectedProductImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '400px' }} />}
        </Modal.Body>
      </Modal>
    </div>
  );
}
