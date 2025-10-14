// frontend/src/components/extraction/PageNavigator.jsx
import './PageNavigator.css';

export default function PageNavigator({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="page-navigator">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="nav-btn"
      >
        ← Prev
      </button>

      <div className="page-input-group">
        <span className="page-label">Page</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={currentPage}
          onChange={(e) => onPageChange(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
          className="page-input"
        />
        <span className="page-label">of {totalPages}</span>
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="nav-btn"
      >
        Next →
      </button>
    </div>
  );
}