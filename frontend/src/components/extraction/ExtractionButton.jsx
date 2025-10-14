// frontend/src/components/extraction/ExtractionButton.jsx
import './ExtractionButton.css';

export default function ExtractionButton({ loading, hasExtraction, onExtract }) {
  if (loading) {
    return (
      <button disabled className="extract-btn loading">
        Extracting...
      </button>
    );
  }

  if (hasExtraction) {
    return (
      <button onClick={onExtract} className="extract-btn has-extraction">
        ✓ Re-extract Page
      </button>
    );
  }

  return (
    <button onClick={onExtract} className="extract-btn primary">
      🤖 Extract with AI
    </button>
  );
}