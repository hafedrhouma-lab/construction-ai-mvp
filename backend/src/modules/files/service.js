import filesRepository from './repository.js';
import { generatePresignedUrl } from '../../utils/aws/s3Client.js';
import pdfProcessor from '../../utils/pdf/pdfProcessor.js';
import { isValidTopic } from '../../config/topics.js';
import logger from '../../utils/helpers/logger.js';
import config from '../../config/env.js';
import fs from 'fs/promises';

class FilesService {
  /**
   * Create a new file record
   */
  async create(fileData) {
    logger.info(`Creating file record: ${fileData.original_filename}`);

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
   * 🚀 UPDATED: Upload PDF and process (with inline filtering!)
   */
  async uploadAndProcess(fileData, filePath) {
    const { project_id, original_filename, topics } = fileData;

    logger.info(`🚀 Starting upload and process: ${original_filename}`);
    if (topics && topics.length > 0) {
      logger.info(`🎯 Topics filtering: ${topics.join(', ')}`);
    }

    try {
      // Validate topics if provided
      if (topics && topics.length > 0) {
        for (const topicKey of topics) {
          if (!isValidTopic(topicKey)) {
            throw new Error(`Invalid topic: ${topicKey}`);
          }
        }
      }

      // Validate PDF
      const validation = await pdfProcessor.validatePDF(filePath);
      if (!validation.valid) {
        throw new Error(`Invalid PDF: ${validation.error}`);
      }

      logger.info(`✅ PDF validated: ${validation.sizeMB}MB`);

      // Get page count
      const totalPages = await pdfProcessor.getPageCount(filePath);
      logger.info(`📄 PDF has ${totalPages} pages`);

      // Create file record (status: processing)
      const file = await this.create({
        project_id,
        original_filename,
        total_pages: totalPages,
        file_size: validation.size,
        topics: topics || []
      });

      // Set status to processing
      await filesRepository.updateStatus(file.id, 'processing');

      logger.info(`📊 File record created: ${file.id}`);

      // Process in background
      this.processFileInBackground(file.id, filePath, file.s3_key, config.s3.bucket, topics);

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
   * 🚀 SIMPLIFIED: Process file in background (filtering happens inline now!)
   */
  async processFileInBackground(fileId, filePath, s3Key, bucket, topics = []) {
    try {
      logger.info(`⚙️ Background processing started: ${fileId}`);

      // Progress callback
      const onProgress = async (current, total) => {
        const percent = Math.round((current / total) * 100);
        logger.info(`📊 Progress: ${current}/${total} (${percent}%)`);

        await filesRepository.updateMetadata(fileId, {
          processingProgress: percent,
          processedPages: current,
          totalPages: total
        });
      };

      // 🚀 Split, filter, and upload (all in one pass!)
      const result = await pdfProcessor.splitAndUploadToS3(
        filePath,
        s3Key,
        bucket,
        onProgress,
        topics // Pass topics for inline filtering
      );

      logger.info(`✅ Processing complete: ${result.totalPages} pages in ${result.timeElapsed}s`);

      // Update file record with results
      await filesRepository.confirmUpload(fileId, result.totalPages);

      // 🚀 Save relevant pages (from inline filtering)
      if (result.relevantPages && result.relevantPages.length > 0) {
        await filesRepository.update(fileId, {
          relevant_pages: result.relevantPages
        });
        logger.info(`📊 Saved ${result.relevantPages.length} relevant pages`);
      }

      await filesRepository.updateMetadata(fileId, {
        pages: result.pages,
        processingTime: result.timeElapsed,
        completedAt: new Date().toISOString(),
        relevantPagesCount: result.relevantPages ? result.relevantPages.length : result.totalPages
      });

      // Clean up temp file
      await fs.unlink(filePath);
      logger.info(`🗑️ Temp file deleted: ${filePath}`);

    } catch (error) {
      logger.error(`❌ Background processing failed for ${fileId}:`, error);

      await filesRepository.updateStatus(fileId, 'failed');
      await filesRepository.updateMetadata(fileId, {
        error: error.message,
        failedAt: new Date().toISOString()
      });

      try {
        await fs.unlink(filePath);
      } catch (e) {
        logger.error('Failed to delete temp file:', e);
      }
    }
  }

  async getPageUploadUrl(fileId, pageNumber) {
    const file = await filesRepository.findById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const pageKey = `${file.s3_key}/page-${pageNumber}.pdf`;
    const uploadUrl = await generatePresignedUrl(
      config.s3.bucket,
      pageKey,
      'putObject',
      900
    );

    logger.info(`Generated upload URL for file ${fileId}, page ${pageNumber}`);

    return {
      uploadUrl,
      pageKey,
      fileId,
      pageNumber
    };
  }

  async confirmUpload(fileId, pageCount) {
    logger.info(`Confirming upload for file ${fileId}: ${pageCount} pages`);

    const file = await filesRepository.confirmUpload(fileId, pageCount);

    if (!file) {
      throw new Error('File not found');
    }

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

  async getByProject(projectId, filters = {}) {
    return await filesRepository.findByProject(projectId, filters);
  }

  async getById(id) {
    const file = await filesRepository.findById(id);

    if (!file) {
      throw new Error('File not found');
    }

    return file;
  }

  async getFileWithUrls(id) {
    const file = await this.getById(id);

    const metadata = typeof file.metadata === 'string'
      ? JSON.parse(file.metadata)
      : file.metadata;

    const pages = metadata.pages || [];

    const pagesWithUrls = await Promise.all(
      pages.map(async (page) => {
        const viewUrl = await generatePresignedUrl(
          config.s3.bucket,
          page.s3Key,
          'getObject',
          3600
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

  async delete(id) {
    logger.info(`Deleting file: ${id}`);

    const file = await filesRepository.delete(id);

    if (!file) {
      throw new Error('File not found');
    }

    logger.info(`✅ File deleted: ${id}`);
    return { success: true };
  }

  async getProjectStats(projectId) {
    return await filesRepository.getProjectStats(projectId);
  }
}

export default new FilesService();