// pages/ExtractionFlow.jsx
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

export default function ExtractionFlow() {
  const { fileId: urlFileId } = useParams();
  const [searchParams] = useSearchParams();
  const fileIdFromQuery = searchParams.get('fileId');

  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [extraction, setExtraction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    const fileId = urlFileId || fileIdFromQuery;
    if (fileId && !selectedFile) {
      loadFileById(fileId);
    }
  }, [urlFileId, fileIdFromQuery]);

  const loadFileById = async (fileId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/v1/files/${fileId}`);
      const file = await response.json();
      setSelectedFile(file);
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

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

  return (
    <div className="extraction-flow">
      <header className="header">
        <div className="header-content">
          <h1>QuickBids AI Extraction</h1>
          <p>Extract line items from construction documents with AI assistance</p>
        </div>
      </header>

      <div className="container">
        <div className="section-card">
          <h2 className="section-title">1. Select File</h2>
          <FileSelector
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        </div>

        {selectedFile && (
          <>
            {/* HORIZONTAL LAYOUT: Thumbnail + Controls */}
            <div className="section-card">
              <h2 className="section-title">2. Navigate & Extract</h2>

              <div className="extraction-horizontal">
                {/* LEFT: Preview Thumbnail */}
                <div className="extraction-thumbnail">
                  <MediaPreview
                    file={selectedFile}
                    currentPage={currentPage}
                    compact={true}
                  />
                </div>

                {/* RIGHT: Controls */}
                <div className="extraction-controls">
                  <PageNavigator
                    currentPage={currentPage}
                    totalPages={selectedFile.page_count}
                    onPageChange={setCurrentPage}
                  />

                  <div style={{ marginTop: '16px' }}>
                    <ExtractionButton
                      loading={loading}
                      hasExtraction={!!extraction}
                      onExtract={handleExtractPage}
                    />
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

                <div className="page-nav-footer">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="nav-button"
                  >
                    ← Previous Page
                  </button>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(selectedFile.page_count, p + 1))}
                    disabled={currentPage === selectedFile.page_count}
                    className="nav-button"
                  >
                    Next Page →
                  </button>
                </div>
              </div>
            )}

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