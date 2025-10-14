import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { projectsAPI } from '../../services/api';
import FilesManager from '../../components/files/FilesManager';
import './ProjectDetailPage.css';

function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getById(id);
      setProject(response.data);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page-error">
        <h2>Project not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
          <ArrowLeft size={20} />
          Back
        </button>
      </div>

      {/* Project info */}
      <div className="project-info card">
        <div className="card-body">
          <h1>{project.name}</h1>
          {project.description && (
            <p className="text-muted mt-2">{project.description}</p>
          )}

          {project.customer_name && (
            <div className="mt-3">
              <strong>Customer:</strong> {project.customer_name}
              {project.customer_email && ` (${project.customer_email})`}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="project-stats">
        <div className="stat-card">
          <span className="stat-value">{project.file_count || 0}</span>
          <span className="stat-label">Files</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">0</span>
          <span className="stat-label">Sessions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">0</span>
          <span className="stat-label">Estimates</span>
        </div>
      </div>

      {/* Files Manager - Reusable component! */}
      <div className="project-files-section">
        <FilesManager projectId={project.id} />
      </div>
    </div>
  );
}

export default ProjectDetailPage;