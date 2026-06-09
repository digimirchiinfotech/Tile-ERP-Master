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

import React from 'react';
import {
  Modal,
  Card,
  Row,
  Col,
  Table,
  Badge,
  Button,
  ProgressBar,
  Image,
  Tabs,
  Tab
} from 'react-bootstrap';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  Print,
  Share,
  Star,
  Target,
  Camera,
  FileImage,
  User,
  Calendar,
  Package,
  Award,
  TrendingUp,
  Eye,
  X
} from 'lucide-react';

/**
 * QC Report Viewer Component
 * Features:
 * - Comprehensive inspection report display
 * - Multi-media evidence viewing
 * - Quality score visualization
 * - Checkpoint status tracking
 * - Defects documentation
 * - Export and sharing capabilities
 */
const QCReportViewer = ({ show, onHide, inspection }) => {
  if (!inspection) return null;

  const getStatusBadge = (status) => {
    const variants = {
      passed: 'success',
      failed: 'danger',
      pending: 'warning',
      'under-review': 'info'
    };
    
    const icons = {
      passed: <CheckCircle size={14} />,
      failed: <XCircle size={14} />,
      pending: <Clock size={14} />,
      'under-review': <AlertCircle size={14} />
    };

    return (
      <Badge bg={variants[status]} className="d-flex align-items-center gap-1">
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </Badge>
    );
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'warning';
    return 'danger';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create downloadable report
    const reportData = {
      ...inspection,
      generatedAt: new Date().toISOString(),
      reportVersion: '1.0'
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `QC_Report_${inspection.id}_${new Date().toLocaleDateString('en-CA')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `QC Report - ${inspection.productName}`,
        text: `Quality Control Report for ${inspection.productName} (${inspection.batchNumber})`,
        url: window.location.href
      });
    } else {
      // Fallback - copy to clipboard
      const reportUrl = `${window.location.origin}/qc-report/${inspection.id}`;
      navigator.clipboard.writeText(reportUrl);
      alert('Report link copied to clipboard!');
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Eye size={20} className="me-2" />
          Quality Control Report
          <Badge bg="secondary" className="ms-2">{inspection.batchNumber}</Badge>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Header Section */}
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={8}>
                <h4 className="mb-2">{inspection.productName}</h4>
                <div className="d-flex flex-wrap gap-3 mb-3">
                  <div className="d-flex align-items-center text-muted">
                    <Package size={16} className="me-1" />
                    <span>{inspection.productRef}</span>
                  </div>
                  <div className="d-flex align-items-center text-muted">
                    <User size={16} className="me-1" />
                    <span>{inspection.inspector}</span>
                  </div>
                  <div className="d-flex align-items-center text-muted">
                    <Calendar size={16} className="me-1" />
                    <span>{new Date(inspection.inspectionDate).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Priority and Tags */}
                <div className="d-flex flex-wrap gap-2">
                  <Badge bg={inspection.priority === 'high' ? 'danger' : inspection.priority === 'medium' ? 'warning' : 'secondary'}>
                    {inspection.priority.toUpperCase()} PRIORITY
                  </Badge>
                  {inspection.tags?.map(tag => (
                    <Badge key={tag} bg="info" className="text-capitalize">
                      {tag.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </Col>
              
              <Col md={4}>
                <div className="text-center">
                  <div className="mb-2">
                    <h5>Overall Status</h5>
                    {getStatusBadge(inspection.status)}
                  </div>
                  
                  <div className="mb-3">
                    <h6 className="text-muted">Quality Score</h6>
                    <div className="d-flex align-items-center justify-content-center gap-3">
                      <ProgressBar
                        now={inspection.qualityScore}
                        variant={getScoreColor(inspection.qualityScore)}
                        style={{ width: '100px', height: '8px' }}
                      />
                      <Badge
                        bg={getScoreColor(inspection.qualityScore)}
                        className="px-3 py-2"
                        style={{ fontSize: '1rem' }}
                      >
                        {inspection.qualityScore}/100
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-center gap-2">
                    <Button size="sm" variant="outline-primary" onClick={handlePrint}>
                      <Print size={14} className="me-1" />
                      Print
                    </Button>
                    <Button size="sm" variant="outline-success" onClick={handleDownload}>
                      <Download size={14} className="me-1" />
                      Export
                    </Button>
                    <Button size="sm" variant="outline-info" onClick={handleShare}>
                      <Share size={14} className="me-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Tabs for Different Sections */}
        <Tabs defaultActiveKey="overview" className="mb-3">
          {/* Overview Tab */}
          <Tab eventKey="overview" title="Overview">
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <h6 className="mb-0">
                      <Target size={16} className="me-2" />
                      Inspection Summary
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Table size="sm" className="mb-0">
                      <tbody>
                        <tr>
                          <td><strong>Batch Number:</strong></td>
                          <td>{inspection.batchNumber}</td>
                        </tr>
                        <tr>
                          <td><strong>Samples Inspected:</strong></td>
                          <td>{inspection.samplesInspected}</td>
                        </tr>
                        <tr>
                          <td><strong>Defects Found:</strong></td>
                          <td>
                            <Badge bg={inspection.defectsFound === 0 ? 'success' : inspection.defectsFound <= 2 ? 'warning' : 'danger'}>
                              {inspection.defectsFound}
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Next Inspection:</strong></td>
                          <td>{inspection.nextInspectionDate ? new Date(inspection.nextInspectionDate).toLocaleDateString() : 'Not scheduled'}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">
                      <Award size={16} className="me-2" />
                      Quality Metrics
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row className="text-center">
                      <Col>
                        <div className="mb-2">
                          <h4 className="text-success mb-0">
                            {inspection.checkpoints?.filter(cp => cp.status === 'passed').length || 0}
                          </h4>
                          <small className="text-muted">Passed</small>
                        </div>
                      </Col>
                      <Col>
                        <div className="mb-2">
                          <h4 className="text-danger mb-0">
                            {inspection.checkpoints?.filter(cp => cp.status === 'failed').length || 0}
                          </h4>
                          <small className="text-muted">Failed</small>
                        </div>
                      </Col>
                      <Col>
                        <div className="mb-2">
                          <h4 className="text-warning mb-0">
                            {inspection.checkpoints?.filter(cp => cp.status === 'pending').length || 0}
                          </h4>
                          <small className="text-muted">Pending</small>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                {/* Checkpoints Status */}
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">
                      <CheckCircle size={16} className="me-2" />
                      Checkpoint Status
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    {inspection.checkpoints?.map((checkpoint, index) => (
                      <div key={index} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-medium">{checkpoint.name}</span>
                          {getStatusBadge(checkpoint.status)}
                        </div>
                        
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <ProgressBar
                            now={checkpoint.score}
                            variant={getScoreColor(checkpoint.score)}
                            className="flex-grow-1"
                            style={{ height: '6px' }}
                          />
                          <span className="text-muted small">{checkpoint.score}/100</span>
                        </div>
                        
                        {checkpoint.notes && (
                          <small className="text-muted">{checkpoint.notes}</small>
                        )}
                      </div>
                    )) || (
                      <div className="text-center text-muted py-3">
                        <CheckCircle size={32} className="mb-2" />
                        <p>No checkpoints data available</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          {/* Defects Tab */}
          <Tab eventKey="defects" title={`Defects (${inspection.defectsFound})`}>
            <Card>
              <Card.Header>
                <h6 className="mb-0">
                  <AlertCircle size={16} className="me-2" />
                  Defects Found ({inspection.defectsFound})
                </h6>
              </Card.Header>
              <Card.Body>
                {inspection.defects && inspection.defects.length > 0 ? (
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Severity</th>
                        <th>Location</th>
                        <th>Description</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspection.defects.map((defect, index) => (
                        <tr key={index}>
                          <td>
                            <Badge bg="secondary">{defect.type}</Badge>
                          </td>
                          <td>
                            <Badge bg={defect.severity === 'critical' ? 'danger' : defect.severity === 'major' ? 'warning' : 'info'}>
                              {defect.severity}
                            </Badge>
                          </td>
                          <td>{defect.location}</td>
                          <td>{defect.description}</td>
                          <td>
                            <Badge bg="warning">Open</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-center text-muted py-5">
                    <CheckCircle size={64} className="mb-3 text-success" />
                    <h5 className="text-success">No Defects Found</h5>
                    <p>This inspection passed all quality checks</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab>

          {/* Media Tab */}
          <Tab eventKey="media" title={`Media (${(inspection.images?.length || 0) + (inspection.videos?.length || 0)})`}>
            <Row>
              {/* Images Section */}
              {inspection.images && inspection.images.length > 0 && (
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>
                      <h6 className="mb-0">
                        <FileImage size={16} className="me-2" />
                        Inspection Photos ({inspection.images.length})
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        {inspection.images.map((image, index) => (
                          <Col md={6} key={index} className="mb-3">
                            <div className="position-relative">
                              <Image
                                src={image.url}
                                alt={image.caption || `Inspection photo ${index + 1}`}
                                fluid
                                rounded
                                style={{ cursor: 'pointer', aspectRatio: '4/3', objectFit: 'cover' }}
                                onClick={() => {
                                  // Open image in modal or new window
                                  window.open(image.url, '_blank');
                                }}
                              />
                              
                              {image.type === 'defect' && (
                                <Badge
                                  bg="danger"
                                  className="position-absolute"
                                  style={{ top: '8px', right: '8px' }}
                                >
                                  Defect
                                </Badge>
                              )}
                            </div>
                            
                            {image.caption && (
                              <small className="text-muted d-block mt-1">{image.caption}</small>
                            )}
                          </Col>
                        ))}
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              )}

              {/* Videos Section */}
              {inspection.videos && inspection.videos.length > 0 && (
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>
                      <h6 className="mb-0">
                        <Camera size={16} className="me-2" />
                        Inspection Videos ({inspection.videos.length})
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      {inspection.videos.map((video, index) => (
                        <div key={index} className="mb-3">
                          <video
                            controls
                            style={{ width: '100%', maxHeight: '200px' }}
                            className="rounded"
                          >
                            <source src={video.url} type="video/mp4" />
                            Your browser does not support video playback.
                          </video>
                          
                          {video.caption && (
                            <small className="text-muted d-block mt-1">{video.caption}</small>
                          )}
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
              )}

              {(!inspection.images || inspection.images.length === 0) && (!inspection.videos || inspection.videos.length === 0) && (
                <Col>
                  <div className="text-center text-muted py-5">
                    <Camera size={64} className="mb-3" />
                    <h5>No Media Attached</h5>
                    <p>No photos or videos were captured during this inspection</p>
                  </div>
                </Col>
              )}
            </Row>
          </Tab>

          {/* Notes Tab */}
          <Tab eventKey="notes" title="Notes & Recommendations">
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <h6 className="mb-0">Inspector Notes</h6>
                  </Card.Header>
                  <Card.Body>
                    {inspection.notes ? (
                      <p>{inspection.notes}</p>
                    ) : (
                      <p className="text-muted fst-italic">No notes provided</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <h6 className="mb-0">Recommendations</h6>
                  </Card.Header>
                  <Card.Body>
                    {inspection.recommendations ? (
                      <p>{inspection.recommendations}</p>
                    ) : (
                      <p className="text-muted fst-italic">No recommendations provided</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Quality History or Trends could go here */}
            <Card>
              <Card.Header>
                <h6 className="mb-0">
                  <TrendingUp size={16} className="me-2" />
                  Quality Trends
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="text-center text-muted py-3">
                  <TrendingUp size={32} className="mb-2" />
                  <p>Quality trend analysis will be available here</p>
                  <small>Compare with previous inspections and identify patterns</small>
                </div>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-content-between align-items-center w-100">
          <div>
            <small className="text-muted">
              Report generated on {new Date().toLocaleString()}
            </small>
          </div>
          
          <div>
            <Button variant="secondary" onClick={onHide}>
              <X size={16} className="me-1" />
              Close
            </Button>
          </div>
        </div>
      </Modal.Footer>

      <style>{`
        @media print {
          .modal {
            position: static !important;
            display: block !important;
          }
          .modal-dialog {
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          .modal-header,
          .modal-footer {
            display: none !important;
          }
          .modal-body {
            padding: 0 !important;
          }
        }

        .checkpoint-item:hover {
          background-color: #f8f9fa;
        }

        .media-item {
          transition: transform 0.2s;
        }

        .media-item:hover {
          transform: scale(1.02);
        }
      `}</style>
    </Modal>
  );
};

export default QCReportViewer;




