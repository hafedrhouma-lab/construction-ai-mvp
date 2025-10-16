import filesService from './service.js';
import logger from '../../utils/helpers/logger.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/', // Temporary storage
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Ensure upload directory exists
const uploadsDir = 'uploads/temp';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

class FilesController {
  /**
   * 🚀 UPDATED: Upload PDF file and process (with multiple topics support)
   * POST /api/v1/files/upload
   * Multipart form data with 'file', 'project_id', and optional 'topics' (JSON array)
   */
  async upload(req, res) {
    try {
      const { project_id, topics: topicsRaw } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!project_id) {
        return res.status(400).json({ error: 'project_id is required' });
      }

      // 🚀 PARSE topics (comes as JSON string from FormData)
      let topics = [];
      if (topicsRaw) {
        try {
          topics = typeof topicsRaw === 'string' ? JSON.parse(topicsRaw) : topicsRaw;

          // Ensure it's an array
          if (!Array.isArray(topics)) {
            topics = [topics];
          }
        } catch (e) {
          logger.error('Failed to parse topics:', e);
          return res.status(400).json({ error: 'Invalid topics format. Expected JSON array.' });
        }
      }

      logger.info(`📤 File upload received: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      if (topics && topics.length > 0) {
        logger.info(`🎯 Topics: ${topics.join(', ')}`);
      }

      // Process file (split + upload to S3 + filter by topics)
      const result = await filesService.uploadAndProcess(
        {
          project_id,
          original_filename: file.originalname,
          topics: topics // 🚀 Send as array
        },
        file.path
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Upload failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Create file record
   * POST /api/v1/files
   */
  async create(req, res) {
    try {
      const file = await filesService.create(req.body);
      res.status(201).json(file);
    } catch (error) {
      logger.error('Create file failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get presigned URL for page upload
   * POST /api/v1/files/:id/pages/:pageNumber/upload-url
   */
  async getPageUploadUrl(req, res) {
    try {
      const { id, pageNumber } = req.params;
      const result = await filesService.getPageUploadUrl(id, parseInt(pageNumber));
      res.json(result);
    } catch (error) {
      logger.error('Get upload URL failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Confirm upload complete
   * POST /api/v1/files/:id/confirm
   */
  async confirmUpload(req, res) {
    try {
      const { id } = req.params;
      const { pageCount } = req.body;

      const file = await filesService.confirmUpload(id, pageCount);
      res.json(file);
    } catch (error) {
      logger.error('Confirm upload failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get files for project
   * GET /api/v1/files?project_id=...
   */
  async getAll(req, res) {
    try {
      const { project_id, status, file_type, limit, offset } = req.query;

      if (!project_id) {
        return res.status(400).json({ error: 'project_id is required' });
      }

      const files = await filesService.getByProject(project_id, {
        status,
        file_type,
        limit,
        offset
      });

      res.json(files);
    } catch (error) {
      logger.error('Get files failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get file by ID
   * GET /api/v1/files/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const { include_urls } = req.query;

      let file;
      if (include_urls === 'true') {
        file = await filesService.getFileWithUrls(id);
      } else {
        file = await filesService.getById(id);
      }

      res.json(file);
    } catch (error) {
      logger.error('Get file failed:', error);
      res.status(404).json({ error: error.message });
    }
  }

  /**
   * Delete file - allows deletion of ALL files regardless of status
   * DELETE /api/v1/files/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Just delete - no status check
      logger.info(`🗑️  Deleting file: ${id}`);
      const result = await filesService.delete(id);
      res.json({ message: 'File deleted successfully' });

    } catch (error) {
      logger.error('Delete file failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get project file stats
   * GET /api/v1/files/stats/:projectId
   */
  async getProjectStats(req, res) {
    try {
      const { projectId } = req.params;
      const stats = await filesService.getProjectStats(projectId);
      res.json(stats);
    } catch (error) {
      logger.error('Get stats failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

// Export controller instance and upload middleware
const controller = new FilesController();
export const uploadMiddleware = upload.single('file');
export default controller;