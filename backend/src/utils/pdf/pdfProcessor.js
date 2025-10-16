import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import logger from '../helpers/logger.js';
import s3Service from '../aws/s3Client.js';
import { getTopic } from '../../config/topics.js'; // 🚀 Import at top!

/**
 * PDF Processing Service
 * 🚀 NOW: Checks keywords DURING page extraction (not after!)
 */
class PDFProcessorService {
  /**
   * 🚀 UPDATED: Split PDF, check keywords inline, upload to S3
   *
   * @param {string} filePath - Path to PDF file on disk
   * @param {string} s3BaseKey - Base S3 key
   * @param {string} bucket - S3 bucket name
   * @param {Function} onProgress - Progress callback
   * @param {Array<string>} topics - Topics for filtering (optional)
   * @returns {Promise<Object>} Result with pages and relevant page numbers
   */
  async splitAndUploadToS3(filePath, s3BaseKey, bucket, onProgress = null, topics = []) {
    const startTime = Date.now();
    logger.info(`📄 Starting PDF split and upload: ${filePath}`);
    if (topics && topics.length > 0) {
      logger.info(`🎯 Will filter for topics: ${topics.join(', ')}`);
    }

    try {
      // Load PDF
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const totalPages = pdfDoc.getPageCount();

      logger.info(`📊 PDF has ${totalPages} pages`);

      const uploadedPages = [];
      const relevantPages = new Set(); // Track relevant pages
      const BATCH_SIZE = 1; // Process 1 pages at once

      // Process in batches
      for (let i = 0; i < totalPages; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, totalPages);
        const batchPromises = [];

        logger.info(`📦 Processing batch: pages ${i + 1}-${batchEnd}`);

        // Create batch of page processing (extract + filter + upload)
        for (let pageIndex = i; pageIndex < batchEnd; pageIndex++) {
          const pageNumber = pageIndex + 1;

          batchPromises.push(
            this.processPage(
              pdfDoc,
              pageIndex,
              pageNumber,
              s3BaseKey,
              bucket,
              topics
            )
          );
        }

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);

        // Collect results
        batchResults.forEach(result => {
          uploadedPages.push({
            pageNumber: result.pageNumber,
            s3Key: result.s3Key,
            size: result.size
          });

          // Track relevant pages
          if (result.isRelevant) {
            relevantPages.add(result.pageNumber);
          }
        });

        // Call progress callback
        if (onProgress) {
          await onProgress(batchEnd, totalPages);
        }

        logger.info(`✅ Batch complete: ${batchEnd}/${totalPages} pages`);
      }

      const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const relevantArray = Array.from(relevantPages).sort((a, b) => a - b);

      logger.info(`🎉 Processing complete: ${totalPages} pages in ${timeElapsed}s`);
      if (topics.length > 0) {
        logger.info(`📊 Filtering result: ${relevantArray.length}/${totalPages} pages relevant`);
      }

      return {
        totalPages,
        pages: uploadedPages,
        relevantPages: relevantArray, // 🚀 NEW: Return filtered pages
        timeElapsed: parseFloat(timeElapsed)
      };

    } catch (error) {
      logger.error('❌ PDF processing failed:', error);
      throw error;
    }
  }

  /**
   * 🚀 NEW: Process single page (extract + filter + upload)
   * @private
   */
  async processPage(pdfDoc, pageIndex, pageNumber, s3BaseKey, bucket, topics) {
    try {
      // 1. Extract page as PDF bytes
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(pdfDoc, [pageIndex]);
      newDoc.addPage(copiedPage);
      const pdfBytes = await newDoc.save();

      // 2. Check keywords if topics provided (inline!)
      let isRelevant = true; // Default: all pages relevant

      if (topics && topics.length > 0) {
        // Convert PDF bytes to text for keyword matching
        const text = Buffer.from(pdfBytes).toString('utf8');
        isRelevant = this.checkPageKeywords(text, topics);
      }

      // 3. Upload to S3
      const s3Key = `${s3BaseKey}/page-${pageNumber}.pdf`;
      await s3Service.uploadBuffer(pdfBytes, s3Key, bucket, 'application/pdf');

      logger.info(`✅ Page ${pageNumber}: uploaded ${isRelevant ? '(relevant)' : '(not relevant)'}`);


      return {
        pageNumber,
        s3Key,
        size: pdfBytes.length,
        isRelevant // 🚀 NEW: Whether page is relevant
      };

    } catch (error) {
      logger.error(`❌ Failed to process page ${pageNumber}:`, error);
      throw error;
    }
  }

  /**
   * 🚀 NEW: Quick keyword check (inline, no file I/O)
   * @private
   */
  checkPageKeywords(text, topicKeys) {
    const lowerText = text.toLowerCase();

    // Check if ANY topic keywords match
    for (const topicKey of topicKeys) {
      const topic = getTopic(topicKey); // Already imported at top
      if (!topic) continue;

      // Check keywords for this topic
      for (const keyword of topic.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return true; // Found match!
        }
      }
    }

    return false; // No matches
  }

  /**
   * Get page count from PDF
   */
  async getPageCount(filePath) {
    try {
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      return pdfDoc.getPageCount();
    } catch (error) {
      logger.error('Failed to get page count:', error);
      throw error;
    }
  }

  /**
   * Validate PDF file
   */
  async validatePDF(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const pdfBytes = await fs.readFile(filePath);
      await PDFDocument.load(pdfBytes);

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