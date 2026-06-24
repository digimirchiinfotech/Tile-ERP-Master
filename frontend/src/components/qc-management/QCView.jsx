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
import { Modal, Row, Col, Badge, Spinner } from 'react-bootstrap';
import Button from '../shared/Button.jsx';
import { 
  Edit, Eye, Calendar, FileText, CheckCircle, XCircle, Clock, 
  Printer, Download, Shield, Box, User, Hash, MessageSquare, Search, Image as ImageIcon, Briefcase
} from 'lucide-react';
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
    return (
      <Badge bg={variants[status] || 'secondary'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
        {(status || 'Unknown').toUpperCase()}
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
    return <Badge bg={variants[grade] || 'secondary'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{grade}</Badge>;
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
    return <Badge bg={variants[result] || 'secondary'} className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{result}</Badge>;
  };

  return (
    <Modal contentClassName="glass-modal" show={true} onHide={onClose} size="xl" backdrop="static" dialogClassName="qc-details-modal">
      <Modal.Body className="p-4 bg-light position-relative" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        
        {/* Absolute positioned close button */}
        <button 
          type="button" 
          className="btn-close position-absolute top-0 end-0 m-4 shadow-none" 
          aria-label="Close" 
          onClick={onClose}
          style={{ zIndex: 1050 }}
        />

        {/* ── Breadcrumb ── */}
        <div className="breadcrumb mb-2 text-muted" style={{ fontSize: '0.82rem', letterSpacing: '0.5px' }}>
          QC Management &gt; QC Record Details
        </div>

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary text-white d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '48px', height: '48px' }}>
              <FileText size={24} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>QC Record Details</h4>
              <span className="text-muted small">View complete inspection results, details, and media for {qcRecord.qcId}</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={onPrint} className="bg-white border-secondary-subtle text-dark fw-bold d-flex align-items-center">
              <Printer size={16} className="me-2 text-secondary" /> Print
            </Button>
            <Button variant="outline-success" onClick={onDownload} className="bg-white border-success-subtle text-success fw-bold d-flex align-items-center">
              <Download size={16} className="me-2 text-success" /> Download PDF
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={onEdit} className="fw-bold d-flex align-items-center">
                <Edit size={16} className="me-2" /> Edit QC Record
              </Button>
            )}
          </div>
        </div>

        <Row className="g-4">
          {/* Card 1: Basic Information */}
          <Col xs={12}>
            <div className="qc-card shadow-sm border rounded-3 overflow-hidden bg-white">
              <div className="qc-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                <Briefcase size={18} />
                <span>Basic Information</span>
              </div>
              <div className="info-grid p-4">
                {/* QC ID */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Hash size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">QC ID</span>
                    <span className="info-val fw-semibold text-dark">{qcRecord.qcId || '-'}</span>
                  </div>
                </div>

                {/* Order Number */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <FileText size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Order Number</span>
                    <span className="info-val fw-semibold text-dark">{qcRecord.orderNumber || '-'}</span>
                  </div>
                </div>

                {/* Supplier Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <User size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Supplier Name</span>
                    <span className="info-val fw-semibold text-dark">{qcRecord.clientName || '-'}</span>
                  </div>
                </div>

                {/* Product Name */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Box size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">Product Name</span>
                    <span className="info-val fw-semibold text-dark">{qcRecord.productName || 'N/A'}</span>
                  </div>
                </div>

                {/* QC Date */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Calendar size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">QC Date</span>
                    <span className="info-val fw-semibold text-dark">{qcRecord.qcDate || 'N/A'}</span>
                  </div>
                </div>

                {/* QC Status */}
                <div className="info-cell d-flex align-items-center gap-3">
                  <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                    <Shield size={18} />
                  </div>
                  <div className="info-text-wrapper">
                    <span className="info-label text-muted small d-block text-uppercase">QC Status</span>
                    <div className="mt-1">
                      {getStatusBadge(qcRecord.qcStatus)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Card 2: Inspection Details */}
          {qcRecord.inspectionDetails && (
            <Col xs={12}>
              <div className="qc-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="qc-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <Search size={18} />
                  <span>Inspection Details</span>
                </div>
                <div className="info-grid p-4">
                  {qcRecord.inspectionDetails.dimensionalCheck && (
                    <div className="info-cell d-flex align-items-center gap-3">
                      <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                        <Search size={18} />
                      </div>
                      <div className="info-text-wrapper">
                        <span className="info-label text-muted small d-block text-uppercase">Dimensional Check</span>
                        <div className="mt-1">{getInspectionResultBadge(qcRecord.inspectionDetails.dimensionalCheck)}</div>
                      </div>
                    </div>
                  )}

                  {qcRecord.inspectionDetails.surfaceQuality && (
                    <div className="info-cell d-flex align-items-center gap-3">
                      <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                        <CheckCircle size={18} />
                      </div>
                      <div className="info-text-wrapper">
                        <span className="info-label text-muted small d-block text-uppercase">Surface Quality</span>
                        <div className="mt-1">{getInspectionResultBadge(qcRecord.inspectionDetails.surfaceQuality)}</div>
                      </div>
                    </div>
                  )}

                  {qcRecord.inspectionDetails.colorConsistency && (
                    <div className="info-cell d-flex align-items-center gap-3">
                      <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                        <Eye size={18} />
                      </div>
                      <div className="info-text-wrapper">
                        <span className="info-label text-muted small d-block text-uppercase">Master Matching</span>
                        <div className="mt-1">{getInspectionResultBadge(qcRecord.inspectionDetails.colorConsistency)}</div>
                      </div>
                    </div>
                  )}

                  {qcRecord.inspectionDetails.packagingCondition && (
                    <div className="info-cell d-flex align-items-center gap-3">
                      <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                        <Box size={18} />
                      </div>
                      <div className="info-text-wrapper">
                        <span className="info-label text-muted small d-block text-uppercase">Packaging Condition</span>
                        <div className="mt-1">{getInspectionResultBadge(qcRecord.inspectionDetails.packagingCondition)}</div>
                      </div>
                    </div>
                  )}

                  {qcRecord.overallGrade && (
                    <div className="info-cell d-flex align-items-center gap-3">
                      <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                        <Shield size={18} />
                      </div>
                      <div className="info-text-wrapper">
                        <span className="info-label text-muted small d-block text-uppercase">Overall Grade</span>
                        <div className="mt-1">{getGradeBadge(qcRecord.overallGrade)}</div>
                      </div>
                    </div>
                  )}

                  <div className="info-cell d-flex align-items-center gap-3" style={{ gridColumn: 'span 2' }}>
                    <div className="info-icon-wrapper rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                      <Box size={18} />
                    </div>
                    <div className="info-text-wrapper d-flex align-items-center gap-3 w-100">
                      <div>
                        <span className="info-label text-muted small d-block text-uppercase mb-1">Box Type & Image</span>
                        {loadingBoxType ? (
                          <Spinner size="sm" animation="border" variant="primary" />
                        ) : (
                          <Badge bg="dark" className="rounded-pill px-3 py-1.5" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                            {displayBoxType}
                          </Badge>
                        )}
                      </div>
                      {displayBoxType !== 'N/A' && (
                        <div className="ms-4">
                          <img
                            src={boxTypeImageUrl || `https://placehold.co/100x100/eff6ff/2563eb?text=${encodeURIComponent(displayBoxType)}`}
                            alt={displayBoxType}
                            style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', padding: '4px' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          )}

          {/* Card 3: Inspection Media (Images & Videos) */}
          {qcRecord.inspectionMedia && Object.keys(qcRecord.inspectionMedia).length > 0 && (
            <Col xs={12}>
              <div className="qc-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="qc-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <ImageIcon size={18} />
                  <span>Inspection Media by Section</span>
                </div>
                <div className="p-4">
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
                        <div key={sectionKey} className="inspection-section mb-4 last-mb-0">
                          <h6 className="section-title border-bottom pb-2 mb-3 text-secondary fw-bold">
                            {sectionTitles[sectionKey] || sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}
                          </h6>
                          
                          <Row className="g-3">
                            {media.images?.map((image, idx) => (
                              <Col key={`img-${idx}`} xs={6} sm={4} md={3} lg={2}>
                                <div className="media-preview-card border rounded-3 p-1">
                                  <div className="image-thumbnail-container rounded" onClick={() => window.open(image.url || image, '_blank')}>
                                    <img
                                      src={image.url || image}
                                      alt={`${sectionKey} img ${idx + 1}`}
                                      className="image-thumbnail rounded"
                                    />
                                    <div className="media-type-badge bg-primary text-white">
                                      <ImageIcon size={10} className="me-1" />
                                      IMG
                                    </div>
                                  </div>
                                </div>
                              </Col>
                            ))}

                            {media.videos?.map((video, idx) => (
                              <Col key={`vid-${idx}`} xs={6} sm={4} md={3} lg={2}>
                                <div className="media-preview-card border rounded-3 p-1">
                                  <div className="video-thumbnail-container rounded">
                                    <video
                                      src={video.url || video}
                                      className="video-thumbnail rounded"
                                    />
                                    <div 
                                      className="video-play-overlay rounded"
                                      onClick={() => window.open(video.url || video, '_blank')}
                                    >
                                      <Eye size={20} className="text-white" />
                                    </div>
                                    <div className="media-type-badge bg-info text-white">
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
                </div>
              </div>
            </Col>
          )}

          {/* Card 4: Notes */}
          {qcRecord.notes && (
            <Col xs={12}>
              <div className="qc-card shadow-sm border rounded-3 overflow-hidden bg-white">
                <div className="qc-card-header d-flex align-items-center gap-2 text-white px-3 py-2.5 fw-bold" style={{ backgroundColor: '#2563eb' }}>
                  <MessageSquare size={18} />
                  <span>Notes & Comments</span>
                </div>
                <div className="p-4 bg-light">
                  <p className="mb-0 text-dark" style={{ lineHeight: '1.6' }}>{qcRecord.notes}</p>
                </div>
              </div>
            </Col>
          )}
        </Row>

        {/* ── Footer ── */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top bg-white px-3 py-2" style={{ margin: '0 -24px -24px -24px' }}>
          <Button variant="outline-secondary" onClick={onClose} className="border-secondary-subtle fw-semibold px-4">
            Close
          </Button>
        </div>

        <style>{`
          .qc-details-modal .modal-content {
            border-radius: 16px !important;
            border: none !important;
            box-shadow: 0 15px 50px rgba(0,0,0,0.15) !important;
            background-color: #f8fafc !important;
          }
          
          .qc-card {
            border: 1px solid #e2e8f0 !important;
            background: #ffffff !important;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px 30px;
          }

          @media (max-width: 992px) {
            .info-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
            .info-cell[style*="grid-column: span 2"] {
              grid-column: span 1 !important;
            }
          }

          .info-icon-wrapper {
            transition: all 0.2s ease;
          }

          .info-cell:hover .info-icon-wrapper {
            transform: scale(1.05);
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.1);
          }

          .last-mb-0:last-child {
            margin-bottom: 0 !important;
          }

          .image-thumbnail-container, .video-thumbnail-container {
            position: relative;
            cursor: pointer;
            overflow: hidden;
            background-color: #f1f5f9;
            height: 120px;
          }

          .image-thumbnail, .video-thumbnail {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.2s ease;
          }

          .image-thumbnail-container:hover .image-thumbnail {
            transform: scale(1.05);
          }

          .media-type-badge {
            position: absolute;
            bottom: 6px;
            right: 6px;
            font-size: 0.65rem;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
            display: flex;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }

          .video-play-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .video-thumbnail-container:hover .video-play-overlay {
            opacity: 1;
          }
        `}</style>
      </Modal.Body>
    </Modal>
  );
}

export default QCView;
