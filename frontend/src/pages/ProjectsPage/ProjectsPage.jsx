import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Calendar, User, Trash2, MoreVertical } from 'lucide-react';
import { projectsAPI } from '../../services/api';
import CreateProjectModal from '../../components/CreateProjectModal';
import './ProjectsPage.css';

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(null); // Track which menu is open

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getAll();
      setProjects(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      await projectsAPI.create(projectData);
      setShowCreateModal(false);
      loadProjects(); // Reload list
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId, projectName, event) => {
    // Stop propagation to prevent card click
    event.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete "${projectName}"?\n\nThis will archive the project and all its data.`
    );

    if (!confirmed) return;

    try {
      await projectsAPI.delete(projectId);
      setShowMenu(null);
      loadProjects(); // Reload list
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const toggleMenu = (projectId, event) => {
    event.stopPropagation();
    setShowMenu(showMenu === projectId ? null : projectId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      completed: 'badge-info',
      archived: 'badge-gray'
    };
    return `badge ${badges[status] || 'badge-gray'}`;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(null);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="projects-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="text-muted">Manage your bid projects</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={64} className="empty-icon" />
          <h3>No projects yet</h3>
          <p className="text-muted">Get started by creating your first project</p>
          <button
            className="btn btn-primary mt-3"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={20} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div
              key={project.id}
              className="project-card card"
              onClick={() => handleProjectClick(project.id)}
            >
              <div className="card-body">
                <div className="project-header">
                  <FolderKanban size={24} className="project-icon" />
                  <div className="project-actions">
                    <span className={getStatusBadge(project.status)}>
                      {project.status}
                    </span>

                    {/* Menu button */}
                    <div className="menu-container">
                      <button
                        className="menu-button"
                        onClick={(e) => toggleMenu(project.id, e)}
                        aria-label="Project actions"
                      >
                        <MoreVertical size={20} />
                      </button>

                      {/* Dropdown menu */}
                      {showMenu === project.id && (
                        <div className="menu-dropdown">
                          <button
                            className="menu-item menu-item-danger"
                            onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                          >
                            <Trash2 size={16} />
                            Delete Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="project-name">{project.name}</h3>

                {project.description && (
                  <p className="project-description text-muted">
                    {project.description}
                  </p>
                )}

                <div className="project-meta">
                  {project.customer_name && (
                    <div className="meta-item">
                      <User size={14} />
                      <span>{project.customer_name}</span>
                    </div>
                  )}
                  <div className="meta-item">
                    <Calendar size={14} />
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                </div>

                {project.stats && (
                  <div className="project-stats">
                    <div className="stat">
                      <span className="stat-value">{project.stats.files || 0}</span>
                      <span className="stat-label">Files</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{project.stats.sessions || 0}</span>
                      <span className="stat-label">Sessions</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{project.stats.estimates || 0}</span>
                      <span className="stat-label">Estimates</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create project modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}

export default ProjectsPage;