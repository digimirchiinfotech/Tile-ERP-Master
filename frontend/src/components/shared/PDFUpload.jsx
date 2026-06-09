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

import { useState, useRef } from 'react';
import { Button, Row, Col, Card, Modal } from 'react-bootstrap';
import { Upload, X, Eye, FileText, Download } from 'lucide-react';

function PDFUpload({ pdfs = [], onChange, maxFiles = 5 }) {
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPDF, setPreviewPDF] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const validFiles = files.filter((file) => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });

    if (pdfs.length + validFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} PDF files allowed`);
      return;
    }

    const newPDFs = validFiles.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      type: file.type,
    }));

    onChange([...pdfs, ...newPDFs]);
  };

  const removePDF = (pdfId) => {
    const updatedPDFs = pdfs.filter((pdf) => pdf.id !== pdfId);
    // Clean up object URLs
    const pdfToRemove = pdfs.find((pdf) => pdf.id === pdfId);
    if (pdfToRemove && pdfToRemove.url) {
      URL.revokeObjectURL(pdfToRemove.url);
    }
    onChange(updatedPDFs);
  };

  const openPreview = (pdf) => {
    setPreviewPDF(pdf);
    setShowPreview(true);
  };

  const downloadPDF = (pdf) => {
    const link = document.createElement('a');
    link.href = pdf.url;
    link.download = pdf.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    const numBytes = Number(bytes);
    if (isNaN(numBytes) || numBytes <= 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="pdf-upload-container">
        {/* Upload Area */}
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-content">
            <FileText size={48} className="upload-icon" />
            <h6>Drag & drop PDF files here</h6>
            <p className="text-muted">or click to browse</p>
            <small className="text-muted">
              Supports: PDF files only (Max: {maxFiles} files, 10MB each)
            </small>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* PDF List */}
        {pdfs.length > 0 && (
          <div className="pdfs-list mt-3">
            <Row className="g-3">
              {pdfs.map((pdf) => (
                <Col key={pdf.id} xs={12} sm={6} md={4}>
                  <Card className="pdf-card">
                    <Card.Body className="d-flex align-items-center">
                      <div className="pdf-icon me-3">
                        <FileText size={32} className="text-danger" />
                      </div>
                      <div className="pdf-info flex-grow-1">
                        <h6 className="mb-1 text-truncate" title={pdf.name}>
                          {pdf.name}
                        </h6>
                        <small className="text-muted">
                          {formatFileSize(pdf.size)}
                        </small>
                      </div>
                      <div className="pdf-actions">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPreview(pdf)}
                          className="me-1"
                          title="Preview"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPDF(pdf)}
                          className="me-1"
                          title="Download"
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePDF(pdf.id)}
                          title="Remove"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* Upload Progress */}
        <div className="upload-info mt-2">
          <small className="text-muted">
            {pdfs.length} of {maxFiles} PDF files uploaded
          </small>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        show={showPreview}
        onHide={() => setShowPreview(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>PDF Preview - {previewPDF?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ height: '80vh' }}>
          {previewPDF && (
            <iframe
              src={previewPDF.url}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title={previewPDF.name}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => downloadPDF(previewPDF)}
            className="me-2"
          >
            <Download size={16} className="me-1" />
            Download
          </Button>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .pdf-upload-container {
          width: 100%;
        }

        .upload-area {
          border: 2px dashed #dee2e6;
          border-radius: 0.5rem;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f8f9fa;
        }

        .upload-area:hover,
        .upload-area.drag-active {
          border-color: #dc3545;
          background: #ffeaea;
        }

        .upload-content {
          pointer-events: none;
        }

        .upload-icon {
          color: #6c757d;
          margin-bottom: 1rem;
        }

        .upload-area:hover .upload-icon,
        .upload-area.drag-active .upload-icon {
          color: #dc3545;
        }

        .pdfs-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .pdf-card {
          transition: transform 0.2s ease;
          cursor: pointer;
        }

        .pdf-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .pdf-info h6 {
          font-size: 0.9rem;
          max-width: 150px;
        }

        .pdf-actions {
          display: flex;
          gap: 0.25rem;
        }

        .upload-info {
          text-align: center;
        }

        @media (max-width: 576px) {
          .upload-area {
            padding: 1rem;
          }
          
          .upload-icon {
            width: 32px;
            height: 32px;
          }
          
          .pdf-actions {
            flex-direction: column;
            gap: 0.25rem;
          }
          
          .pdf-info h6 {
            max-width: 120px;
          }
        }
      `}</style>
    </>
  );
}

export default PDFUpload;




