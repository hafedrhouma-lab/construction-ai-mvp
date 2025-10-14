import filesRepository from './repository.js';
import { generatePresignedUrl } from '../../utils/aws/s3Client.js';
import pdfProcessor from '../../utils/pdf/pdfProcessor.js';
import logger from '../../utils/helpers/logger.js';
import config from '../../config/env.js';
import fs from 'fs/promises';

class FilesService {
  /**
   * Create a new file record
   */
  async create(fileData) {
    logger.info(`Creating file record: ${fileData.original_filename}`);

    // Default to demo user if not provided
    const data = {
      ...fileData,
      user_id: fileData.user_id || '00000000-0000-0000-0000-000000000001',
      s3_bucket: config.s3.bucket
    };

    const file = await filesRepository.create(data);
    
    logger.info(`✅ File record created: ${file.id}`);
    return file;
  }

  /**
   * ✨ NEW: Upload PDF and process (split into pages)
   * This is the main upload endpoint for large files
   */
  async uploadAndProcess(fileData, filePath) {
    const { project_id, original_filename } = fileData;
    
    logger.info(`🚀 Starting upload and process: ${original_filename}`);

    try {
      // Step 1: Validate PDF
      const validation = await pdfProcessor.validatePDF(filePath);
      if (!validation.valid) {
        throw new Error(`Invalid PDF: ${validation.error}`);
      }

      logger.info(`✅ PDF validated: ${validation.sizeMB}MB`);

      // Step 2: Get page count
      const totalPages = await pdfProcessor.getPageCount(filePath);
      logger.info(`📄 PDF has ${totalPages} pages`);

      // Step 3: Create file record (status: processing)
      const file = await this.create({
        project_id,
        original_filename,
        total_pages: totalPages,
        file_size: validation.size
      });

      // Set status to processing
      await filesRepository.updateStatus(file.id, 'processing');

      logger.info(`📊 File record created: ${file.id}`);

      // Step 4: Split and upload to S3 in background
      // (In production, this would be a queue job)
      this.processFileInBackground(file.id, filePath, file.s3_key, config.s3.bucket);

      // Return immediately with file info
      return {
        ...file,
        status: 'processing',
        message: 'File upload successful. Processing pages...'
      };

    } catch (error) {
      logger.error('❌ Upload and process failed:', error);
      throw error;
    }
  }

  /**
   * Process file in background (split + upload to S3)
   * In production, this would be a Bull queue job
   */
  async processFileInBackground(fileId, filePath, s3Key, bucket) {
    try {
      logger.info(`⚙️ Background processing started: ${fileId}`);

      // Progress callback
      const onProgress = async (current, total) => {
        const percent = Math.round((current / total) * 100);
        logger.info(`📊 Progress: ${current}/${total} (${percent}%)`);
        
        // Update metadata with progress
        await filesRepository.updateMetadata(fileId, {
          processingProgress: percent,
          processedPages: current,
          totalPages: total
        });
      };

      // Split and upload pages
      const result = await pdfProcessor.splitAndUploadToS3(
        filePath,
        s3Key,
        bucket,
        onProgress
      );

      logger.info(`✅ Processing complete: ${result.totalPages} pages in ${result.timeElapsed}s`);

      // Update file record
      await filesRepository.confirmUpload(fileId, result.totalPages);
      await filesRepository.updateMetadata(fileId, {
        pages: result.pages,
        processingTime: result.timeElapsed,
        completedAt: new Date().toISOString()
      });

      // Clean up temp file
      await fs.unlink(filePath);
      logger.info(`🗑️ Temp file deleted: ${filePath}`);

    } catch (error) {
      logger.error(`❌ Background processing failed for ${fileId}:`, error);
      
      // Update status to failed
      await filesRepository.updateStatus(fileId, 'failed');
      await filesRepository.updateMetadata(fileId, {
        error: error.message,
        failedAt: new Date().toISOString()
      });

      // Clean up temp file
      try {
        await fs.unlink(filePath);
      } catch (e) {
        logger.error('Failed to delete temp file:', e);
      }
    }
  }

  /**
   * Get presigned URL for uploading a page
   */
  async getPageUploadUrl(fileId, pageNumber) {
    // Verify file exists
    const file = await filesRepository.findById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // Generate S3 key for this page
    const pageKey = `${file.s3_key}/page-${pageNumber}.pdf`;

    // Generate presigned URL (15 min expiration)
    const uploadUrl = await generatePresignedUrl(
      config.s3.bucket,
      pageKey,
      'putObject',
      900 // 15 minutes
    );

    logger.info(`Generated upload URL for file ${fileId}, page ${pageNumber}`);

    return {
      uploadUrl,
      pageKey,
      fileId,
      pageNumber
    };
  }

  /**
   * Confirm upload complete
   */
  async confirmUpload(fileId, pageCount) {
    logger.info(`Confirming upload for file ${fileId}: ${pageCount} pages`);

    const file = await filesRepository.confirmUpload(fileId, pageCount);
    
    if (!file) {
      throw new Error('File not found');
    }

    // Update metadata with page list
    const pages = [];
    for (let i = 1; i <= pageCount; i++) {
      pages.push({
        pageNumber: i,
        s3Key: `${file.s3_key}/page-${i}.pdf`
      });
    }

    await filesRepository.updateMetadata(fileId, {
      pages,
      uploadConfirmedAt: new Date().toISOString()
    });

    logger.info(`✅ Upload confirmed: ${file.id}`);
    return file;
  }

  /**
   * Get files for a project
   */
  async getByProject(projectId, filters = {}) {
    return await filesRepository.findByProject(projectId, filters);
  }

  /**
   * Get file by ID
   */
  async getById(id) {
    const file = await filesRepository.findById(id);
    
    if (!file) {
      throw new Error('File not found');
    }

    return file;
  }

  /**
   * Get file with presigned URLs for all pages
   */
  async getFileWithUrls(id) {
    const file = await this.getById(id);
    
    // Parse metadata
    const metadata = typeof file.metadata === 'string' 
      ? JSON.parse(file.metadata) 
      : file.metadata;

    const pages = metadata.pages || [];

    // Generate presigned URLs for viewing (1 hour expiration)
    const pagesWithUrls = await Promise.all(
      pages.map(async (page) => {
        const viewUrl = await generatePresignedUrl(
          config.s3.bucket,
          page.s3Key,
          'getObject',
          3600 // 1 hour
        );
        return {
          ...page,
          viewUrl
        };
      })
    );

    return {
      ...file,
      metadata: {
        ...metadata,
        pages: pagesWithUrls
      }
    };
  }

  /**
   * Delete file
   */
  async delete(id) {
    logger.info(`Deleting file: ${id}`);

    const file = await filesRepository.delete(id);
    
    if (!file) {
      throw new Error('File not found');
    }

    // TODO: Delete from S3 (optional - can keep for recovery)
    // const pages = file.metadata?.pages || [];
    // for (const page of pages) {
    //   await deleteFromS3(page.s3Key);
    // }

    logger.info(`✅ File deleted: ${id}`);
    return { success: true };
  }

  /**
   * Get project file statistics
   */
  async getProjectStats(projectId) {
    return await filesRepository.getProjectStats(projectId);
  }
}

export default new FilesService();
