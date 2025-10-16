// frontend/src/components/extraction/ExtractionButton.jsx
import './ExtractionButton.css';

export default function ExtractionButton({ loading, hasExtraction, onExtract, disabled = false }) {
  if (loading) {
    return (
      <button disabled className="extract-btn loading">
        Extracting...
      </button>
    );
  }

  // Limit reached - show disabled state
  if (disabled) {
    return (
      <button disabled className="extract-btn disabled">
        🚫 Limit Reached
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