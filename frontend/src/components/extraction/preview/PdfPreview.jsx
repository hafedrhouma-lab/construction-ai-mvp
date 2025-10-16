// components/extraction/preview/PdfPreview.jsx
// 🚀 MODIFIED: Added lazy loading for compact mode
import { useState, useEffect } from 'react';
import { Maximize2, X, ZoomIn, ZoomOut, RotateCw, Eye } from 'lucide-react';
import axios from 'axios';
import './PdfPreview.css';

const API_URL = import.meta.env.VITE_API_URL || '${API_URL}';

export default function PdfPreview({ fileId, pageNumber, compact = false }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false); // 🚀 CHANGED: Start as false, not true
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  console.log('🎨 PdfPreview render:', { fileId, pageNumber, compact, loading, imageUrl: imageUrl ? 'loaded' : 'null', error });

  // 🚀 MODIFIED: Removed auto-fetch useEffect
  // Preview now loads only when fetchPreview() is called manually

  const fetchPreview = async () => {
    if (loading || imageUrl) return; // Don't reload if already loading/loaded

    try {
      setLoading(true);
      setError(null);

      console.log(`📄 Loading preview for page ${pageNumber}...`);

      const response = await axios.get(
        `${API_URL}/extractions/preview/${fileId}/${pageNumber}`
      );

      console.log('✅ Preview response:', response.data);
      setImageUrl(response.data.image);
    } catch (err) {
      console.error('❌ Failed to load preview:', err);
      setError('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  // Reset zoom/rotation when page changes
  useEffect(() => {
    setZoom(100);
    setRotation(0);
    // 🚀 MODIFIED: Clear imageUrl when page changes (forces re-load)
    setImageUrl(null);
    setError(null);
  }, [pageNumber]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom(z => Math.max(z - 25, 50));
  const handleRotate = () => setRotation(r => (r + 90) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  // 🚀 NEW: Show "Load Preview" button in compact mode when not loaded
  if (compact && !imageUrl && !loading && !error) {
    return (
      <div className="pdf-preview-compact-placeholder">
        <div className="pdf-preview-placeholder-content">
          <div className="pdf-preview-placeholder-icon">📄</div>
          <p className="pdf-preview-placeholder-text">Page {pageNumber}</p>
          <button
            onClick={fetchPreview}
            className="pdf-preview-load-btn"
          >
            <Eye size={16} />
            <span>Load Preview</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log('🔄 Rendering loading state (compact:', compact, ')');
    return (
      <div className={compact ? "pdf-preview-loading-compact" : "pdf-preview-loading"}>
        <div className="pdf-preview-loading-content">
          <svg className="pdf-preview-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {!compact && <p className="pdf-preview-loading-text">Loading page {pageNumber}...</p>}
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Rendering error state');
    return (
      <div className={compact ? "pdf-preview-error-compact" : "pdf-preview-error"}>
        <p className="pdf-preview-error-text">Failed to load</p>
        <button onClick={fetchPreview} className="pdf-preview-retry-btn">
          Retry
        </button>
      </div>
    );
  }

  if (compact) {
    console.log('📦 Rendering compact mode with imageUrl:', imageUrl ? 'exists' : 'null');
    return (
      <>
        <div className="pdf-preview-compact">
          <div className="pdf-preview-compact-image-wrapper">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Page ${pageNumber}`}
                className="pdf-preview-compact-image"
                onLoad={() => console.log('✅ Image loaded successfully')}
                onError={(e) => console.error('❌ Image failed to load:', e)}
              />
            ) : (
              <p>No image URL</p>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="pdf-preview-compact-expand"
            title="View fullscreen"
          >
            <Maximize2 size={14} />
            <span>Expand</span>
          </button>
        </div>

        {showModal && (
          <div className="pdf-preview-modal" onClick={() => setShowModal(false)}>
            <div className="pdf-preview-modal-content" onClick={(e) => e.stopPropagation()}>

              <div className="pdf-preview-modal-header">
                <h3 className="pdf-preview-modal-title">Page {pageNumber}</h3>

                <div className="pdf-preview-modal-controls">
                  <button onClick={handleZoomOut} className="pdf-preview-control-btn" disabled={zoom <= 50}>
                    <ZoomOut size={18} />
                  </button>
                  <span className="pdf-preview-zoom-level">{zoom}%</span>
                  <button onClick={handleZoomIn} className="pdf-preview-control-btn" disabled={zoom >= 200}>
                    <ZoomIn size={18} />
                  </button>
                  <button onClick={handleRotate} className="pdf-preview-control-btn">
                    <RotateCw size={18} />
                  </button>
                  <button onClick={handleReset} className="pdf-preview-control-btn">
                    Reset
                  </button>
                </div>

                <button onClick={() => setShowModal(false)} className="pdf-preview-modal-close">
                  <X size={20} />
                </button>
              </div>

              <div className="pdf-preview-modal-body">
                <img
                  src={imageUrl}
                  alt={`Page ${pageNumber}`}
                  className="pdf-preview-modal-image"
                  style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  console.log('⚠️ Returning null - not compact mode?');
  return null;
}