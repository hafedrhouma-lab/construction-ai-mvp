// frontend/src/components/extraction/FileSelector.jsx
import { useState, useEffect } from 'react';
import './FileSelector.css';

export default function FileSelector({ selectedFile, onSelectFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const projects = await fetch('http://localhost:3001/api/v1/projects').then(r => r.json());
      const projectId = projects[0]?.id;

      if (projectId) {
        const filesData = await fetch(`http://localhost:3001/api/v1/files?project_id=${projectId}`).then(r => r.json());
        setFiles(filesData);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#666' }}>Loading files...</div>;
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