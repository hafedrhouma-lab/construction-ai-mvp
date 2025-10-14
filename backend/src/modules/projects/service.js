import projectsRepository from './repository.js';
import logger from '../../utils/helpers/logger.js';

class ProjectsService {
  /**
   * Create a new project
   */
  async create(projectData) {
    logger.info(`Creating project: ${projectData.name}`);
    
    const project = await projectsRepository.create(projectData);
    
    logger.info(`✅ Project created: ${project.id}`);
    return project;
  }

  /**
   * Get all projects
   */
  async getAll(filters = {}) {
    return await projectsRepository.findAll(filters);
  }

  /**
   * Get project by ID with statistics
   */
  async getById(id) {
    const project = await projectsRepository.findById(id);
    
    if (!project) {
      throw new Error('Project not found');
    }

    // Get statistics
    const stats = await projectsRepository.getStats(id);
    
    return {
      ...project,
      stats: {
        files: stats.file_count || 0,
        sessions: stats.session_count || 0,
        estimates: stats.estimate_count || 0,
        totalValue: stats.total_estimate_value || 0
      }
    };
  }

  /**
   * Update project
   */
  async update(id, updates) {
    logger.info(`Updating project: ${id}`);
    
    const project = await projectsRepository.update(id, updates);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    logger.info(`✅ Project updated: ${id}`);
    return project;
  }

  /**
   * Delete (archive) project
   */
  async delete(id) {
    logger.info(`Archiving project: ${id}`);
    
    const project = await projectsRepository.delete(id);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    logger.info(`✅ Project archived: ${id}`);
    return { success: true };
  }
}

export default new ProjectsService();
