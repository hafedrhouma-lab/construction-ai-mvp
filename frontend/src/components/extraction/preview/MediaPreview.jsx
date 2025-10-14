// components/extraction/preview/MediaPreview.jsx
import PdfPreview from './PdfPreview';
// import VideoPreview from './VideoPreview'; // Future

export default function MediaPreview({ file, currentPage, compact = false }) {
  if (!file) {
    return (
      <div className="media-preview-empty">
        <p>No file selected</p>
      </div>
    );
  }

  // Route to correct preview based on file type
  const fileType = file.file_type || file.mime_type;
  const filename = file.original_filename || '';

  // PDF
  if (fileType === 'application/pdf' || filename.endsWith('.pdf')) {
    return (
      <PdfPreview
        fileId={file.id}
        pageNumber={currentPage}
        compact={compact}  // ✅ PASS THE COMPACT PROP!
      />
    );
  }

  // Video (future)
  if (fileType?.startsWith('video/') || filename.match(/\.(mp4|mov|avi)$/i)) {
    // return <VideoPreview fileId={file.id} timestamp={currentPage} />;
    return (
      <div className="media-preview-placeholder">
        <p>🎥 Video preview coming soon!</p>
      </div>
    );
  }

  // Fallback
  return (
    <div className="media-preview-unsupported">
      <p>Unsupported file type: {fileType}</p>
    </div>
  );
}