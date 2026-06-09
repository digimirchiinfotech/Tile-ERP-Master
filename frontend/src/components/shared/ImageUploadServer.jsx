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
import { Button, Row, Col, Card, Modal, Alert } from 'react-bootstrap';
import { Upload, X, Eye, Trash2, Check } from 'lucide-react';
import { uploadProductImage } from '../../services/productImageService.js';

function ImageUploadServer({
  productId,
  images = [],
  onChange,
  maxFiles = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  onError,
  entityType = 'products',
}) {
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];

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

  const validateFiles = (files) => {
    const errors = [];

    for (const file of files) {
      // Check file type
      const ext = file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`❌ ${file.name} - Invalid file format. Only JPG, JPEG, PNG allowed.`);
        continue;
      }

      // Check file size
      if (file.size > maxFileSize) {
        const sizeMB = Math.round(file.size / (1024 * 1024) * 10) / 10;
        errors.push(`❌ ${file.name} - Image size must be 5 MB or less (${sizeMB}MB).`);
      }
    }

    return errors;
  };

  const handleFiles = async (files) => {
    setUploadError('');
    setUploadSuccess('');

    // Validate files first
    const validationErrors = validateFiles(files);
    if (validationErrors.length > 0) {
      setUploadError(validationErrors.join('\n'));
      if (onError) onError(validationErrors[0]);
      return;
    }

    // Check total count
    const validFiles = files.filter((file) => {
      const ext = file.name.split('.').pop().toLowerCase();
      return ALLOWED_TYPES.includes(file.type) && ALLOWED_EXTENSIONS.includes(ext) && file.size <= maxFileSize;
    });

    if (images.length + validFiles.length > maxFiles) {
      const msg = `❌ Cannot upload ${validFiles.length} image(s). Maximum ${maxFiles} images allowed. Currently have ${images.length} image(s).`;
      setUploadError(msg);
      alert(msg);
      if (onError) onError(msg);
      return;
    }

    setIsUploading(true);

    try {
      const uploadedImages = [];
      const uploadErrors = [];

      for (const file of validFiles) {
        try {
          const uploadedImage = await uploadProductImage(productId, file, entityType);
          uploadedImages.push(uploadedImage);
        } catch (error) {
          const errMsg = error.response?.data?.message || `Failed to upload ${file.name}`;
          uploadErrors.push(`❌ ${file.name} - ${errMsg}`);
        }
      }

      if (uploadedImages.length > 0) {
        onChange([...images, ...uploadedImages]);
        setUploadSuccess(`✅ Successfully uploaded ${uploadedImages.length} image(s)`);
        // Clear success message after 3 seconds
        setTimeout(() => setUploadSuccess(''), 3000);
      }

      if (uploadErrors.length > 0) {
        setUploadError(uploadErrors.join('\n'));
        if (onError) onError(uploadErrors[0]);
      }
    } catch (error) {
      const msg = error.message || 'Failed to upload images';
      setUploadError(msg);
      if (onError) onError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (imageId) => {
    const updatedImages = images.filter((img) => img.id !== imageId);
    onChange(updatedImages);
    setUploadError('');
    setUploadSuccess('');
  };

  const openPreview = (image) => {
    setPreviewImage(image);
    setShowPreview(true);
  };

  const formatFileSize = (bytes) => {
    const numBytes = Number(bytes);
    if (isNaN(numBytes) || numBytes <= 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImageUrl = (image) => {
    // Try to get URL from various possible field names
    const imageUrl = image.path || image.url || image.imageUrl || '';
    
    // If it's already a full URL from backend, use it directly
    if (imageUrl?.startsWith('http')) {
      return imageUrl;
    }
    
    // If it's a relative path like /uploads/..., use it as-is
    if (imageUrl?.startsWith('/uploads/')) {
      return imageUrl;
    }
    
    // If it's just a filename, prepend /uploads/
    if (imageUrl && !imageUrl.startsWith('/')) {
      return `/uploads/${imageUrl}`;
    }
    
    // Fallback to placeholder
    return imageUrl || '/images/placeholder.png';
  };

  return (
    <>
      {uploadError && (
        <Alert variant="secondary" className="mb-3" onClose={() => setUploadError('')} dismissible>
          <pre style={{ fontSize: '0.9rem', marginBottom: 0, whiteSpace: 'pre-wrap' }}>
            {uploadError}
          </pre>
        </Alert>
      )}

      {uploadSuccess && (
        <Alert variant="primary" className="mb-3" onClose={() => setUploadSuccess('')} dismissible>
          {uploadSuccess}
        </Alert>
      )}

      <div className="image-upload-container">
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          style={{ cursor: isUploading ? 'wait' : 'pointer' }}
        >
          <div className="upload-content">
            <Upload size={48} className="upload-icon" />
            <h6>Drag & drop images here</h6>
            <p className="text-muted">or click to browse</p>
            <small className="text-muted">
              Supports: JPG, JPEG, PNG (Max: {maxFiles} images, 5 MB each)
            </small>
            {isUploading && (
              <p className="text-primary mt-2">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Uploading image(s)...
              </p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileSelect}
            disabled={isUploading}
            style={{ display: 'none' }}
          />
        </div>

        {/* Display uploaded images */}
        {images.length > 0 && (
          <div className="images-grid mt-4">
            <div className="mb-2">
              <strong>Uploaded Images ({images.length}/{maxFiles}):</strong>
            </div>
            <Row className="g-3">
              {images.map((image) => (
                <Col key={image.id} xs={6} sm={4} md={3} lg={2}>
                  <Card className="image-card shadow-sm">
                    <div className="image-wrapper">
                      <img
                        src={getImageUrl(image)}
                        alt={image.name}
                        className="image-thumbnail"
                        onError={(e) => {
                          e.target.src = '/images/placeholder.png';
                        }}
                      />
                      <div className="image-overlay">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(image);
                          }}
                          className="me-1"
                          title="Preview"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(image.id);
                          }}
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <Card.Body className="p-2">
                      <small
                        className="text-truncate d-block"
                        title={image.name}
                        style={{ fontWeight: '500' }}
                      >
                        {image.name}
                      </small>
                      <small className="text-muted">
                        {formatFileSize(image.size)}
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {images.length === 0 && !uploadError && !uploadSuccess && (
          <div style={{ textAlign: 'center', padding: '1rem 0', color: '#94a3b8' }}>
            <small style={{ fontSize: '0.875rem' }}>No images uploaded yet</small>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Image Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {previewImage && (
            <div>
              <img
                src={getImageUrl(previewImage)}
                alt={previewImage.name}
                className="img-fluid"
                style={{ maxHeight: '70vh', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.src = '/images/placeholder.png';
                }}
              />
              <div className="mt-3">
                <h6 className="text-truncate">{previewImage.name}</h6>
                <p className="text-muted mb-0">
                  <small>Size: {formatFileSize(previewImage.size)}</small>
                </p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .image-upload-container {
          width: 100%;
        }

        .upload-area {
          border: 2px dashed #cbd5e1;
          border-radius: 0.375rem;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f0f7fa;
        }

        .upload-area:hover,
        .upload-area.drag-active {
          border-color: #06b6d4;
          background: #ecf8fc;
        }

        .upload-content {
          pointer-events: none;
        }

        .upload-icon {
          color: #94a3b8;
          margin-bottom: 1.5rem;
          display: inline-block;
        }

        .upload-area:hover .upload-icon,
        .upload-area.drag-active .upload-icon {
          color: #06b6d4;
        }

        .upload-area h6 {
          color: #1e293b;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .upload-area p {
          color: #64748b;
          margin: 0.5rem 0;
        }

        .upload-area small {
          color: #94a3b8;
          display: block;
        }

        .images-grid {
          max-height: 500px;
          overflow-y: auto;
          padding: 1rem 0;
        }

        .image-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }

        .image-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
        }

        .image-wrapper {
          position: relative;
          overflow: hidden;
        }

        .image-thumbnail {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 0.375rem 0.375rem 0 0;
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .image-card:hover .image-overlay {
          opacity: 1;
        }

        @media (max-width: 576px) {
          .upload-area {
            padding: 1rem;
          }
          
          .upload-icon {
            width: 32px;
            height: 32px;
          }
          
          .image-thumbnail {
            height: 80px;
          }
        }
      `}</style>
    </>
  );
}

export default ImageUploadServer;




