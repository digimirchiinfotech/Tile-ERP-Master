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

import React, {
  useState, useEffect, useRef, useCallback
} from 'react';
import {
  Card, Button, Form, Row, Col, Alert, Spinner, Badge, Tab, Nav
} from 'react-bootstrap';
import {
  PenLine, Upload, Trash2, CheckCircle, Eye, RotateCcw, Save,
  ShieldCheck, Info, Clock, User
} from 'lucide-react';
import signatureService from '../../services/signatureService';
import { resolveImageUrl } from '../../utils/urlHelper';
import { showSuccess, showError } from '../shared/NotificationManager';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_MB = 2;

const DigitalSignature = ({ currentUser }) => {
  const isAdmin = ['super_admin', 'company_admin'].includes(currentUser?.role);

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeSignature, setActiveSignature] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [activeTab, setActiveTab]   = useState('upload');

  // Upload tab
  const [uploadFile, setUploadFile]         = useState(null);
  const [uploadPreview, setUploadPreview]   = useState(null);
  const [signatoryName, setSignatoryName]   = useState('');
  const [uploadError, setUploadError]       = useState('');

  // Draw tab
  const canvasRef         = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [drawName, setDrawName]   = useState('');
  const lastPoint             = useRef(null);

  const fileInputRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSignature = useCallback(async () => {
    try {
      setLoading(true);
      const res = await signatureService.getActive();
      setActiveSignature(res.data?.data || null);
    } catch {
      // No signature yet — not an error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSignature(); }, [fetchSignature]);

  // ── Upload handlers ────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only PNG, JPG, JPEG, WEBP files are allowed.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`File too large. Maximum allowed: ${MAX_MB} MB.`);
      return;
    }

    setUploadFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setUploadPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) { setUploadError('Please select a file first.'); return; }
    if (!signatoryName.trim()) { setUploadError('Signatory name is required.'); return; }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('signature', uploadFile);
      formData.append('signatory_name', signatoryName.toUpperCase());
      await signatureService.upload(formData);
      showSuccess('Signature uploaded and activated successfully.');
      setUploadFile(null);
      setUploadPreview(null);
      setSignatoryName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchSignature();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to upload signature');
    } finally {
      setSaving(false);
    }
  };

  // ── Canvas draw handlers (mouse + touch + stylus Pointer Events) ───────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Pointer Events (stylus pressure) / touch / mouse fallback
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
      pressure: e.pressure ?? 1
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    lastPoint.current = pos;
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    // Stylus pressure support: lineWidth varies with pressure (0.5–3px range)
    const pressure = pos.pressure || 1;
    ctx.lineWidth = Math.max(0.8, pressure * 2.5);
    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';
    ctx.strokeStyle = '#1a1a2e';

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    lastPoint.current = pos;
    setHasDrawing(true);
  };

  const stopDrawing = (e) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const handleSaveDrawn = async () => {
    if (!hasDrawing) { showError('Please draw a signature first.'); return; }
    if (!drawName.trim()) { showError('Please enter the signatory name.'); return; }

    const canvas = canvasRef.current;
    const base64 = canvas.toDataURL('image/png');

    try {
      setSaving(true);
      await signatureService.draw(base64, drawName.toUpperCase());
      showSuccess('Drawn signature saved and activated successfully.');
      clearCanvas();
      setDrawName('');
      await fetchSignature();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save drawn signature');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!activeSignature) return;
    if (!window.confirm('Deactivate the current signature? Documents already locked will not be affected.')) return;
    try {
      setDeleting(true);
      await signatureService.delete(activeSignature.id);
      showSuccess('Signature deactivated.');
      setActiveSignature(null);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to deactivate signature');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <Spinner animation="border" variant="primary" size="sm" />
        <span className="ms-2 text-muted">Loading signature...</span>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm mt-4" style={{ borderRadius: '12px' }}>
      <Card.Header
        className="py-3 px-4"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '12px 12px 0 0'
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <PenLine size={20} color="#a78bfa" />
          <h5 className="mb-0 fw-bold text-white">Digital Signature</h5>
          <Badge bg="info" className="ms-2" style={{ fontSize: '10px' }}>
            Company Profile
          </Badge>
        </div>
        <small className="text-white-50">
          Signature will appear on all export documents (Proforma Invoice, Export Invoice, Packing List, VGM, and more)
        </small>
      </Card.Header>

      <Card.Body className="p-4">
        {/* ── Current Active Signature Preview ─────────────────────────────── */}
        <div className="mb-4">
          <h6 className="fw-bold d-flex align-items-center gap-2 mb-3">
            <Eye size={16} className="text-primary" />
            Current Active Signature
          </h6>

          {activeSignature ? (() => {
            // API normalizer converts snake_case → camelCase on all responses
            const sigPath      = activeSignature.signaturePath      || activeSignature.signature_path;
            const sigType      = activeSignature.signatureType      || activeSignature.signature_type;
            const sigName      = activeSignature.signatoryName      || activeSignature.signatory_name || 'AUTHORIZED SIGNATORY';
            const updatedDate  = activeSignature.updatedAt          || activeSignature.updated_at;
            return (
              <div
                className="p-3 rounded border"
                style={{ background: '#f8faff', borderColor: '#d1e3ff !important' }}
              >
                <Row className="align-items-center g-3">
                  <Col md={6}>
                    <div
                      className="signature-preview-box p-3 bg-white rounded border text-center"
                      style={{ minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <img
                        src={resolveImageUrl(sigPath)}
                        alt="Active Signature"
                        style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="mt-2" style={{ borderTop: '1px solid #333', paddingTop: '4px', width: '80%', textAlign: 'center' }}>
                        <strong style={{ fontSize: '11px' }}>{sigName}</strong><br />
                        <span style={{ fontSize: '10px', color: '#666' }}>(AUTHORIZED SIGNATORY)</span>
                      </div>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex align-items-center gap-2 text-muted small">
                        <ShieldCheck size={14} className="text-success" />
                        <span>Type: <strong className="text-dark text-capitalize">{sigType || '—'}</strong></span>
                      </div>
                      <div className="d-flex align-items-center gap-2 text-muted small">
                        <Clock size={14} />
                        <span>
                          Saved: <strong className="text-dark">
                            {updatedDate
                              ? new Date(updatedDate).toLocaleDateString('en-GB', {
                                  day: '2-digit', month: 'short', year: 'numeric'
                                })
                              : '—'}
                          </strong>
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-2 text-muted small">
                        <User size={14} />
                        <span>Status: <Badge bg="success" style={{ fontSize: '10px' }}>Active</Badge></span>
                      </div>

                      {isAdmin && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="mt-2 d-flex align-items-center gap-1"
                          onClick={handleDelete}
                          disabled={deleting}
                        >
                          {deleting
                            ? <Spinner size="sm" />
                            : <Trash2 size={14} />}
                          Deactivate Signature
                        </Button>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>
            );
          })() : (
            <Alert variant="warning" className="d-flex align-items-center gap-2 mb-0">
              <Info size={16} />
              No active signature. Upload or draw one below to enable it on all export documents.
            </Alert>
          )}
        </div>

        {/* ── Upload / Draw Tabs (admin only) ──────────────────────────────── */}
        {isAdmin && (
          <>
            <hr />
            <h6 className="fw-bold d-flex align-items-center gap-2 mb-3">
              <Upload size={16} className="text-primary" />
              Add / Update Signature
            </h6>

            <Nav
              variant="tabs"
              activeKey={activeTab}
              onSelect={setActiveTab}
              className="mb-3"
            >
              <Nav.Item>
                <Nav.Link eventKey="upload" className="d-flex align-items-center gap-1">
                  <Upload size={14} /> Upload Image
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="draw" className="d-flex align-items-center gap-1">
                  <PenLine size={14} /> Draw Signature
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {/* ── UPLOAD TAB ─────────────────────────────────────────────── */}
            {activeTab === 'upload' && (
              <div>
                {uploadError && (
                  <Alert variant="danger" className="py-2 mb-3">{uploadError}</Alert>
                )}

                {/* Drop zone */}
                <div
                  className="upload-drop-zone rounded border-2 border-dashed text-center p-4 mb-3"
                  style={{
                    cursor: 'pointer',
                    borderColor: uploadPreview ? '#0d6efd' : '#ced4da',
                    background: uploadPreview ? '#f0f4ff' : '#fafafa',
                    transition: 'all 0.2s ease',
                    borderStyle: 'dashed'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect({ target: { files: [file] } });
                  }}
                >
                  {uploadPreview ? (
                    <>
                      <img
                        src={uploadPreview}
                        alt="Preview"
                        style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }}
                      />
                      <div className="mt-2 text-primary small fw-semibold">
                        ✓ {uploadFile?.name} — Click to change
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-muted mb-2" />
                      <div className="fw-semibold">Click or drag & drop your signature</div>
                      <div className="text-muted small mt-1">
                        PNG, JPG, JPEG, WEBP · Max {MAX_MB} MB · Transparent PNG recommended
                      </div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    className="d-none"
                    onChange={handleFileSelect}
                  />
                </div>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small">
                    Signatory Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder='e.g. AUTHORIZED SIGNATORY / DIRECTOR'
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <Form.Text className="text-muted">
                    This text prints below the signature on all documents
                  </Form.Text>
                </Form.Group>

                <Button
                  variant="primary"
                  className="d-flex align-items-center gap-2 fw-bold"
                  onClick={handleUploadSubmit}
                  disabled={saving || !uploadFile}
                >
                  {saving ? <Spinner size="sm" /> : <CheckCircle size={16} />}
                  Upload & Activate Signature
                </Button>
              </div>
            )}

            {/* ── DRAW TAB ───────────────────────────────────────────────── */}
            {activeTab === 'draw' && (
              <div>
                <Alert variant="info" className="py-2 mb-3 d-flex align-items-center gap-2">
                  <PenLine size={14} />
                  <span>
                    Draw with mouse, touch, or stylus pen. Stylus pressure is supported.
                  </span>
                </Alert>

                <div
                  className="rounded border mb-2"
                  style={{ background: '#fff', touchAction: 'none', lineHeight: 0 }}
                >
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    style={{
                      width: '100%',
                      height: '160px',
                      cursor: 'crosshair',
                      display: 'block',
                      touchAction: 'none'
                    }}
                    // Mouse events
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    // Touch events
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    // Pointer (stylus) events — highest priority
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                  />
                </div>

                <div className="d-flex gap-2 mb-3">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="d-flex align-items-center gap-1"
                    onClick={clearCanvas}
                  >
                    <RotateCcw size={13} /> Clear
                  </Button>
                  <span className="text-muted small align-self-center">
                    {hasDrawing ? '✓ Signature drawn' : 'Canvas is empty'}
                  </span>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small">
                    Signatory Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder='e.g. AUTHORIZED SIGNATORY / DIRECTOR'
                    value={drawName}
                    onChange={(e) => setDrawName(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Group>

                <Button
                  variant="success"
                  className="d-flex align-items-center gap-2 fw-bold"
                  onClick={handleSaveDrawn}
                  disabled={saving || !hasDrawing}
                >
                  {saving ? <Spinner size="sm" /> : <Save size={16} />}
                  Save Drawn Signature & Activate
                </Button>
              </div>
            )}

            {/* Info banner */}
            <Alert variant="secondary" className="mt-4 py-2 mb-0">
              <div className="d-flex align-items-start gap-2">
                <Info size={14} className="mt-1 flex-shrink-0" />
                <small>
                  <strong>Locked Document Protection:</strong> When a document is generated and
                  locked, the signature active at that moment is permanently frozen inside the
                  document. Even if you update the signature here, old locked documents will
                  continue to show their original signature.
                </small>
              </div>
            </Alert>
          </>
        )}

        {/* View-only notice for non-admins */}
        {!isAdmin && (
          <Alert variant="light" className="border mt-3 mb-0 py-2 d-flex align-items-center gap-2">
            <ShieldCheck size={14} className="text-primary" />
            <small>Signature management is restricted to Company Admin and Super Admin.</small>
          </Alert>
        )}
      </Card.Body>

      <style>{`
        .upload-drop-zone:hover {
          border-color: #0d6efd !important;
          background: #f0f4ff !important;
        }
      `}</style>
    </Card>
  );
};

export default DigitalSignature;
