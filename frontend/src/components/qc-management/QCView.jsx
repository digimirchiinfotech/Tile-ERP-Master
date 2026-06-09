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

import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Row, Col, Badge, Card, Spinner } from 'react-bootstrap';
import { Edit, Eye, Calendar, FileText, CheckCircle, XCircle, Clock, Printer, Download } from 'lucide-react';
import api from '../../services/api.js';
import masterDataService from '../../services/masterDataService.js';
import { resolveImageUrl } from '../../utils/urlHelper.js';

function QCView({ qcRecord, onClose, onEdit, onPrint, onDownload, canEdit }) {
  const [resolvedBoxType, setResolvedBoxType] = useState(null);
  const [boxTypeImageUrl, setBoxTypeImageUrl] = useState(null);
  const [loadingBoxType, setLoadingBoxType] = useState(false);

  const boxTypeFromRecord = useMemo(() => {
    const fromRecord = qcRecord?.boxType || qcRecord?.box_type;
    if (fromRecord && fromRecord !== 'N/A') return fromRecord;
    const fromLines = [...new Set(
      (qcRecord?.productLines || [])
        .map((l) => l.boxType || l.box_type)
        .filter((b) => b && b !== 'N/A')
    )];
    return fromLines[0] || null;
  }, [qcRecord]);

  useEffect(() => {
    let mounted = true;

    const resolveBoxType = async () => {
      if (!qcRecord) return;

      if (boxTypeFromRecord) {
        setResolvedBoxType(boxTypeFromRecord);
        return;
      }

      if (!qcRecord.orderNumber) {
        setResolvedBoxType(null);
        return;
      }

      setLoadingBoxType(true);
      try {
        const response = await api.get(`/order-sheets?search=${encodeURIComponent(qcRecord.orderNumber)}`);
        const sheet = response?.data?.data?.items?.[0];
        const sheetBoxType = sheet?.boxType || sheet?.box_type;
        if (mounted && sheetBoxType && sheetBoxType !== 'N/A') {
          setResolvedBoxType(sheetBoxType);
        }
      } catch (err) {
        console.error('Failed to resolve box type for QC view:', err);
      } finally {
        if (mounted) setLoadingBoxType(false);
      }
    };

    resolveBoxType();
    return () => { mounted = false; };
  }, [qcRecord, boxTypeFromRecord]);

  useEffect(() => {
    let mounted = true;
    const displayType = resolvedBoxType || boxTypeFromRecord;
    if (!displayType) {
      setBoxTypeImageUrl(null);
      return undefined;
    }

    const loadBoxTypeImage = async () => {
      try {
        const boxTypes = await masterDataService.getAllBoxTypes();
        const match = (boxTypes || []).find((b) => {
          const val = String(b.value || b.type || b.name || b).trim();
          return val.toLowerCase() === String(displayType).trim().toLowerCase();
        });
        let imageUrl = match?.imageUrl || match?.image_url;
        if (imageUrl && Array.isArray(imageUrl)) imageUrl = imageUrl[0];
        if (mounted) {
          setBoxTypeImageUrl(imageUrl ? resolveImageUrl(imageUrl) : null);
        }
      } catch (err) {
        console.error('Failed to load box type image:', err);
      }
    };

    loadBoxTypeImage();
    return () => { mounted = false; };
  }, [resolvedBoxType, boxTypeFromRecord]);

  if (!qcRecord) return null;

  const displayBoxType = resolvedBoxType || boxTypeFromRecord || 'N/A';

  const getStatusBadge = (status) => {
    const variants = {
      Passed: 'success',
      Failed: 'danger',
      Pending: 'warning',
      'Under Process': 'info',
      'Re-inspection Required': 'warning',
    };
    const icons = {
      Passed: CheckCircle,
      Failed: XCircle,
      Pending: Clock,
      'Under Process': Clock,
      'Re-inspection Required': Clock,
    };
    const IconComponent = icons[status] || Clock;
    return (
      <Badge
        bg={variants[status] || 'secondary'}
        className="d-flex align-items-center"
      >
        <IconComponent size={14} className="me-1" />
        {status}
      </Badge>
    );
  };

  const getGradeBadge = (grade) => {
    const variants = {
      'A+': 'success',
      A: 'success',
      'B+': 'info',
      B: 'info',
      C: 'warning',
      Reject: 'danger',
    };
    return <Badge bg={variants[grade] || 'secondary'}>{grade}</Badge>;
  };

  const getInspectionResultBadge = (result) => {
    const variants = {
      Pass: 'success',
      Fail: 'danger',
      Excellent: 'success',
      Good: 'info',
      Average: 'warning',
      Poor: 'danger',
      Consistent: 'success',
      'Minor Variation': 'warning',
      'Major Variation': 'danger',
      'Minor Issues': 'warning',
    };
    return <Badge bg={variants[result] || 'secondary'}>{result}</Badge>;
  };

  return (
    <Modal show={true} onHide={onClose} fullscreen backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>QC Record Details - {qcRecord.qcId}</Modal.Title>
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
                      <label className="fw-bold text-muted">QC ID:</label>
                      <p className="mb-0 fw-medium">{qcRecord.qcId}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Order Number:
                      </label>
                      <p className="mb-0">{qcRecord.orderNumber}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">Client Firm Name:</label>
                      <p className="mb-0">{qcRecord.clientName}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        Product Name:
                      </label>
                      <p className="mb-0">{qcRecord.productName}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">QC Status:</label>
                      <div>{getStatusBadge(qcRecord.qcStatus)}</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="info-item">
                      <label className="fw-bold text-muted">
                        <Calendar size={16} className="me-1" />
                        QC Date:
                      </label>
                      <p className="mb-0">{qcRecord.qcDate}</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Inspection Details */}
          {qcRecord.inspectionDetails && (
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Inspection Details</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    {qcRecord.inspectionDetails.dimensionalCheck && (
                      <Col md={6}>
                        <div className="info-item">
                          <label className="fw-bold text-muted">
                            Dimensional Check:
                          </label>
                          <div>
                            {getInspectionResultBadge(
                              qcRecord.inspectionDetails.dimensionalCheck
                            )}
                          </div>
                        </div>
                      </Col>
                    )}
                    {qcRecord.inspectionDetails.surfaceQuality && (
                      <Col md={6}>
                        <div className="info-item">
                          <label className="fw-bold text-muted">
                            Surface Quality:
                          </label>
                          <div>
                            {getInspectionResultBadge(
                              qcRecord.inspectionDetails.surfaceQuality
                            )}
                          </div>
                        </div>
                      </Col>
                    )}
                    {qcRecord.inspectionDetails.colorConsistency && (
                      <Col md={6}>
                        <div className="info-item">
                          <label className="fw-bold text-muted">
                            Color Consistency:
                          </label>
                          <div>
                            {getInspectionResultBadge(
                              qcRecord.inspectionDetails.colorConsistency
                            )}
                          </div>
                        </div>
                      </Col>
                    )}
                    {qcRecord.inspectionDetails.packagingCondition && (
                      <Col md={6}>
                        <div className="info-item">
                          <label className="fw-bold text-muted">
                            Packaging Condition:
                          </label>
                          <div>
                            {getInspectionResultBadge(
                              qcRecord.inspectionDetails.packagingCondition
                            )}
                          </div>
                        </div>
                      </Col>
                    )}
                    {qcRecord.overallGrade && (
                      <Col md={6}>
                        <div className="info-item">
                          <label className="fw-bold text-muted">
                            Overall Grade:
                          </label>
                          <div>
                            {getGradeBadge(
                              qcRecord.overallGrade
                            )}
                          </div>
                        </div>
                      </Col>
                    )}
                    <Col md={6}>
                      <div className="info-item">
                        <label className="fw-bold text-muted d-block mb-2">
                          Box Type & Image:
                        </label>
                        <div className="d-flex align-items-center gap-3">
                          {loadingBoxType ? (
                            <Spinner size="sm" animation="border" />
                          ) : (
                            <Badge bg="dark" className="text-white fs-6">
                              {displayBoxType}
                            </Badge>
                          )}
                          {displayBoxType !== 'N/A' && (
                            <img
                              src={boxTypeImageUrl || `https://placehold.co/100x100/e9ecef/6c757d?text=${encodeURIComponent(displayBoxType)}`}
                              alt={displayBoxType}
                              style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #dee2e6', background: '#fff' }}
                            />
                          )}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          )}

          {/* Inspection Media (Images & Videos) */}
          {qcRecord.inspectionMedia && Object.keys(qcRecord.inspectionMedia).length > 0 && (
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary d-flex align-items-center">
                    <Eye size={18} className="me-2" />
                    Inspection Media by Section
                  </h6>
                </Card.Header>
                <Card.Body>
                  <div className="section-media-container">
                    {Object.entries(qcRecord.inspectionMedia).map(([sectionKey, media]) => {
                      const hasImages = media.images && media.images.length > 0;
                      const hasVideos = media.videos && media.videos.length > 0;
                      
                      if (!hasImages && !hasVideos) return null;

                      const sectionTitles = {
                        onlineChecking: 'Online Checking',
                        flooring: 'Flooring',
                        joint: 'Joint / Sump',
                        curvature: 'Curvature',
                        thickness: 'Thickness',
                        glossy: 'Glossy / L-Value',
                        lValue: 'L-Value',
                        boxWeight: 'Box Weight',
                        palletPacking: 'Pallet Packing',
                        mor: 'MOR (Breakage)'
                      };

                      return (
                        <div key={sectionKey} className="inspection-section mb-4">
                          <h6 className="section-title border-bottom pb-2 mb-3 text-secondary">
                            {sectionTitles[sectionKey] || sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}
                          </h6>
                          
                          <Row className="g-3">
                            {media.images?.map((image, idx) => (
                              <Col key={`img-${idx}`} xs={6} sm={4} md={3} lg={2}>
                                <div className="media-preview-card">
                                  <div className="image-thumbnail-container" onClick={() => window.open(image.url || image, '_blank')}>
                                    <img
                                      src={image.url || image}
                                      alt={`${sectionKey} img ${idx + 1}`}
                                      className="image-thumbnail"
                                    />
                                    <div className="media-type-badge">
                                      <FileText size={10} className="me-1" />
                                      IMG
                                    </div>
                                  </div>
                                </div>
                              </Col>
                            ))}

                            {media.videos?.map((video, idx) => (
                              <Col key={`vid-${idx}`} xs={6} sm={4} md={3} lg={2}>
                                <div className="media-preview-card">
                                  <div className="video-thumbnail-container">
                                    <video
                                      src={video.url || video}
                                      className="video-thumbnail"
                                    />
                                    <div 
                                      className="video-play-overlay"
                                      onClick={() => window.open(video.url || video, '_blank')}
                                    >
                                      <Edit size={20} className="text-white" />
                                    </div>
                                    <div className="media-type-badge bg-info">
                                      <Eye size={10} className="me-1" />
                                      VID
                                    </div>
                                  </div>
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}

          {/* Notes */}
          {qcRecord.notes && (
            <Col xs={12}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 text-primary">Notes & Comments</h6>
                </Card.Header>
                <Card.Body>
                  <div className="info-item">
                    <p className="mb-0">{qcRecord.notes}</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Modal.Body>
      <Modal.Footer className="gap-2">
        <Button variant="outline-primary" onClick={onPrint}>
          <Printer size={16} className="me-1" />
          Print Report
        </Button>
        <Button variant="success" onClick={onDownload}>
          <Download size={16} className="me-1" />
          Download PDF
        </Button>
        {canEdit && (
          <Button variant="primary" onClick={onEdit}>
            <Edit size={16} className="me-1" />
            Edit QC Record
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

        .image-thumbnail-container {
          position: relative;
          cursor: pointer;
          border-radius: 0.375rem;
          overflow: hidden;
        }

        .image-thumbnail {
          width: 100%;
          height: 120px;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .image-thumbnail:hover {
          transform: scale(1.05);
        }
      `}</style>
    </Modal>
  );
}

export default QCView;
