import React, { useState } from 'react';
import { X } from 'lucide-react';
import './CreateProjectModal.css';

function CreateProjectModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer_name: '',
    customer_email: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Project name is required');
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(formData);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Project Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="e.g., Atlanta Striping Project"
                value={formData.name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                placeholder="Brief description of the project..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="customer_name" className="form-label">
                Customer Name
              </label>
              <input
                type="text"
                id="customer_name"
                name="customer_name"
                className="form-input"
                placeholder="e.g., City of Atlanta"
                value={formData.customer_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="customer_email" className="form-label">
                Customer Email
              </label>
              <input
                type="email"
                id="customer_email"
                name="customer_email"
                className="form-input"
                placeholder="customer@example.com"
                value={formData.customer_email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="spinner"></div>
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProjectModal;
