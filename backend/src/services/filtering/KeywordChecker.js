// backend/src/services/filtering/KeywordChecker.js
// Simple keyword-based page relevance detection with UTF-8 text extraction

import fs from 'fs/promises';
import { getTopic } from '../../config/topics.js';
import logger from '../../utils/helpers/logger.js';

class KeywordChecker {
  /**
   * Check if a PDF page is relevant based on keywords
   *
   * @param {string} pdfPath - Path to single-page PDF
   * @param {string} topicKey - Topic key (e.g., 'striping')
   * @returns {Promise<Object>} { relevant: boolean, confidence: number, matchedKeywords: string[] }
   */
  async checkPageRelevance(pdfPath, topicKey) {
    try {
      const topic = getTopic(topicKey);
      if (!topic) {
        logger.warn(`Invalid topic: ${topicKey}`);
        return { relevant: false, confidence: 0, matchedKeywords: [] };
      }

      // Extract text from PDF (simple UTF-8 approach)
      const text = await this.extractTextFromPdf(pdfPath);

      // Search for keywords (case-insensitive)
      const lowerText = text.toLowerCase();
      const matchedKeywords = [];

      for (const keyword of topic.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        }
      }

      // Calculate confidence based on matches
      const matchRatio = matchedKeywords.length / topic.keywords.length;
      const confidence = Math.min(matchRatio * 2, 1);

      // Consider relevant if at least one keyword matches
      const relevant = matchedKeywords.length > 0;

      return {
        relevant,
        confidence: Math.round(confidence * 100) / 100,
        matchedKeywords
      };

    } catch (error) {
      logger.error('Keyword check failed:', error);
      return { relevant: false, confidence: 0, matchedKeywords: [], error: error.message };
    }
  }

  /**
   * Extract text from PDF using simple UTF-8 conversion
   * This is basic but works well for keyword matching in construction PDFs
   */
  async extractTextFromPdf(pdfPath) {
    try {
      const pdfBytes = await fs.readFile(pdfPath);

      // Convert PDF bytes to text
      // This gets both visible text and embedded text strings
      const text = pdfBytes.toString('utf8', 0, pdfBytes.length);

      return text;

    } catch (error) {
      logger.error('PDF text extraction failed:', error);
      return '';
    }
  }

  /**
   * Batch check multiple pages
   *
   * @param {Array} pages - Array of { pageNumber, pdfPath }
   * @param {string} topicKey - Topic key
   * @returns {Promise<Array>} Array of relevant page numbers
   */
  async batchCheck(pages, topicKey) {
    const results = await Promise.all(
      pages.map(async ({ pageNumber, pdfPath }) => {
        const check = await this.checkPageRelevance(pdfPath, topicKey);
        return { pageNumber, ...check };
      })
    );

    // Filter to relevant pages only
    const relevantPages = results
      .filter(r => r.relevant)
      .map(r => r.pageNumber)
      .sort((a, b) => a - b);

    // Log summary
    const totalMatches = results.reduce((sum, r) => sum + r.matchedKeywords.length, 0);
    logger.info(`📊 Topic "${topicKey}": ${relevantPages.length}/${pages.length} pages relevant (${totalMatches} total keyword matches)`);

    return relevantPages;
  }

  /**
   * Batch check multiple topics
   * Page is relevant if it matches ANY of the topics
   *
   * @param {Array} pages - Array of { pageNumber, pdfPath }
   * @param {Array<string>} topicKeys - Array of topic keys
   * @returns {Promise<Array>} Array of relevant page numbers
   */
  async batchCheckMultipleTopics(pages, topicKeys) {
    const allRelevantPages = new Set();

    // Check each topic
    for (const topicKey of topicKeys) {
      logger.info(`🔍 Checking topic: ${topicKey}`);
      const relevantForTopic = await this.batchCheck(pages, topicKey);
      relevantForTopic.forEach(pageNum => allRelevantPages.add(pageNum));
    }

    // Convert to sorted array
    const result = Array.from(allRelevantPages).sort((a, b) => a - b);

    logger.info(`📊 Multi-topic check complete: ${result.length}/${pages.length} pages relevant (topics: ${topicKeys.join(', ')})`);

    return result;
  }
}

export default new KeywordChecker();