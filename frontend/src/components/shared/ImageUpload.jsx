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
import { Upload, X, Eye } from 'lucide-react';

function ImageUpload({
  images = [],
  onChange,
  maxFiles = 10,
  maxFileSize = 5 * 1024 * 1024,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleFiles = async (files) => {
    const validFiles = files.filter((file) => {
      const isValidType = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ].includes(file.type);
      const isValidSize = file.size <= maxFileSize;
      return isValidType && isValidSize;
    });

    if (images.length + validFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} images allowed`);
      return;
    }

    setIsUploading(true);

    const newImagesPromises = validFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: Date.now() + Math.random(),
            file,
            name: file.name,
            size: file.size,
            url: reader.result,
            type: file.type,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const newImages = await Promise.all(newImagesPromises);
    onChange([...images, ...newImages]);
    setIsUploading(false);
  };

  const removeImage = (imageId) => {
    const updatedImages = images.filter((img) => img.id !== imageId);
    onChange(updatedImages);
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

  return (
    <>
      <div className="image-upload-container">
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-content">
            <Upload size={48} className="upload-icon" />
            <h6>Drag & drop images here</h6>
            <p className="text-muted">or click to browse</p>
            <small className="text-muted">
              Supports: JPG, PNG, GIF, WebP (Max: {maxFiles} files,{' '}
              {Math.round(maxFileSize / (1024 * 1024))}MB each)
            </small>
            {isUploading && <p className="text-primary mt-2">Converting images...</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {images.length > 0 && (
          <div className="images-grid mt-3">
            <Row className="g-3">
              {images.map((image) => (
                <Col key={image.id} xs={6} sm={4} md={3} lg={2}>
                  <Card className="image-card">
                    <div className="image-wrapper">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="image-thumbnail"
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
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                    <Card.Body className="p-2">
                      <small
                        className="text-truncate d-block"
                        title={image.name}
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

        <div className="upload-info mt-2">
          <small className="text-muted">
            {images.length} of {maxFiles} images uploaded
          </small>
        </div>
      </div>

      <Modal
        show={showPreview}
        onHide={() => setShowPreview(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Image Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {previewImage && (
            <div>
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="img-fluid"
                style={{ maxHeight: '70vh' }}
              />
              <div className="mt-3">
                <h6>{previewImage.name}</h6>
                <p className="text-muted">
                  Size: {formatFileSize(previewImage.size)} | Type:{' '}
                  {previewImage.type}
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
          border-color: #0d6efd;
          background: #e7f3ff;
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
          color: #0d6efd;
        }

        .images-grid {
          max-height: 400px;
          overflow-y: auto;
        }

        .image-card {
          transition: transform 0.2s ease;
          cursor: pointer;
        }

        .image-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .image-card:hover .image-overlay {
          opacity: 1;
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
          
          .image-thumbnail {
            height: 80px;
          }
        }
      `}</style>
    </>
  );
}

export default ImageUpload;




