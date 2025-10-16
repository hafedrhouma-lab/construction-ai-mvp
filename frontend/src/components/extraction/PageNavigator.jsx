// frontend/src/components/extraction/PageNavigator.jsx
// Prev/Next = jump to relevant pages only (30, 34, 38...)
// Typing = can go to any page (1, 2, 3...)

import './PageNavigator.css';

export default function PageNavigator({
  currentPage,
  totalPages,
  relevantPages = [],
  onPageChange
}) {
  const isFiltered = relevantPages.length > 0 && relevantPages.length < totalPages;
  const isRelevant = relevantPages.includes(currentPage);

  // For Prev/Next: use relevant pages if filtered, else all pages
  const navPages = isFiltered ? relevantPages : Array.from({ length: totalPages }, (_, i) => i + 1);
  const currentIndex = navPages.indexOf(currentPage);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < navPages.length - 1;
  const prevPage = hasPrev ? navPages[currentIndex - 1] : null;
  const nextPage = hasNext ? navPages[currentIndex + 1] : null;

  const handlePrevious = () => {
    if (prevPage) {
      onPageChange(prevPage);
    }
  };

  const handleNext = () => {
    if (nextPage) {
      onPageChange(nextPage);
    }
  };

  const handlePageInput = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= totalPages) {
      onPageChange(value);
    }
  };

  return (
    <div className="page-navigator">
      <button
        onClick={handlePrevious}
        disabled={!hasPrev}
        className="nav-btn"
        title={prevPage ? `Go to page ${prevPage}` : 'No previous relevant page'}
      >
        ← Prev
      </button>

      <div className="page-input-group">
        <div className="page-info">
          <div className="page-current">
            <span className="page-label">Page</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={handlePageInput}
              className="page-input"
              title="Type any page number"
            />
          </div>

          <div className="page-details">
            <span className="page-position">of {totalPages}</span>
            {isFiltered && (
              <span className={`page-relevance ${isRelevant ? 'relevant' : 'not-relevant'}`}>
                {isRelevant ? '✓ Relevant' : '○ Not relevant'}
              </span>
            )}
          </div>
        </div>

        {isFiltered && (
          <div className="relevant-counter">
            {isRelevant ? `${currentIndex + 1} of ${navPages.length} relevant` : `${navPages.length} relevant pages total`}
          </div>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!hasNext}
        className="nav-btn"
        title={nextPage ? `Go to page ${nextPage}` : 'No next relevant page'}
      >
        Next →
      </button>
    </div>
  );
}