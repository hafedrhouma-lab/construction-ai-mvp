import { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, Loader, AlertCircle, DollarSign } from 'lucide-react';
import axios from 'axios';

import './FileUpload.css';

const API_URL = import.meta.env.VITE_API_URL || '${API_URL}';

const TOPICS = {
  'striping': 'Striping',
  'thermoplastic_lines': 'Thermoplastic Lines',
  'crosswalks': 'Crosswalks',
  'stop_bars': 'Stop Bars',
  'symbols_legends': 'Symbols & Legends',
  'curb_painting': 'Curb Painting',
  'signage': 'Signage (ADA & Posts)',
  'line_removal': 'Line Removal',
  'quantities_tables': 'Quantities Tables',
  'specification_notes': 'Specification Notes'
};

export default function FileUpload({ projectId, onUploadComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [pageCount, setPageCount] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState(['striping']); // 🚀 NEW: Default to striping
  const fileInputRef = useRef(null);
  const pollingInterval = useRef(null);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setCurrentFile(file);
    setError(null);

    // 🚀 NEW: Try to get page count for cost estimation
    // This is approximate - real count comes after upload
    // Rough estimate: ~10KB per page for typical construction drawings
    const estimatedPages = Math.ceil(file.size / 10240);
    setPageCount(estimatedPages);

    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setStatus('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);
      formData.append('topics', JSON.stringify(selectedTopics));
      console.log('🎯 Topics:', selectedTopics);
      console.log('📤 Uploading file:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      console.log('🎯 Topic:', selectedTopics);

      const response = await axios.post(`${API_URL}/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      });

      console.log('✅ Upload complete:', response.data);

      setFileId(response.data.id);
      setStatus('processing');
      setUploading(false);

      // Update with actual page count
      if (response.data.page_count) {
        setPageCount(response.data.page_count);
      }

      startPolling(response.data.id);

    } catch (err) {
      console.error('❌ Upload failed:', err);
      setError(err.response?.data?.error || err.message || 'Upload failed');
      setStatus('error');
      setUploading(false);
    }
  };

  const startPolling = (id) => {
    console.log('🔄 Starting status polling for file:', id);

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/files/${id}`);
        const file = response.data;

        console.log('📊 File status:', file.status, file.metadata);

        if (file.metadata?.processingProgress) {
          setProcessingProgress(file.metadata.processingProgress);
        }

        if (file.status === 'ready') {
          console.log('✅ Processing complete!');
          setStatus('ready');
          setProcessingProgress(100);
          clearInterval(pollingInterval.current);

          if (onUploadComplete) {
            onUploadComplete(file);
          }
        } else if (file.status === 'failed') {
          console.error('❌ Processing failed');
          setStatus('error');
          setError('Processing failed. Please try again.');
          clearInterval(pollingInterval.current);
        }

      } catch (err) {
        console.error('Failed to check status:', err);
      }
    }, 5000);
  };

  const handleCancel = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    setCurrentFile(null);
    setFileId(null);
    setStatus(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    setError(null);
    setUploading(false);
    setPageCount(null);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 🚀 NEW: Calculate cost estimate
  return (
    <div className="file-upload">
      {/* Upload Area */}
      {!currentFile && (
        <>
          {/* 🚀 NEW: Topic Selector */}
          <div className="file-upload__topic-selector">
            <label className="file-upload__topic-label">
              Select Topics (one or more):
            </label>

            {/* Selected Topics Tags */}
            <div className="file-upload__topic-tags">
              {selectedTopics.map(topicKey => (
                <span key={topicKey} className="file-upload__topic-tag">
                  {TOPICS[topicKey]}
                  <button
                    type="button"
                    onClick={() => setSelectedTopics(selectedTopics.filter(t => t !== topicKey))}
                    className="file-upload__topic-tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Dropdown to Add More */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !selectedTopics.includes(e.target.value)) {
                  setSelectedTopics([...selectedTopics, e.target.value]);
                }
              }}
              className="file-upload__topic-select"
            >
              <option value="">+ Add topic...</option>
              {Object.entries(TOPICS).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                  disabled={selectedTopics.includes(value)}
                >
                  {label}
                </option>
              ))}
            </select>

            <p className="file-upload__topic-hint">
              💡 Only pages relevant to selected topics will be extracted
            </p>
          </div>

          <div
            className={`file-upload__drop-zone ${dragActive ? 'file-upload__drop-zone--active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
          <input
            ref={fileInputRef}
            type="file"
            className="file-upload__input"
            accept=".pdf,application/pdf"
            onChange={handleChange}
          />

          <Upload className="file-upload__icon" />

          <p className="file-upload__title">
            Drop your PDF here, or click to browse
          </p>

          <p className="file-upload__subtitle">
            Maximum file size: 500MB
          </p>

          <button
            onClick={onButtonClick}
            className="file-upload__button"
          >
            Select PDF File
          </button>
        </div>
        </>
      )}

      {/* Upload Progress */}
      {currentFile && (
        <div className="file-upload__progress-card">
          {/* File Info */}
          <div className="file-upload__file-header">
            <div className="file-upload__file-info">
              <FileText className="file-upload__file-icon" />
              <div className="file-upload__file-details">
                <p className="file-upload__file-name">
                  {currentFile.name}
                </p>
                <p className="file-upload__file-size">
                  {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                  {pageCount && ` • ~${pageCount} pages`}
                </p>
              </div>
            </div>

            {status !== 'ready' && (
              <button
                onClick={handleCancel}
                className="file-upload__cancel-button"
              >
                <X className="file-upload__cancel-icon" />
              </button>
            )}
          </div>

          {/* Status Messages */}
          <div>
            {status === 'uploading' && (
              <div className="file-upload__status file-upload__status--uploading">
                <Loader className="file-upload__status-icon file-upload__status-icon--spin" />
                <span>Uploading to server...</span>
              </div>
            )}

            {status === 'processing' && (
              <div className="file-upload__status file-upload__status--processing">
                <Loader className="file-upload__status-icon file-upload__status-icon--spin" />
                <span>Processing pages...</span>
              </div>
            )}

            {status === 'ready' && (
              <div className="file-upload__status file-upload__status--ready">
                <CheckCircle className="file-upload__status-icon" />
                <span>Upload complete!</span>
              </div>
            )}

            {status === 'error' && (
              <div className="file-upload__status file-upload__status--error">
                <AlertCircle className="file-upload__status-icon" />
                <span>Upload failed</span>
              </div>
            )}
          </div>

          {/* Progress Bar - Upload */}
          {status === 'uploading' && (
            <div className="file-upload__progress">
              <div className="file-upload__progress-header">
                <span>Uploading</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="file-upload__progress-bar">
                <div
                  className="file-upload__progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Progress Bar - Processing */}
          {status === 'processing' && (
            <div className="file-upload__progress">
              <div className="file-upload__progress-header">
                <span>Processing pages</span>
                <span>{processingProgress}%</span>
              </div>
              <div className="file-upload__progress-bar">
                <div
                  className="file-upload__progress-fill"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="file-upload__error">
              <p className="file-upload__error-text">{error}</p>
            </div>
          )}

          {/* Success Actions */}
          {status === 'ready' && (
            <div className="file-upload__success-actions">
              <button
                onClick={handleCancel}
                className="file-upload__action-button"
              >
                Upload Another File
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}