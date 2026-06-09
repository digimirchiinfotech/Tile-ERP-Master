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
import { Modal, Button, Table } from 'react-bootstrap';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { showSuccess, showError } from './EnhancedNotificationSystem.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';
import { useProducts } from '../../hooks/useProducts';
import { useMasterData } from '../../hooks/useMasterData';
import ProductForm from '../product-management/ProductForm.jsx';

function ProductManagement({ show, onHide }) {
  const { products, createProduct, updateProduct, deleteProduct, loading } = useProducts();
  const masterData = useMasterData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCreateProduct = () => {
    setEditingProduct({ catalogue: 'Tiles', category: 'Tiles' });
    setShowAddForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleDeleteProduct = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProduct = async () => {
    try {
      await deleteProduct(deleteId);
      showSuccess('Product deleted successfully!');
      setShowDeleteConfirm(false);
    } catch (error) {
      showError('Failed to delete product.');
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct.id, data: productData });
        showSuccess('Product updated successfully!');
      } else {
        await createProduct(productData);
        showSuccess('Product created successfully!');
      }
      setShowAddForm(false);
    } catch (error) {
      showError(editingProduct ? 'Failed to update product.' : 'Failed to create product.');
      throw error;
    }
  };

  const handleMasterDataUpdate = async (type, value) => {
    try {
      await masterData.addMasterData(type, value);
    } catch (error) {
      showError(`Failed to add ${type}.`);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Tile Product</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 text-primary fw-bold">Manage Product Catalog</h6>
          <Button variant="primary" size="sm" onClick={handleCreateProduct}>
            <Plus size={16} className="me-1" />
            Add New Product
          </Button>
        </div>

        <div
          className="table-responsive border rounded"
          style={{ maxHeight: '500px', overflowY: 'auto' }}
        >
          <Table striped hover responsive className="mb-0">
            <thead className="bg-light sticky-top">
              <tr className="text-uppercase small fw-bold">
                <th>Product Details</th>
                <th>Dimensions</th>
                <th>Packing info</th>
                <th>Weights</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products && products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id} className="align-middle">
                    <td>
                      <div className="fw-bold text-dark">{product.name}</div>
                      <div className="small text-muted">{product.itemRef || product.productCode}</div>
                    </td>
                    <td>
                      <div className="small"><strong>Size:</strong> {product.size || '-'}</div>
                      <div className="small"><strong>Surface:</strong> {product.surface || '-'}</div>
                      <div className="small"><strong>Thick:</strong> {product.thickness || '-'}</div>
                    </td>
                    <td>
                      <div className="small"><strong>SQM/Box:</strong> {product.sqmPerBox || '-'}</div>
                      <div className="small"><strong>Box/Pal:</strong> {product.defaultBoxesPerPallet || '-'}</div>
                    </td>
                    <td>
                      <div className="small"><strong>Box:</strong> {product.defaultPerBoxWeight ? `${product.defaultPerBoxWeight}kg` : '-'}</div>
                      <div className="small"><strong>Pallet:</strong> {product.defaultPerPalletWeight ? `${product.defaultPerPalletWeight}kg` : '-'}</div>
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="btn-icon"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="btn-icon"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    {loading ? (
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    ) : null}
                    {loading ? 'Loading products...' : 'No products found. Add your first product to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {showAddForm && (
          <ProductForm
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => setShowAddForm(false)}
            masterData={masterData}
            onMasterDataUpdate={handleMasterDataUpdate}
          />
        )}
      </Modal.Body>
      <Modal.Footer className="bg-light">
        <Button variant="secondary" onClick={onHide}>
          <X size={16} className="me-1" />
          Close
        </Button>
      </Modal.Footer>

      <ConfirmationModal
        show={showDeleteConfirm}
        onHide={() => setShowDeleteConfirm(false)}
        title="Delete Product"
        message={`Are you sure you want to delete "${products.find(p => p.id === deleteId)?.name}"? This action cannot be undone.`}
        variant="danger"
        onConfirm={confirmDeleteProduct}
      />

      <style>{`
        .btn-icon {
          padding: 0.25rem 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .table thead th {
          background-color: #f8f9fa;
          border-bottom: 2px solid #dee2e6;
          color: #495057;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        .table-responsive::-webkit-scrollbar {
          width: 6px;
        }
        .table-responsive::-webkit-scrollbar-thumb {
          background-color: #ced4da;
          border-radius: 3px;
        }
      `}</style>
    </Modal>
  );
}

export default ProductManagement;





