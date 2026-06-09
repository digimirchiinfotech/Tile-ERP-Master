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
import {
  Button,
  Row,
  Col,
  Card,
  Alert,
  ProgressBar,
  Badge,
} from 'react-bootstrap';
import {
  Upload,
  X,
  Eye,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Camera} from 'lucide-react';
import api from '../../services/api';

function QCMediaUpload({
  sectionName,
  images = [],
  videos = [],
  onChange,
  maxFiles = 50,
  maxFileSize = 10 * 1024 * 1024,
}) {
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
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
    const totalCurrentFiles = images.length + videos.length;

    if (totalCurrentFiles + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed per section`);
      return;
    }

    const validFiles = files.filter((file) => {
      const isValidType = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/webm',
      ].includes(file.type);
      const isValidSize = file.size <= maxFileSize;
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      alert('Some files were skipped due to invalid format or size');
    }

    // Process files in chunks for better performance
    await processFilesInChunks(validFiles);
  };

  const processFilesInChunks = async (files) => {
    setIsUploading(true);
    const chunkSize = 5; // Process 5 files at a time
    const chunks = [];

    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }

    const newImages = [...images];
    const newVideos = [...videos];

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      await Promise.all(
        chunk.map(async (file, fileIndex) => {
          const fileId = `${Date.now()}_${chunkIndex}_${fileIndex}`;

          try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);

            // Upload file to backend
            setUploadProgress((prev) => ({
              ...prev,
              [fileId]: 10,
            }));

            const response = await api.post('/qc-records/temp/upload-media', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress((prev) => ({
                  ...prev,
                  [fileId]: Math.min(percentCompleted, 95),
                }));
              },
              skipTransform: true,
            });

            const uploadedFile = response.data?.data || response.data;
            const fileUrl = uploadedFile.url || uploadedFile.filename;

            setUploadProgress((prev) => ({
              ...prev,
              [fileId]: 100,
            }));

            const fileData = {
              id: fileId,
              name: file.name,
              size: file.size,
              url: fileUrl,
              type: file.type,
              uploadDate: new Date().toISOString(),
            };

            if (file.type.startsWith('image/')) {
              newImages.push(fileData);
            } else if (file.type.startsWith('video/')) {
              newVideos.push(fileData);
            }
          } catch (error) {
            console.error('Error uploading file:', error);
            alert(`Failed to upload ${file.name}`);
          }
        })
      );
    }

    // Convert sectionName to proper key format
    const sectionKey = sectionName.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
    const sectionKeyMap = {
      'onlinechecking': 'onlineChecking',
      'flooring': 'flooring',
      'joint': 'joint',
      'curvature': 'curvature',
      'thickness': 'thickness',
      'glossy': 'glossy',
      'lvalue': 'lValue',
      'boxweight': 'boxWeight',
      'palletpacking': 'palletPacking',
      'morbreakage': 'mor',
    };
    
    const mappedKey = sectionKeyMap[sectionKey] || sectionKey;
    onChange(mappedKey, 'images', newImages);
    onChange(mappedKey, 'videos', newVideos);
    setIsUploading(false);
    setUploadProgress({});
  };

  const removeFile = (fileId, type) => {
    const sectionKey = sectionName.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
    const sectionKeyMap = {
      'onlinechecking': 'onlineChecking',
      'flooring': 'flooring',
      'joint': 'joint',
      'curvature': 'curvature',
      'thickness': 'thickness',
      'glossy': 'glossy',
      'lvalue': 'lValue',
      'boxweight': 'boxWeight',
      'palletpacking': 'palletPacking',
      'morbreakage': 'mor',
    };
    
    const mappedKey = sectionKeyMap[sectionKey] || sectionKey;
    
    if (type === 'image') {
      const updatedImages = images.filter((img) => img.id !== fileId);
      const fileToRemove = images.find((img) => img.id === fileId);
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      onChange(mappedKey, 'images', updatedImages);
    } else {
      const updatedVideos = videos.filter((vid) => vid.id !== fileId);
      const fileToRemove = videos.find((vid) => vid.id === fileId);
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      onChange(mappedKey, 'videos', updatedVideos);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalFiles = images.length + videos.length;
  const hasRequiredMedia = totalFiles > 0;

  return (
    <Card className="qc-media-section">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h6 className="mb-0 text-white">{sectionName}</h6>
          <small className="text-white-50">
            {totalFiles}/{maxFiles} files • Images: {images.length} • Videos:{' '}
            {videos.length}
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          {hasRequiredMedia ? (
            <CheckCircle size={16} className="text-success" />
          ) : (
            <AlertTriangle size={16} className="text-white-50" />
          )}
          <Badge bg={hasRequiredMedia ? 'success' : 'secondary'}>
            {hasRequiredMedia ? 'Complete' : 'Optional'}
          </Badge>
        </div>
      </Card.Header>
      <Card.Body className="p-3">
        {/* Upload Area */}
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-content text-center">
            <div className="d-flex justify-content-center gap-3 mb-3">
              <div className="text-center">
                <Camera size={28} className="upload-icon mb-1" />
              </div>
              <div className="text-center border-start ps-3">
                <Upload size={28} className="upload-icon mb-1" />
              </div>
            </div>
            <p className="mb-1 fw-bold text-primary">Tap to Capture or Browse</p>
            <small className="text-muted d-none d-md-block">
              Images: JPG, PNG, GIF, WebP (4MB max) • Videos: MP4, AVI, MOV (10MB max)
            </small>
            <small className="text-muted d-block d-md-none" style={{fontSize: '0.7rem'}}>
              Uses device camera for instant capture
            </small>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Upload Progress */}
        {isUploading && Object.keys(uploadProgress).length > 0 && (
          <div className="mt-3">
            <small className="text-muted">Uploading files...</small>
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="mb-2">
                <ProgressBar now={progress} label={`${progress}%`} />
              </div>
            ))}
          </div>
        )}

        {/* Media Grid */}
        {totalFiles > 0 && (
          <div className="media-grid mt-3">
            <Row className="g-2">
              {/* Images */}
              {images.map((image) => (
                <Col key={image.id} xs={6} sm={4} md={3}>
                  <div className="media-item">
                    <div className="media-wrapper">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="media-thumbnail"
                      />
                      <div className="media-overlay">
                        <Button variant="outline" size="sm" className="me-1">
                          <Eye size={12} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(image.id, 'image');
                          }}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    </div>
                    <div className="media-info p-1">
                      <small
                        className="text-truncate d-block"
                        title={image.name}
                      >
                        📷 {image.name}
                      </small>
                      <small className="text-muted">
                        {formatFileSize(image.size)}
                      </small>
                    </div>
                  </div>
                </Col>
              ))}

              {/* Videos */}
              {videos.map((video) => (
                <Col key={video.id} xs={6} sm={4} md={3}>
                  <div className="media-item">
                    <div className="media-wrapper">
                      <video
                        src={video.url}
                        className="media-thumbnail"
                        muted
                      />
                      <div className="media-overlay">
                        <Button variant="outline" size="sm" className="me-1">
                          <Play size={12} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(video.id, 'video');
                          }}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    </div>
                    <div className="media-info p-1">
                      <small
                        className="text-truncate d-block"
                        title={video.name}
                      >
                        🎥 {video.name}
                      </small>
                      <small className="text-muted">
                        {formatFileSize(video.size)}
                      </small>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* Status Alert - Optional */}
        {!hasRequiredMedia && (
          <Alert variant="info" className="mt-3 mb-0">
            <AlertTriangle size={16} className="me-2" />
            No media uploaded yet for this section. (Optional)
          </Alert>
        )}
      </Card.Body>

      <style>{`
        .qc-media-section {
          border: 2px solid ${hasRequiredMedia ? '#198754' : '#dee2e6'};
          transition: all 0.3s ease;
        }

        .upload-area {
          border: 2px dashed #dee2e6;
          border-radius: 0.5rem;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f8f9fa;
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .upload-area:hover,
        .upload-area.drag-active {
          border-color: #0d6efd;
          background: #e7f3ff;
        }

        .upload-icon {
          color: #6c757d;
        }

        .upload-area:hover .upload-icon,
        .upload-area.drag-active .upload-icon {
          color: #0d6efd;
        }

        .media-grid {
          max-height: 200px;
          overflow-y: auto;
        }

        .media-item {
          transition: transform 0.2s ease;
        }

        .media-item:hover {
          transform: translateY(-2px);
        }

        .media-wrapper {
          position: relative;
          overflow: hidden;
          border-radius: 0.375rem;
        }

        .media-thumbnail {
          width: 100%;
          height: 60px;
          object-fit: cover;
        }

        .media-overlay {
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

        .media-item:hover .media-overlay {
          opacity: 1;
        }

        .media-info {
          background: white;
          border-radius: 0 0 0.375rem 0.375rem;
        }

        @media (max-width: 576px) {
          .upload-area {
            padding: 0.75rem;
            min-height: 60px;
          }
          
          .media-thumbnail {
            height: 50px;
          }
          
          .media-info {
            padding: 0.5rem !important;
          }
          
          .media-info small {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </Card>
  );
}

export default QCMediaUpload;




