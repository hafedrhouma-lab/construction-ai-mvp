// frontend/src/components/extraction/FileSelector.jsx
// FIXED: Don't load files until we have a projectId

import { useState, useEffect } from 'react';
import './FileSelector.css';

export default function FileSelector({ selectedFile, onSelectFile, projectId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadFiles();
    }
  }, [projectId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

      // API requires project_id parameter
      const filesData = await fetch(`${API_URL}/files?project_id=${projectId}`).then(r => r.json());

      // Ensure it's an array
      if (Array.isArray(filesData)) {
        setFiles(filesData);
      } else {
        console.error('API returned non-array:', filesData);
        setFiles([]);
      }

    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        Loading project...
      </div>
    );
  }

  if (loading) {
    return <div style={{ color: '#666' }}>Loading files...</div>;
  }

  if (files.length === 0) {
    return <div style={{ color: '#666' }}>No files found in this project</div>;
  }

  return (
    <div className="file-selector">
      {files.map((file) => (
        <button
          key={file.id}
          onClick={() => onSelectFile(file)}
          className={`file-button ${selectedFile?.id === file.id ? 'selected' : ''}`}
        >
          <div className="file-content">
            <div className="file-info">
              <div className="filename">{file.original_filename}</div>
              <div className="pages">{file.page_count} pages</div>
            </div>
            {selectedFile?.id === file.id && (
              <svg className="checkmark" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}