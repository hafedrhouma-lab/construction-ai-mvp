import pool from '../../config/database.js';
import crypto from 'crypto';

class FilesRepository {
  /**
   * Create a new file record
   */
  async create(fileData) {
    const {
      user_id,
      project_id,
      s3_bucket,
      original_filename,
      file_type,
      mime_type,
      total_pages,
      metadata = {}
    } = fileData;

    // Generate base S3 key (pages will be under this)
    const fileId = crypto.randomUUID();
    const s3_key = `pages/${fileId}`;

    const query = `
      INSERT INTO files (
        id, user_id, project_id, s3_key, s3_bucket, 
        original_filename, file_type, mime_type, page_count, metadata, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(query, [
      fileId,
      user_id,
      project_id,
      s3_key,
      s3_bucket,
      original_filename,
      file_type || 'pdf',
      mime_type || 'application/pdf',
      total_pages || 0,
      JSON.stringify(metadata),
      'uploading' // Initial status
    ]);

    return result.rows[0];
  }

  /**
   * Find all files for a project
   */
  async findByProject(projectId, filters = {}) {
    const { status, file_type, limit = 100, offset = 0 } = filters;

    let query = 'SELECT * FROM files WHERE project_id = $1 AND deleted_at IS NULL';
    const params = [projectId];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (file_type) {
      params.push(file_type);
      query += ` AND file_type = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Find file by ID
   */
  async findById(id) {
    const query = 'SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update file status
   */
  async updateStatus(id, status) {
    const query = `
      UPDATE files
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  /**
   * Update file metadata (store page info)
   */
  async updateMetadata(id, metadata) {
    const query = `
      UPDATE files
      SET
        metadata = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [JSON.stringify(metadata), id]);
    return result.rows[0];
  }

  /**
   * Update file with page count and status
   */
  async confirmUpload(id, pageCount) {
    const query = `
      UPDATE files
      SET
        page_count = $1,
        status = 'ready',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [pageCount, id]);
    return result.rows[0];
  }

  /**
   * Update file size
   */
  async updateFileSize(id, fileSize) {
    const query = `
      UPDATE files
      SET
        file_size = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [fileSize, id]);
    return result.rows[0];
  }

  /**
   * Soft delete file
   */
  async delete(id) {
    const query = `
      UPDATE files
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get file statistics for a project
   */
  async getProjectStats(projectId) {
    const query = `
      SELECT
        COUNT(*) as total_files,
        SUM(page_count) as total_pages,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_files,
        COUNT(CASE WHEN status = 'uploading' THEN 1 END) as uploading_files,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_files
      FROM files
      WHERE project_id = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [projectId]);
    return result.rows[0];
  }
}

export default new FilesRepository();
