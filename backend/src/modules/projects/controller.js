import projectsService from './service.js';
import logger from '../../utils/helpers/logger.js';

class ProjectsController {
  /**
   * Create project
   * POST /api/v1/projects
   */
  async create(req, res) {
    try {
      // TODO: Get user_id from authentication when auth is implemented
      // For now, use demo user or require user_id in request
      const projectData = {
        ...req.body,
        user_id: req.body.user_id || '00000000-0000-0000-0000-000000000001' // Default to demo user
      };

      const project = await projectsService.create(projectData);
      res.status(201).json(project);
    } catch (error) {
      logger.error('Create project failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all projects
   * GET /api/v1/projects
   */
  async getAll(req, res) {
    try {
      const { status, limit, offset } = req.query;

      // TODO: Filter by user_id when auth is implemented
      // For now, return all projects
      const projects = await projectsService.getAll({ status, limit, offset });
      res.json(projects);
    } catch (error) {
      logger.error('Get projects failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get project by ID
   * GET /api/v1/projects/:id
   */
  async getById(req, res) {
    try {
      const project = await projectsService.getById(req.params.id);
      res.json(project);
    } catch (error) {
      logger.error('Get project failed:', error);
      res.status(404).json({ error: error.message });
    }
  }

  /**
   * Update project
   * PUT /api/v1/projects/:id
   */
  async update(req, res) {
    try {
      const project = await projectsService.update(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      logger.error('Update project failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Delete project
   * DELETE /api/v1/projects/:id
   */
  async delete(req, res) {
    try {
      const result = await projectsService.delete(req.params.id);
      res.json(result);
    } catch (error) {
      logger.error('Delete project failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ProjectsController();