import { useState, useEffect } from 'react';
import { FilesManager } from '../../components/files';
import axios from 'axios';
import './FilesPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export default function FilesPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get(`${API_URL}/projects`);
        setProjects(response.data);
        
        // Auto-select first project
        if (response.data.length > 0) {
          setSelectedProject(response.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="files-page__loading">
        <div className="files-page__loading-content">
          <div className="files-page__loading-spinner"></div>
          <p className="files-page__loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="files-page">
      {/* Header */}
      <div className="files-page__header">
        <div className="files-page__header-content">
          <h1 className="files-page__title">
            File Upload
          </h1>
          <p className="files-page__subtitle">
            Upload and manage PDF files for your projects
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="files-page__content">
        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="files-page__project-selector">
            <label className="files-page__project-label">
              Select Project
            </label>
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="files-page__project-select"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Files Manager */}
        {selectedProject ? (
          <FilesManager projectId={selectedProject} />
        ) : (
          <div className="files-page__empty">
            <p>No projects available. Create a project first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
