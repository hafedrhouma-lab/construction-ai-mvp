// pages/ExtractionFlow.jsx
// CLEAN: Filters files by project of loaded file

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  FileSelector,
  PageNavigator,
  ExtractionButton,
  LineItemsTable,
  EstimatePanel,
  MediaPreview
} from '../components/extraction';
import { extractionsApi } from '../api/extractions';
import './ExtractionFlow.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const estimateExtractionCost = (pageCount) => {
  const INPUT_COST_PER_1M = 2.50;
  const OUTPUT_COST_PER_1M = 10.00;
  const AVG_INPUT_TOKENS = 2000;
  const AVG_OUTPUT_TOKENS = 800;

  const inputCost = (pageCount * AVG_INPUT_TOKENS / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (pageCount * AVG_OUTPUT_TOKENS / 1_000_000) * OUTPUT_COST_PER_1M;

  return {
    total: inputCost + outputCost,
    perPage: (inputCost + outputCost) / pageCount
  };
};

export default function ExtractionFlow() {
  const { fileId: urlFileId } = useParams();
  const [searchParams] = useSearchParams();
  const fileIdFromQuery = searchParams.get('fileId');

  const [selectedFile, setSelectedFile] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [extraction, setExtraction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState(null);

  // Get relevant pages array
  const relevantPages = selectedFile?.relevant_pages && selectedFile.relevant_pages.length > 0
    ? selectedFile.relevant_pages
    : selectedFile
    ? Array.from({ length: selectedFile.page_count }, (_, i) => i + 1)
    : [];

  const isFiltered = selectedFile?.relevant_pages && selectedFile.relevant_pages.length > 0;

  const costEstimate = selectedFile && relevantPages.length > 0
  ? estimateExtractionCost(relevantPages.length)
  : null;

  const extractionAttempts = extraction?.extraction_attempts || 0;
  const extractionLimit = 2;
  const attemptsRemaining = extractionLimit - extractionAttempts;
  const isLimitReached = extractionAttempts >= extractionLimit;

  // Load file by ID
  useEffect(() => {
    const fileId = urlFileId || fileIdFromQuery;
    if (fileId && !selectedFile) {
      loadFileById(fileId);
    }
  }, [urlFileId, fileIdFromQuery]);

  // Initialize to page 1 when file is selected
  useEffect(() => {
    if (selectedFile) {
      setCurrentPage(1);
    }
  }, [selectedFile?.id]);

  const loadFileById = async (fileId) => {
    try {
      const response = await fetch(`${API_URL}/files/${fileId}`);
      const file = await response.json();
      console.log('📄 Loaded file:', file);
      console.log('🎯 Topics:', file.topics);
      console.log('📊 Relevant pages:', file.relevant_pages);
      setSelectedFile(file);
      setProjectId(file.project_id);
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  // Load extraction for current page
  useEffect(() => {
    if (selectedFile && currentPage) {
      loadPageExtraction();
    }
  }, [selectedFile, currentPage]);

  const loadPageExtraction = async () => {
    try {
      const extractions = await extractionsApi.getFileExtractions(selectedFile.id);
      const pageExtraction = extractions.find(e => e.page_number === currentPage);

      if (pageExtraction && pageExtraction.status === 'completed') {
        const details = await extractionsApi.getExtraction(pageExtraction.id);
        setExtraction(details);
      } else {
        setExtraction(null);
      }
    } catch (error) {
      console.error('Failed to load extraction:', error);
    }
  };

  const handleExtractPage = async () => {
    try {
      setLoading(true);
      await extractionsApi.startExtraction(selectedFile.id, currentPage);

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 40) {
          clearInterval(pollInterval);
          setLoading(false);
          alert('Extraction taking longer than expected. Please refresh.');
          return;
        }

        try {
          const extractions = await extractionsApi.getFileExtractions(selectedFile.id);
          const pageExtraction = extractions.find(e => e.page_number === currentPage);

          if (pageExtraction && pageExtraction.status === 'completed') {
            console.log('✅ Extraction completed, loading details...');
            const details = await extractionsApi.getExtraction(pageExtraction.id);
            setExtraction(details);
            clearInterval(pollInterval);
            setLoading(false);
          } else if (pageExtraction && pageExtraction.status === 'failed') {
            console.log('❌ Extraction failed');
            clearInterval(pollInterval);
            setLoading(false);
            alert('Extraction failed. Please try again.');
          }
        } catch (error) {
          console.error('Poll error:', error);
        }
      }, 3000);

    } catch (error) {
      console.error('Extraction failed:', error);
      setLoading(false);
      alert('Extraction failed: ' + error.message);
    }
  };

  const handleGenerateEstimate = async () => {
    try {
      const result = await extractionsApi.generateEstimate(selectedFile.id);
      setEstimate(result);
      alert('Estimate generated successfully!');
    } catch (error) {
      console.error('Generate estimate failed:', error);
      alert('Failed to generate estimate: ' + error.message);
    }
  };

  // Navigate to previous relevant page
  const handlePreviousPage = () => {
    const currentIndex = relevantPages.indexOf(currentPage);
    if (currentIndex > 0) {
      setCurrentPage(relevantPages[currentIndex - 1]);
    }
  };

  // Navigate to next relevant page
  const handleNextPage = () => {
    const currentIndex = relevantPages.indexOf(currentPage);
    if (currentIndex < relevantPages.length - 1) {
      setCurrentPage(relevantPages[currentIndex + 1]);
    }
  };

  const currentIndex = relevantPages.indexOf(currentPage);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < relevantPages.length - 1;

  return (
    <div className="extraction-flow">
      <header className="header">
        <div className="header-content">
          <h1>QuickBids AI Extraction</h1>
          <p>Extract line items from construction documents with AI assistance</p>
        </div>
      </header>

      <div className="container">
        {/* File Selection */}
        <div className="section-card">
          <h2 className="section-title">1. Select File</h2>
          <FileSelector
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            projectId={projectId}
          />
        </div>

        {selectedFile && (
          <>
            {/* Show filtering info if file is filtered */}
            {isFiltered && (
              <div className="filter-info-banner">
                <div className="filter-info-content">
                  <span className="filter-icon">🎯</span>
                  <div className="filter-details">
                    <div className="filter-topics">
                      <strong>Topics:</strong> {selectedFile.topics?.join(', ') || 'None'}
                    </div>
                    <div className="filter-stats">
                      Showing <strong>{relevantPages.length}</strong> relevant pages out of <strong>{selectedFile.page_count}</strong> total pages
                    </div>
                    {/* COST DISPLAY - ONLY ONCE */}
                    {costEstimate && (
                      <div style={{marginTop: '8px', fontSize: '14px', color: '#059669', fontWeight: '500'}}>
                        💰 <strong>Estimated AI Cost:</strong> ${costEstimate.total.toFixed(2)}
                        <span style={{color: '#6b7280', fontSize: '13px', marginLeft: '8px'}}>
                          (${costEstimate.perPage.toFixed(4)}/page × {relevantPages.length} pages)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation & Preview */}
            <div className="section-card">
              <h2 className="section-title">2. Navigate & Extract</h2>

              <div className="extraction-horizontal">
                {/* Preview Thumbnail */}
                <div className="extraction-thumbnail">
                  <MediaPreview
                    file={selectedFile}
                    currentPage={currentPage}
                    compact={true}
                    key={`${selectedFile.id}-${currentPage}`}
                  />
                  <div className="preview-hint">
                    💡 Click "Load Preview" only when needed to save bandwidth
                  </div>
                </div>

                {/* Controls */}
                <div className="extraction-controls">
                  <PageNavigator
                    currentPage={currentPage}
                    totalPages={selectedFile.page_count}
                    relevantPages={relevantPages}
                    onPageChange={setCurrentPage}
                  />

                  <div style={{ marginTop: '16px' }}>
                    {/* Extraction attempts warning */}
                    {extraction && attemptsRemaining <= 1 && (
                      <div style={{
                        padding: '12px',
                        marginBottom: '12px',
                        borderRadius: '6px',
                        backgroundColor: attemptsRemaining === 0 ? '#fee2e2' : '#fef3c7',
                        border: `1px solid ${attemptsRemaining === 0 ? '#fca5a5' : '#fde047'}`,
                        fontSize: '14px',
                        color: attemptsRemaining === 0 ? '#991b1b' : '#92400e'
                      }}>
                        {attemptsRemaining === 0 ? (
                          <>🚫 <strong>Re-extract limit reached.</strong> This page has been extracted {extractionAttempts} times (limit: {extractionLimit}).</>
                        ) : (
                          <>⚠️ <strong>Last re-extract available!</strong> {attemptsRemaining} of {extractionLimit} attempts remaining.</>
                        )}
                      </div>
                    )}

                    <ExtractionButton
                      loading={loading}
                      hasExtraction={!!extraction}
                      onExtract={handleExtractPage}
                      disabled={loading || isLimitReached}
                    />

                    {isLimitReached && !loading && (
                      <p style={{
                        marginTop: '8px',
                        fontSize: '13px',
                        color: '#6b7280',
                        textAlign: 'center'
                      }}>
                        Contact support if you need to re-extract this page again.
                      </p>
                    )}
                  </div>

                  {loading && (
                    <div className="loading-box">
                      <div className="loading-content">
                        <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="loading-text">
                          Extracting page {currentPage}... (10-30 seconds)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Extracted Items */}
            {extraction && (
              <div className="section-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 className="section-title">3. Review & Edit (Page {currentPage})</h2>
                  <div className="legend">
                    <span className="legend-item">
                      <span className="legend-dot blue"></span>
                      <span className="legend-text">AI Extracted</span>
                    </span>
                    <span className="legend-item">
                      <span className="legend-dot green"></span>
                      <span className="legend-text">Human Edited</span>
                    </span>
                  </div>
                </div>

                <LineItemsTable
                  extraction={extraction}
                  onItemUpdated={loadPageExtraction}
                />

                {/* Smart page navigation footer */}
                <div className="page-nav-footer">
                  <button
                    onClick={handlePreviousPage}
                    disabled={!hasPrev}
                    className="nav-button"
                  >
                    ← Previous Page {hasPrev && `(${relevantPages[currentIndex - 1]})`}
                  </button>

                  <button
                    onClick={handleNextPage}
                    disabled={!hasNext}
                    className="nav-button"
                  >
                    Next Page {hasNext && `(${relevantPages[currentIndex + 1]})`} →
                  </button>
                </div>
              </div>
            )}

            {/* Generate Estimate */}
            <div className="section-card">
              <h2 className="section-title">4. Generate Estimate</h2>

              <button
                onClick={handleGenerateEstimate}
                className="extract-btn primary"
              >
                Generate Final Estimate
              </button>

              {estimate && (
                <EstimatePanel estimate={estimate} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}