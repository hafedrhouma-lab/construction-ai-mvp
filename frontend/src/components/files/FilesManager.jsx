import { useState } from 'react';
import FileUpload from './FileUpload';
import FilesList from './FilesList';

import './FilesManager.css';

export default function FilesManager({ projectId }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Called when upload completes
  const handleUploadComplete = (file) => {
    console.log('✅ Upload complete:', file);
    // Trigger files list refresh
    setRefreshTrigger(prev => prev + 1);
  };

  if (!projectId) {
    return (
      <div className="files-manager__no-project">
        <p className="files-manager__no-project-text">Please select a project first</p>
      </div>
    );
  }

  return (
    <div className="files-manager">
      {/* Upload Section */}
      <div className="files-manager__upload-section">
        <h2 className="files-manager__section-title">
          Upload Files
        </h2>
        <FileUpload
          projectId={projectId}
          onUploadComplete={handleUploadComplete}
        />
      </div>

      {/* Files List Section */}
      <div className="files-manager__list-section">
        <FilesList
          projectId={projectId}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
}