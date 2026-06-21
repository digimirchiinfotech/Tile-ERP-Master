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

import { Modal, Button, Row, Col, Badge, Card, Table } from 'react-bootstrap';
import {
  Edit,
  FileText,
  Package,
  Truck,
  MapPin,
  Calendar,
  User,
  Printer} from 'lucide-react';

function PackingListView({ packingList, onClose, onEdit, canEdit }) {
  if (!packingList) return null;

  const getStatusBadge = (status) => {
    const variants = {
      'Ready for Dispatch': 'success',
      Dispatched: 'info',
      Pending: 'warning',
      'On Hold': 'secondary',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatWeight = (weight) => {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(2)} tons`;
    }
    return `${weight} kg`;
  };

  return (
    <Modal contentClassName="glass-modal" show={true} onHide={onClose} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <Package size={20} className="me-2" />
          Packing List Details - {packingList.packingListNo}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Row className="g-4">
          {/* Basic Information */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <FileText size={18} className="me-2" />
                  Basic Information
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Packing List No.:
                      </label>
                      <p className="mb-0 fw-medium">
                        {packingList.packingListNo}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Calendar size={16} className="me-1" />
                        Date:
                      </label>
                      <p className="mb-0">{packingList.date}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Supplier Factory Name:
                      </label>
                      <p className="mb-0">{packingList.supplierName}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Status:</label>
                      <div>{getStatusBadge(packingList.status)}</div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Summary Statistics */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">Summary Statistics</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={2}>
                    <div className="text-center p-2 border rounded bg-light">
                      <Package size={24} className="text-primary mb-1" />
                      <h5 className="text-primary mb-0">
                        {packingList.totalPallets}
                      </h5>
                      <small className="text-muted d-block">Total Pallets</small>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="text-center p-2 border rounded bg-light">
                      <FileText size={24} className="text-success mb-1" />
                      <h5 className="text-success mb-0">{packingList.totalBoxes}</h5>
                      <small className="text-muted d-block">Total Boxes</small>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="text-center p-2 border rounded bg-light">
                      <Package size={24} className="text-info mb-1" />
                      <h5 className="text-info mb-0">
                        {packingList.totalSQM?.toFixed(2)}
                      </h5>
                      <small className="text-muted d-block">Total SQM</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center p-2 border rounded bg-light">
                      <Truck size={24} className="text-warning mb-1" />
                      <h5 className="text-warning mb-0">
                        {formatWeight(packingList.totalWeight)}
                      </h5>
                      <small className="text-muted d-block">Total Weight</small>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Product Lines */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">Product Lines</h6>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Item Ref</th>
                        <th>Size</th>
                        <th>Surface</th>
                        <th>Thickness</th>
                        <th>Pallets</th>
                        <th>Boxes</th>
                        <th>SQM</th>
                        <th>Weight (kg)</th>
                        <th>Pallet Numbers</th>
                        <th>Box Numbers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packingList.productLines?.map((product, index) => (
                        <tr key={product.id || index}>
                          <td className="fw-medium">{product.product}</td>
                          <td>{product.itemRef}</td>
                          <td>{product.size}</td>
                          <td>{product.surface}</td>
                          <td>{product.thickness}</td>
                          <td>{product.pallets}</td>
                          <td>{product.boxes}</td>
                          <td>{product.sqm?.toFixed(2)}</td>
                          <td>{product.weight?.toFixed(2)}</td>
                          <td>
                            <Badge bg="secondary" className="font-monospace">
                              {product.palletNumbers}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg="secondary" className="font-monospace">
                              {product.boxNumbers}
                            </Badge>
                          </td>
                        </tr>
                      )) || (
                          <tr>
                            <td
                              colSpan="11"
                              className="text-center py-3 text-muted"
                            >
                              No product lines available
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Shipping Details */}
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h6 className="mb-0 text-primary">
                  <Truck size={18} className="me-2" />
                  Shipping Details
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Port of Loading:
                      </label>
                      <p className="mb-0">
                        {packingList.shippingDetails?.portOfLoading}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Port of Discharge:
                      </label>
                      <p className="mb-0">
                        {packingList.shippingDetails?.portOfDischarge}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Final Destination:
                      </label>
                      <p className="mb-0">
                        {packingList.shippingDetails?.finalDestination}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Container Type:
                      </label>
                      <p className="mb-0">
                        {packingList.shippingDetails?.containerType}
                      </p>
                    </div>
                  </Col>
                  {packingList.shippingDetails?.sealNumber && (
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Seal Number:
                        </label>
                        <p className="mb-0 font-monospace">
                          {packingList.shippingDetails.sealNumber}
                        </p>
                      </div>
                    </Col>
                  )}
                  {packingList.shippingDetails?.truckNumber && (
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Truck Number:
                        </label>
                        <p className="mb-0 font-monospace">
                          {packingList.shippingDetails.truckNumber}
                        </p>
                      </div>
                    </Col>
                  )}
                  {packingList.shippingDetails?.driverDetails && (
                    <Col md={4}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Driver Details:
                        </label>
                        <p className="mb-0">
                          {packingList.shippingDetails.driverDetails}
                        </p>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Additional Information */}
          {(packingList.packingInstructions || packingList.createdBy) && (
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Additional Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {packingList.packingInstructions && (
                      <Col md={12}>
                        <div className="info-item">
                          <label className="fw-bold text-muted">
                            Packing Instructions:
                          </label>
                          <p className="mb-0">
                            {packingList.packingInstructions}
                          </p>
                        </div>
                      </Col>
                    )}
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          <User size={16} className="me-1" />
                          Created By:
                        </label>
                        <p className="mb-0">{packingList.createdBy}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted">
                          Last Modified:
                        </label>
                        <p className="mb-0">{packingList.lastModified}</p>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer size={16} className="me-1" />
          Print Packing List
        </Button>
        {canEdit && (
          <Button variant="primary" onClick={onEdit}>
            <Edit size={16} className="me-1" />
            Edit Packing List
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>

      <style>{`
        .info-item {
          margin-bottom: 1rem;
        }

        .info-item label {
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          display: block;
        }

        .info-item p {
          font-size: 1rem;
          color: #333;
        }
      `}</style>
    </Modal>
  );
}

export default PackingListView;
