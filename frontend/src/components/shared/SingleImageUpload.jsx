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
import { Button, Card, Modal } from 'react-bootstrap';
import { Upload, X, Eye, Camera } from 'lucide-react';

function SingleImageUpload({
  image = null,
  onChange,
  maxFileSize = 4 * 1024 * 1024,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    const isValidType = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ].includes(file.type);
    const isValidSize = file.size <= maxFileSize;

    if (!isValidType) {
      alert('Please select a valid image file (JPG, PNG, GIF, WebP)');
      return;
    }

    if (!isValidSize) {
      alert(
        `File size must be less than ${Math.round(
          maxFileSize / (1024 * 1024)
        )}MB`
      );
      return;
    }

    const imageData = {
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      type: file.type,
      uploadDate: new Date().toISOString(),
      isMain: true,
    };

    onChange(imageData);
  };

  const removeImage = () => {
    if (image && image.url) {
      URL.revokeObjectURL(image.url);
    }
    onChange(null);
  };

  const openPreview = () => {
    setShowPreview(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="single-image-upload-container">
        {!image ? (
          /* Upload Area */
          <div
            className={`upload-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-content">
              <Camera size={48} className="upload-icon" />
              <h6>Drop product image here</h6>
              <p className="text-muted">or click to browse</p>
              <small className="text-muted">
                Supports: JPG, PNG, GIF, WebP (Max:{' '}
                {Math.round(maxFileSize / (1024 * 1024))}MB)
              </small>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          /* Image Preview */
          <Card className="image-preview-card">
            <div className="image-wrapper">
              <img src={image.url} alt={image.name} className="preview-image" />
              <div className="image-overlay">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPreview}
                  className="me-2"
                >
                  <Eye size={16} />
                </Button>
                <Button variant="secondary" size="sm" onClick={removeImage}>
                  <X size={16} />
                </Button>
              </div>
            </div>
            <Card.Body className="p-3">
              <h6 className="mb-1 text-truncate" title={image.name}>
                {image.name}
              </h6>
              <small className="text-muted">{formatFileSize(image.size)}</small>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} className="me-1" />
                  Replace Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </Card.Body>
          </Card>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        show={showPreview}
        onHide={() => setShowPreview(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Product Image Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {image && (
            <div>
              <img
                src={image.url}
                alt={image.name}
                className="img-fluid"
                style={{ maxHeight: '70vh' }}
              />
              <div className="mt-3">
                <h6>{image.name}</h6>
                <p className="text-muted">
                  Size: {formatFileSize(image.size)} | Type: {image.type}
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
        .single-image-upload-container {
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
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
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

        .image-preview-card {
          max-width: 300px;
          margin: 0 auto;
          transition: transform 0.2s ease;
        }

        .image-preview-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .image-wrapper {
          position: relative;
          overflow: hidden;
        }

        .preview-image {
          width: 100%;
          height: 200px;
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

        .image-preview-card:hover .image-overlay {
          opacity: 1;
        }

        @media (max-width: 576px) {
          .upload-area {
            padding: 1rem;
            min-height: 150px;
          }
          
          .upload-icon {
            width: 32px;
            height: 32px;
          }
          
          .preview-image {
            height: 150px;
          }
        }
      `}</style>
    </>
  );
}

export default SingleImageUpload;




