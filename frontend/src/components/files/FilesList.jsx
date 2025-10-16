import { useState, useEffect } from 'react';
import { FileText, Loader, Trash2, CheckCircle, AlertCircle, Clock, Sparkles } from 'lucide-react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import './FilesList.css';

const API_URL = import.meta.env.VITE_API_URL || '${API_URL}';

export default function FilesList({ projectId, refreshTrigger }) {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch files for project
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/files`, {
        params: { project_id: projectId }
      });
      setFiles(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch files:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  // Load files on mount and when refreshTrigger changes
  useEffect(() => {
    if (projectId) {
      fetchFiles();
    }
  }, [projectId, refreshTrigger]);

  // Delete file
  const handleDelete = async (fileId, fileName) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/files/${fileId}`);
      // Refresh list
      fetchFiles();
    } catch (err) {
      console.error('Failed to delete file:', err);
      const errorMsg = err.response?.data?.message || 'Failed to delete file';
      alert(errorMsg);
    }
  };

  // Navigate to extract page
  const handleExtract = (fileId) => {
    navigate(`/extract/${fileId}`);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ready':
        return (
          <span className="files-list__badge files-list__badge--ready">
            <CheckCircle className="files-list__badge-icon" />
            Ready
          </span>
        );
      case 'processing':
        return (
          <span className="files-list__badge files-list__badge--processing">
            <Loader className="files-list__badge-icon" />
            Processing
          </span>
        );
      case 'uploading':
      case 'uploaded':
        return (
          <span className="files-list__badge files-list__badge--uploading">
            <Clock className="files-list__badge-icon" />
            Uploading
          </span>
        );
      case 'failed':
        return (
          <span className="files-list__badge files-list__badge--failed">
            <AlertCircle className="files-list__badge-icon" />
            Failed
          </span>
        );
      default:
        return (
          <span className="files-list__badge">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="files-list__loading">
        <Loader className="files-list__loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="files-list__error">
        <AlertCircle className="files-list__error-icon" />
        <p className="files-list__error-text">{error}</p>
        <button
          onClick={fetchFiles}
          className="files-list__retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="files-list__empty">
        <FileText className="files-list__empty-icon" />
        <p className="files-list__empty-title">No files uploaded yet</p>
        <p className="files-list__empty-subtitle">Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="files-list">
      <h3 className="files-list__header">
        Uploaded Files ({files.length})
      </h3>

      <div className="files-list__items">
        {files.map((file) => (
          <div
            key={file.id}
            className="files-list__item"
          >
            <div className="files-list__item-content">
              {/* File Info */}
              <div className="files-list__item-info">
                <FileText className="files-list__item-icon" />

                <div className="files-list__item-details">
                  <div className="files-list__item-header">
                    <h4 className="files-list__item-name">
                      {file.original_filename}
                    </h4>
                    {getStatusBadge(file.status)}
                  </div>

                  <div className="files-list__item-meta">
                    <span>{file.page_count} pages</span>

                    {file.file_size && (
                      <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                    )}

                    <span>
                      {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Processing Progress */}
                  {file.status === 'processing' && file.metadata?.processingProgress && (
                    <div className="files-list__progress">
                      <div className="files-list__progress-header">
                        <span>Processing pages...</span>
                        <span>{file.metadata.processingProgress}%</span>
                      </div>
                      <div className="files-list__progress-bar">
                        <div
                          className="files-list__progress-fill"
                          style={{ width: `${file.metadata.processingProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="files-list__item-actions">
                {/* Extract button - only for ready files */}
                {file.status === 'ready' && (
                  <button
                    onClick={() => handleExtract(file.id)}
                    className="files-list__extract-button"
                    title="Extract with AI"
                  >
                    <Sparkles className="files-list__extract-icon" />
                    <span>Extract</span>
                  </button>
                )}

                {/* Delete button - ALWAYS ENABLED for all files */}
                <button
                  onClick={() => handleDelete(file.id, file.original_filename)}
                  className="files-list__delete-button"
                  title="Delete file"
                >
                  <Trash2 className="files-list__delete-icon" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}