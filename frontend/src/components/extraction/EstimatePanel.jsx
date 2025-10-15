// frontend/src/components/extraction/EstimatePanel.jsx
import './EstimatePanel.css';

export default function EstimatePanel({ estimate }) {
  if (!estimate) return null;

  const { estimate: est, summary } = estimate;

  return (
    <div className="estimate-panel">
      <h3 className="estimate-title">Estimate Summary</h3>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Amount</div>
          <div className="metric-value total">
            ${Number(est.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">AI Items</div>
          <div className="metric-value ai">{summary.ai_items_count}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Human Edits</div>
          <div className="metric-value edited">{summary.human_edits_count}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Completion</div>
          <div className="metric-value completion">{summary.completion_percentage}%</div>
        </div>
      </div>

      <div className="dataset-metrics">
        <h4 className="dataset-title">📊 Dataset Valuation Metrics</h4>
        <div className="dataset-grid">
          <div className="dataset-item">
            <span className="label">Total Line Items:</span>
            <span className="value">{summary.line_items_count}</span>
          </div>
          <div className="dataset-item">
            <span className="label">Human Additions:</span>
            <span className="value highlight">{summary.human_additions_count}</span>
          </div>
          <div className="dataset-item">
            <span className="label">Pages Reviewed:</span>
            <span className="value">{summary.pages_reviewed} / {summary.total_pages}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.open(`${import.meta.env.VITE_API_URL}/estimates/${est.id}/export`, '_blank')}
        className="download-btn"
      >
        📥 Download Export (AI vs Human Delta)
      </button>
    </div>
  );
}