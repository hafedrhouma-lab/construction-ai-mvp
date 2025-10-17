// frontend/src/pages/Demo.jsx
// COMPLETE VERSION WITH CONFLICT RESOLUTION + FULL CONTEXT IN PRICING

import React, { useState, useEffect } from 'react';
import './Demo.css';

const Demo = () => {
  const [stage, setStage] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [answers, setAnswers] = useState({});
  const [prices, setPrices] = useState({});
  const [editedItems, setEditedItems] = useState({});
  const [confirmedItems, setConfirmedItems] = useState(new Set());
  const [splitItems, setSplitItems] = useState([]);  // ✅ NEW: Track split items
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const API_URL = 'http://localhost:3001';

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, {
      message,
      type,
      time: new Date().toLocaleTimeString()
    }]);
  };

  // Get all items for pricing (original + split items)
  const getAllPricingItems = () => {
    if (!analysis?.line_items) return [];

    const items = [];

    // Add original items (that weren't split)
    analysis.line_items.forEach(item => {
      const wasSplit = splitItems.some(split => split.originalItem === item.item);
      if (!wasSplit) {
        items.push({
          id: item.item,
          item: item.item,
          quantity: item.quantity,
          unit: item.unit,
          locations: item.locations,
          pages: item.pages,
          original: true
        });
      }
    });

    // Add split items
    splitItems.forEach(split => {
      items.push({
        id: split.id,
        item: split.item,
        quantity: split.quantity,
        unit: split.unit,
        locations: [split.location],
        pages: split.pages,
        original: false,
        splitFrom: split.originalItem
      });
    });

    return items;
  };

  // Get current item (edited or original)
  const getItem = (itemId) => {
    if (editedItems[itemId]) {
      return editedItems[itemId];
    }

    // Check if it's a split item
    const splitItem = splitItems.find(s => s.id === itemId);
    if (splitItem) {
      return splitItem;
    }

    // Original item
    return analysis.line_items.find(i => i.item === itemId);
  };

  // Get original AI quantity
  const getOriginalQuantity = (itemId) => {
    // Check if it's a split item
    const splitItem = splitItems.find(s => s.id === itemId);
    if (splitItem) {
      return splitItem.original_quantity;
    }

    const original = analysis.line_items.find(i => i.item === itemId);
    return original ? original.quantity : 0;
  };

  // Calculate bid total using current (edited or original) quantities
  const bidTotal = getAllPricingItems().reduce((sum, item) => {
    const currentItem = getItem(item.id);
    const unitPrice = prices[item.id] || 0;
    return sum + (currentItem.quantity * unitPrice);
  }, 0);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setLogs([]);
      addLog(`📁 Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    } else {
      alert('Please select a PDF file');
    }
  };

  const startAnalysis = async () => {
    if (!selectedFile) {
      alert('Please select a PDF file first!');
      return;
    }

    setStage('analyzing');
    setLoading(true);
    setLogs([]);

    addLog('📤 Uploading document...', 'info');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      addLog('🚀 Starting AI analysis with parallel processing...', 'info');
      await sleep(500);

      const response = await fetch(`${API_URL}/api/demo/analyze`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      await sleep(500);
      addLog(`✅ Scanned ${data.scanned_pages} pages in ${data.processing_time.stage1}`, 'success');
      await sleep(500);

      addLog(`📍 Found ${data.relevant_pages.length} relevant pages`, 'success');
      await sleep(500);

      addLog(`⚡ Extracted ${data.line_items?.length || 0} line items in ${data.processing_time.stage2}`, 'success');
      await sleep(500);

      if (data.conflicts.length > 0) {
        addLog(`⚠️ Found ${data.conflicts.length} conflicts requiring review`, 'warning');
      } else {
        addLog('✅ No conflicts detected', 'success');
      }

      addLog(`💰 Total processing cost: $${data.cost_breakdown.total}`, 'info');

      setAnalysis(data);
      setStage('questions');
      setLoading(false);

    } catch (error) {
      console.error('Analysis error:', error);
      addLog(`❌ Error: ${error.message}`, 'error');
      setLoading(false);

      setTimeout(() => {
        alert(`Analysis failed: ${error.message}\n\nMake sure backend is running on ${API_URL}`);
        setStage('upload');
      }, 2000);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    // ✅ NEW: If user chooses to split, handle it
    const question = analysis.questions.find(q => q.id === questionId);
    if (question && answer.includes('Keep separate')) {
      handleSplitItem(question);
    }
  };

  // ✅ NEW: Handle splitting items by location
  const handleSplitItem = (question) => {
    const itemName = question.item;
    const originalItem = analysis.line_items.find(i => i.item === itemName);

    if (!originalItem || !originalItem.source_breakdown) {
      console.warn('Cannot split - no source breakdown available');
      return;
    }

    // Group by location
    const locationGroups = {};
    originalItem.source_breakdown.forEach(source => {
      const loc = source.location || 'not specified';
      if (!locationGroups[loc]) {
        locationGroups[loc] = {
          location: loc,
          quantity: 0,
          pages: []
        };
      }
      locationGroups[loc].quantity += source.quantity;
      locationGroups[loc].pages.push(source.page);
    });

    // Create split items
    const newSplitItems = Object.values(locationGroups).map((group, index) => ({
      id: `${itemName}_${group.location}_${index}`,
      item: `${itemName} (${group.location})`,
      originalItem: itemName,
      quantity: group.quantity,
      original_quantity: group.quantity,
      unit: originalItem.unit,
      location: group.location,
      locations: [group.location],
      pages: [...new Set(group.pages)],
      split: true
    }));

    setSplitItems(prev => [...prev, ...newSplitItems]);
    addLog(`📊 Split "${itemName}" into ${newSplitItems.length} items by location`, 'success');
  };

  const handlePriceChange = (itemId, price) => {
    setPrices(prev => ({
      ...prev,
      [itemId]: parseFloat(price) || 0
    }));
  };

  const handleQuantityEdit = (itemId, newQuantity) => {
    const currentItem = getItem(itemId);
    const originalQuantity = getOriginalQuantity(itemId);
    const newQty = parseFloat(newQuantity) || 0;

    setEditedItems(prev => ({
      ...prev,
      [itemId]: {
        ...currentItem,
        quantity: newQty,
        original_quantity: originalQuantity,
        edited: true,
        difference: newQty - originalQuantity
      }
    }));
  };

  const handleConfirmItem = (itemId) => {
    setConfirmedItems(prev => new Set([...prev, itemId]));
    addLog(`✅ Confirmed: ${getItem(itemId).item}`, 'success');
  };

  const handleSubmitAnswers = async () => {
    setStage('bidding');
  };

  const exportToCSV = () => {
    const pricingItems = getAllPricingItems();
    if (pricingItems.length === 0) return;

    // Build CSV content with AI vs Human tracking
    const headers = [
      'Item',
      'AI Quantity',
      'Human Quantity',
      'Difference',
      'Unit',
      'Location',
      'Pages',
      'Status',
      'Unit Price',
      'Total'
    ];

    const rows = pricingItems.map(item => {
      const currentItem = getItem(item.id);
      const originalQty = getOriginalQuantity(item.id);
      const currentQty = currentItem.quantity;
      const difference = currentQty - originalQty;
      const unitPrice = prices[item.id] || 0;
      const total = currentQty * unitPrice;

      // Determine status
      let status = 'AI Extracted';
      if (item.split) {
        status = 'Split from Conflict';
      }
      if (confirmedItems.has(item.id)) {
        status = editedItems[item.id]?.edited ? 'Edited & Confirmed' : 'Human Confirmed';
      } else if (editedItems[item.id]?.edited) {
        status = 'Edited (Not Confirmed)';
      }

      return [
        currentItem.item,
        originalQty,
        currentQty,
        difference !== 0 ? difference : '-',
        currentItem.unit,
        currentItem.locations?.join(' | ') || 'Various',
        currentItem.pages?.join(' | ') || '-',
        status,
        unitPrice.toFixed(2),
        total.toFixed(2)
      ];
    });

    // Add summary section
    rows.push(['', '', '', '', '', '', '', '', '', '']);
    rows.push(['SUMMARY', '', '', '', '', '', '', '', '', '']);
    rows.push(['Total Items', pricingItems.length, '', '', '', '', '', '', '', '']);
    rows.push(['Items Confirmed', confirmedItems.size, '', '', '', '', '', '', '', '']);
    rows.push(['Items Edited', Object.keys(editedItems).filter(k => editedItems[k].edited).length, '', '', '', '', '', '', '', '']);
    rows.push(['Items Split from Conflicts', splitItems.length, '', '', '', '', '', '', '', '']);
    rows.push(['Human Review Rate', `${((confirmedItems.size / pricingItems.length) * 100).toFixed(0)}%`, '', '', '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '', 'TOTAL BID:', '', bidTotal.toFixed(2)]);

    // Add metadata
    rows.push(['', '', '', '', '', '', '', '', '', '']);
    rows.push(['METADATA', '', '', '', '', '', '', '', '', '']);
    rows.push(['Export Date', new Date().toLocaleString(), '', '', '', '', '', '', '', '']);
    rows.push(['Document Pages', analysis.total_pages, '', '', '', '', '', '', '', '']);
    rows.push(['Pages Scanned', analysis.scanned_pages, '', '', '', '', '', '', '', '']);
    rows.push(['Processing Time', analysis.processing_time.total, '', '', '', '', '', '', '', '']);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bid-estimate-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    addLog('📥 CSV exported with AI vs Human comparison!', 'success');
  };

  const reset = () => {
    setStage('upload');
    setSelectedFile(null);
    setAnalysis(null);
    setAnswers({});
    setPrices({});
    setEditedItems({});
    setConfirmedItems(new Set());
    setSplitItems([]);
    setLogs([]);
    setLoading(false);
    setShowDetails(false);
  };

  const allQuestionsAnswered = analysis?.questions ?
    Object.keys(answers).length >= analysis.questions.length : false;

  const pricingItems = getAllPricingItems();

  return (
    <div className="demo-page">

      <div className="demo-header">
        <h1>🚀 AI Demo - Intelligent Document Analysis</h1>
        <p>Full-document understanding with conversational extraction</p>
      </div>

      <div className="demo-content">

        {/* UPLOAD STAGE */}
        {stage === 'upload' && (
          <div className="stage-card fade-in">
            <h2>📄 Upload Construction Document</h2>

            <div className="upload-zone">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                id="pdf-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="pdf-upload" className="upload-label">
                <div className="upload-icon">📁</div>
                {selectedFile ? (
                  <div className="file-selected">
                    <strong>{selectedFile.name}</strong>
                    <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <strong>Choose PDF File</strong>
                    <span>Click to browse</span>
                  </div>
                )}
              </label>
            </div>

            {logs.length > 0 && (
              <div className="log-preview">
                {logs.map((log, i) => (
                  <div key={i} className={`log-line log-${log.type}`}>
                    {log.message}
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn-primary"
              onClick={startAnalysis}
              disabled={!selectedFile || loading}
            >
              {loading ? '⏳ Analyzing...' : '🚀 Analyze Document'}
            </button>

            <div className="info-box">
              <h4>AI-Powered Extraction:</h4>
              <ul>
                <li>🔍 Parallel vision-based scanning</li>
                <li>📊 Counts items from plans automatically</li>
                <li>📏 Measures lengths using scale bars</li>
                <li>⚠️ Detects conflicts across pages</li>
                <li>💬 Asks intelligent clarifying questions</li>
                <li>✂️ Splits items by location when needed</li>
                <li>✏️ Human review & editing capability</li>
                <li>💰 Creates instant bid estimates</li>
              </ul>
            </div>
          </div>
        )}

        {/* ANALYZING STAGE */}
        {stage === 'analyzing' && (
          <div className="stage-card analyzing-card fade-in">
            <div className="spinner"></div>

            <h2>🔍 Analyzing with AI...</h2>
            <p>Using parallel processing for faster results</p>

            <div className="log-console">
              {logs.map((log, i) => (
                <div key={i} className={`log-line log-${log.type}`}>
                  <span className="log-time">{log.time}</span>
                  <span className="log-msg">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUESTIONS STAGE - WITH LINE ITEMS! */}
        {stage === 'questions' && analysis && (
          <div className="stage-card fade-in">
            <h2>🤔 Review Extracted Data & Resolve Conflicts</h2>

            <div className="stats-grid">
              <div className="stat">
                <div className="stat-value">{analysis.total_pages}</div>
                <div className="stat-label">Total Pages</div>
              </div>
              <div className="stat highlight">
                <div className="stat-value">{analysis.relevant_pages.length}</div>
                <div className="stat-label">Relevant</div>
              </div>
              <div className="stat success">
                <div className="stat-value">{analysis.line_items?.length || 0}</div>
                <div className="stat-label">Line Items</div>
              </div>
              <div className="stat warning">
                <div className="stat-value">{analysis.conflicts.length}</div>
                <div className="stat-label">Conflicts</div>
              </div>
            </div>

            {/* EXTRACTED LINE ITEMS TABLE */}
            {analysis.line_items && analysis.line_items.length > 0 && (
              <div className="section line-items-section">
                <h3>📦 Extracted Line Items (Ready for Review)</h3>
                <p className="section-desc">AI automatically extracted these items from your construction plans. Review the quantities below.</p>

                <div className="line-items-table-wrapper">
                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Location</th>
                        <th>Found On Pages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.line_items.map((item, i) => (
                        <tr key={i}>
                          <td className="item-name">{item.item}</td>
                          <td className="item-qty"><strong>{item.quantity}</strong></td>
                          <td>{item.unit}</td>
                          <td className="item-location">{item.locations.join(', ') || 'Various'}</td>
                          <td className="item-pages">{item.pages.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  className="btn-secondary"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? '▲ Hide Extraction Details' : '▼ Show Extraction Details'}
                </button>
              </div>
            )}

            {/* Show extraction details */}
            {showDetails && analysis.document_map && (
              <div className="section details-section">
                <h3>📋 Extraction Details by Page</h3>
                {analysis.document_map.map((page, i) => (
                  <div key={i} className="page-detail-card">
                    <div className="page-detail-header">
                      <strong>Page {page.page_number}</strong>
                      <span className="page-type-badge">{page.page_type}</span>
                    </div>

                    {page.quantities && page.quantities.length > 0 && (
                      <div className="detail-group">
                        <strong>Quantities ({page.quantities.length}):</strong>
                        <ul>
                          {page.quantities.map((q, j) => (
                            <li key={j}>
                              {q.value} {q.unit} {q.item}
                              {q.location && ` at ${q.location}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {page.materials && page.materials.length > 0 && (
                      <div className="detail-group">
                        <strong>Materials ({page.materials.length}):</strong>
                        <ul>
                          {page.materials.map((m, j) => (
                            <li key={j}>{m.item}: {m.specification || m.color || 'see spec'}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {page.specifications && page.specifications.length > 0 && (
                      <div className="detail-group">
                        <strong>Specifications:</strong>
                        <ul>
                          {page.specifications.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Show questions/conflicts */}
            {analysis.conflicts && analysis.conflicts.length > 0 && (
              <div className="section conflicts-section">
                <h3>⚠️ Conflicts Need Resolution</h3>
                <p className="section-desc">We found some inconsistencies. Please review and choose how to handle them.</p>

                {analysis.questions.map((q) => (
                  <div key={q.id} className="question-card conflict-question">
                    <div className="question-header">
                      <span className="question-number">Q{q.id}</span>
                      <span className="question-type">{q.type}</span>
                    </div>
                    <div className="question-text">{q.question}</div>
                    {q.description && <div className="question-desc">{q.description}</div>}

                    {q.details && q.details.length > 0 && (
                      <div className="conflict-details">
                        {q.details.map((detail, i) => (
                          <div key={i} className="conflict-detail-item">{detail}</div>
                        ))}
                      </div>
                    )}

                    <div className="options">
                      {q.options.map((option, i) => (
                        <label key={i} className="option">
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={option}
                            checked={answers[q.id] === option}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No conflicts - just summary */}
            {(!analysis.conflicts || analysis.conflicts.length === 0) && analysis.questions && (
              <div className="section">
                <h3>✅ No Conflicts Detected</h3>
                <div className="success-message">
                  {analysis.questions[0]?.question}
                </div>
                <p className="success-desc">{analysis.questions[0]?.description}</p>
              </div>
            )}

            <button
              className="btn-primary"
              onClick={handleSubmitAnswers}
              disabled={analysis.conflicts?.length > 0 && !allQuestionsAnswered}
            >
              {allQuestionsAnswered || analysis.conflicts?.length === 0 ? '💰 Proceed to Bid Builder' : 'Please answer all questions first...'}
            </button>
          </div>
        )}

        {/* BIDDING STAGE - SHOWS ALL CONTEXT! */}
        {stage === 'bidding' && analysis && (
          <div className="stage-card fade-in">
            <h2>💰 Create Your Bid Estimate</h2>
            <p className="stage-desc">Review AI-extracted quantities, make adjustments, and add your unit prices</p>

            {splitItems.length > 0 && (
              <div className="split-notice">
                <strong>📊 Items Split by Location:</strong> {splitItems.length} items were separated based on your conflict resolution choices.
              </div>
            )}

            <div className="bid-builder">
              <div className="bid-items-grid">
                {pricingItems.map((item, i) => {
                  const currentItem = getItem(item.id);
                  const originalQty = getOriginalQuantity(item.id);
                  const isEdited = editedItems[item.id]?.edited;
                  const isConfirmed = confirmedItems.has(item.id);
                  const isSplit = item.split;

                  return (
                    <div key={item.id} className={`bid-item-card ${isSplit ? 'split-item' : ''}`}>
                      {/* ✅ FULL CONTEXT HEADER */}
                      <div className="bid-item-header">
                        <div className="bid-item-title-row">
                          <strong className="bid-item-name">{currentItem.item}</strong>
                          {isSplit && <span className="split-badge">✂️ Split from conflict</span>}
                        </div>

                        {/* ✅ SHOW QUANTITY, UNIT, LOCATION - ALL VISIBLE */}
                        <div className="bid-item-context">
                          <div className="context-item">
                            <span className="context-label">Quantity:</span>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={currentItem.quantity}
                              onChange={(e) => handleQuantityEdit(item.id, e.target.value)}
                              className="quantity-input-inline"
                              disabled={isConfirmed}
                            />
                            <span className="context-unit">{currentItem.unit}</span>
                          </div>

                          <div className="context-item">
                            <span className="context-label">Location:</span>
                            <span className="context-value">
                              {currentItem.locations?.join(', ') || 'Various'}
                            </span>
                          </div>

                          <div className="context-item">
                            <span className="context-label">Pages:</span>
                            <span className="context-value">
                              {currentItem.pages?.join(', ') || '-'}
                            </span>
                          </div>
                        </div>

                        {/* Show AI comparison if edited */}
                        {isEdited && (
                          <div className="ai-comparison">
                            <span className="ai-value">AI: {originalQty} {currentItem.unit}</span>
                            <span className="difference-badge">
                              {currentItem.quantity > originalQty ? '▲' : '▼'}
                              {Math.abs(currentItem.quantity - originalQty)}
                            </span>
                          </div>
                        )}

                        {/* Status badges */}
                        <div className="status-badges">
                          {isEdited && !isConfirmed && (
                            <span className="badge badge-edited">✏️ Edited</span>
                          )}
                          {isConfirmed && (
                            <span className="badge badge-confirmed">
                              {isEdited ? '✅ Edited & Confirmed' : '✅ Confirmed'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* PRICING SECTION */}
                      <div className="bid-item-pricing">
                        <div className="price-input-group">
                          <label>Unit Price:</label>
                          <div className="price-input-wrapper">
                            <span className="currency">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={prices[item.id] || ''}
                              onChange={(e) => handlePriceChange(item.id, e.target.value)}
                              className="price-input"
                            />
                          </div>
                        </div>

                        <div className="line-total">
                          <label>Line Total:</label>
                          <div className="line-total-value">
                            ${((prices[item.id] || 0) * currentItem.quantity).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </div>
                        </div>
                      </div>

                      {/* Confirm button */}
                      {!isConfirmed && (
                        <button
                          className="btn-confirm-item"
                          onClick={() => handleConfirmItem(item.id)}
                        >
                          ✅ Confirm This Item
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* BID SUMMARY */}
              <div className="bid-summary">
                <div className="bid-summary-content">
                  <h3>📊 Bid Summary</h3>
                  <div className="bid-summary-stats">
                    <div className="bid-stat">
                      <span className="bid-stat-label">Total Line Items:</span>
                      <span className="bid-stat-value">{pricingItems.length}</span>
                    </div>
                    {splitItems.length > 0 && (
                      <div className="bid-stat">
                        <span className="bid-stat-label">Items Split:</span>
                        <span className="bid-stat-value">{splitItems.length}</span>
                      </div>
                    )}
                    <div className="bid-stat">
                      <span className="bid-stat-label">Items Confirmed:</span>
                      <span className="bid-stat-value">
                        {confirmedItems.size} / {pricingItems.length}
                      </span>
                    </div>
                    <div className="bid-stat">
                      <span className="bid-stat-label">Items Edited:</span>
                      <span className="bid-stat-value">
                        {Object.keys(editedItems).filter(k => editedItems[k].edited).length}
                      </span>
                    </div>
                    <div className="bid-stat">
                      <span className="bid-stat-label">Items Priced:</span>
                      <span className="bid-stat-value">
                        {Object.keys(prices).filter(k => prices[k] > 0).length}
                      </span>
                    </div>
                  </div>

                  <div className="bid-total-section">
                    <div className="bid-total-label">Total Bid Estimate:</div>
                    <div className="bid-total-amount">
                      ${bidTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                  </div>

                  <div className="human-review-indicator">
                    <div className="review-progress">
                      <div className="review-progress-label">Human Review Progress:</div>
                      <div className="review-progress-bar">
                        <div
                          className="review-progress-fill"
                          style={{width: `${(confirmedItems.size / pricingItems.length * 100)}%`}}
                        ></div>
                      </div>
                      <div className="review-progress-percent">
                        {((confirmedItems.size / pricingItems.length) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="bid-actions">
                    <button className="btn-primary" onClick={exportToCSV}>
                      📥 Export to CSV (AI vs Human)
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setStage('done')}
                      disabled={confirmedItems.size < pricingItems.length}
                    >
                      {confirmedItems.size < pricingItems.length
                        ? '⚠️ Confirm All Items First'
                        : '✅ Finalize Bid'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DONE STAGE */}
        {stage === 'done' && analysis && (
          <div className="stage-card done-card fade-in">
            <div className="success-icon">✅</div>
            <h2>Bid Estimate Complete!</h2>

            <div className="results-summary">
              <div className="result-item">
                <div className="result-value">{pricingItems.length}</div>
                <div className="result-label">Line Items</div>
              </div>
              <div className="result-item">
                <div className="result-value">{confirmedItems.size}</div>
                <div className="result-label">Human Confirmed</div>
              </div>
              <div className="result-item">
                <div className="result-value">{Object.keys(editedItems).filter(k => editedItems[k].edited).length}</div>
                <div className="result-label">Human Edited</div>
              </div>
              <div className="result-item highlight-result">
                <div className="result-value">${bidTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                <div className="result-label">Total Bid</div>
              </div>
            </div>

            <div className="next-steps">
              <h3>📋 What Happened:</h3>
              <ol>
                <li>✅ AI scanned {analysis.scanned_pages} pages in {analysis.processing_time?.total}</li>
                <li>✅ Found {analysis.relevant_pages.length} relevant pages with bidding information</li>
                <li>✅ Extracted {analysis.line_items?.length || 0} line items automatically</li>
                <li>✅ {analysis.conflicts.length > 0 ? `Resolved ${analysis.conflicts.length} conflicts with your input` : 'No conflicts detected'}</li>
                {splitItems.length > 0 && (
                  <li>✅ Split {splitItems.length} items by location based on your choices</li>
                )}
                <li>✅ {confirmedItems.size} items reviewed and confirmed by human expert</li>
                <li>✅ {Object.keys(editedItems).filter(k => editedItems[k].edited).length} items adjusted based on human expertise</li>
                <li>✅ Created final bid estimate with your unit prices</li>
              </ol>

              <div className="demo-highlight">
                <h4>💡 The Power of AI + Human Intelligence:</h4>
                <p>This demo showed how AI can extract complex data from construction plans, but human expertise is crucial for:</p>
                <ul>
                  <li>✅ Validating AI-extracted quantities</li>
                  <li>✅ Making corrections based on domain knowledge</li>
                  <li>✅ Resolving conflicts and ambiguities</li>
                  <li>✅ Deciding how to split aggregated items</li>
                  <li>✅ Applying market-accurate unit prices</li>
                  <li>✅ Making strategic bidding decisions</li>
                </ul>
                <p><strong>Result: {((confirmedItems.size / pricingItems.length) * 100).toFixed(0)}% human-validated bid in minutes instead of hours!</strong></p>

                {Object.keys(editedItems).filter(k => editedItems[k].edited).length > 0 && (
                  <div className="ai-vs-human-summary">
                    <h5>🤖 vs 👨‍💼 AI vs Human Adjustments:</h5>
                    <ul>
                      {Object.entries(editedItems)
                        .filter(([_, item]) => item.edited)
                        .map(([id, item], i) => (
                          <li key={i}>
                            <strong>{item.item}:</strong> AI said {item.original_quantity},
                            Human corrected to {item.quantity}
                            ({item.difference > 0 ? '+' : ''}{item.difference} {item.unit})
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn-primary" onClick={reset}>
                🔄 Analyze Another Document
              </button>
              <button className="btn-secondary" onClick={exportToCSV}>
                📊 Export Final Bid (AI vs Human)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default Demo;