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




