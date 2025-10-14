import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import logger from '../helpers/logger.js';
import s3Service from '../aws/s3Client.js';

/**
 * PDF Processing Service
 * Handles splitting PDFs into individual pages and uploading to S3
 */
class PDFProcessorService {
  /**
   * Split PDF into individual pages and upload to S3
   * Processes in batches to manage memory
   * 
   * @param {string} filePath - Path to PDF file on disk
   * @param {string} s3BaseKey - Base S3 key (e.g., "pages/file-uuid")
   * @param {string} bucket - S3 bucket name
   * @param {Function} onProgress - Progress callback (pageNumber, totalPages)
   * @returns {Promise<Object>} Result with page count and S3 keys
   */
  async splitAndUploadToS3(filePath, s3BaseKey, bucket, onProgress = null) {
    const startTime = Date.now();
    logger.info(`📄 Starting PDF split and upload: ${filePath}`);

    try {
      // Load PDF
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const totalPages = pdfDoc.getPageCount();

      logger.info(`📊 PDF has ${totalPages} pages`);

      const uploadedPages = [];
      const BATCH_SIZE = 10; // Upload 10 pages at once

      // Process and upload in batches
      for (let i = 0; i < totalPages; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, totalPages);
        const batchPromises = [];

        logger.info(`📦 Processing batch: pages ${i + 1}-${batchEnd}`);

        // Create batch of page uploads
        for (let pageIndex = i; pageIndex < batchEnd; pageIndex++) {
          const pageNumber = pageIndex + 1;
          
          batchPromises.push(
            this.extractAndUploadPage(
              pdfDoc,
              pageIndex,
              pageNumber,
              s3BaseKey,
              bucket
            )
          );
        }

        // Upload batch in parallel
        const batchResults = await Promise.all(batchPromises);
        uploadedPages.push(...batchResults);

        // Report progress
        if (onProgress) {
          onProgress(batchEnd, totalPages);
        }

        logger.info(`✅ Batch complete: ${batchEnd}/${totalPages} pages uploaded`);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`🎉 PDF split complete: ${totalPages} pages in ${elapsed}s`);

      return {
        totalPages,
        pages: uploadedPages,
        timeElapsed: elapsed
      };

    } catch (error) {
      logger.error('❌ PDF split and upload failed:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  /**
   * Extract single page and upload to S3
   * @private
   */
  async extractAndUploadPage(pdfDoc, pageIndex, pageNumber, s3BaseKey, bucket) {
    try {
      // Create new single-page PDF
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(pdfDoc, [pageIndex]);
      newDoc.addPage(copiedPage);

      // Save to bytes
      const pdfBytes = await newDoc.save();

      // Generate S3 key
      const s3Key = `${s3BaseKey}/page-${pageNumber}.pdf`;

      // Upload to S3
      await s3Service.uploadBuffer(pdfBytes, s3Key, bucket, 'application/pdf');

      logger.debug(`✅ Page ${pageNumber} uploaded: ${s3Key}`);

      return {
        pageNumber,
        s3Key,
        size: pdfBytes.length
      };

    } catch (error) {
      logger.error(`❌ Failed to upload page ${pageNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get page count from PDF without loading full document
   * Useful for validation before processing
   */
  async getPageCount(filePath) {
    try {
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      return pdfDoc.getPageCount();
    } catch (error) {
      logger.error('Failed to get page count:', error);
      throw new Error('Invalid PDF file');
    }
  }

  /**
   * Validate PDF file
   */
  async validatePDF(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      // Check file exists
      if (!stats.isFile()) {
        throw new Error('Not a file');
      }

      // Check file size (max 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (stats.size > maxSize) {
        throw new Error(`File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max 500MB)`);
      }

      // Try to load PDF
      await this.getPageCount(filePath);

      return {
        valid: true,
        size: stats.size,
        sizeMB: (stats.size / 1024 / 1024).toFixed(2)
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

export default new PDFProcessorService();
