// routes/extractions.js
// COMPLETE FIXED VERSION - All endpoints working + extraction limit tracking

import express from 'express';
import { getExtractor } from '../services/ai/index.js';
import pdfToImageService from '../services/pdf/PdfToImageService.js';
import fileFetcher from '../services/storage/FileFetcher.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize AI extractor
const openAIExtractor = getExtractor('openai');

// Extraction prompt
const promptPath = path.join(__dirname, '../services/ai/prompts/extraction_v1.txt');
const EXTRACTION_PROMPT = await fs.readFile(promptPath, 'utf-8');

/**
 * POST /api/v1/extractions/start
 * Start extraction for a specific page
 */
router.post('/start', async (req, res) => {
  try {
    const { file_id, page_number } = req.body;

    if (!file_id || !page_number) {
      return res.status(400).json({ error: 'file_id and page_number required' });
    }

    // Check if extraction already exists
    const existingResult = await pool.query(
      'SELECT * FROM extractions WHERE file_id = $1 AND page_number = $2',
      [file_id, page_number]
    );

    let extractionId;

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];

      // 🚫 CHECK EXTRACTION LIMIT (2 attempts max)
      const currentAttempts = existing.extraction_attempts || 1;
      if (currentAttempts >= 2 && (existing.status === 'completed' || existing.status === 'failed')) {
        console.log(`🚫 Extraction limit reached for page ${page_number} (${currentAttempts} attempts)`);
        return res.status(429).json({
          error: 'Re-extract limit reached',
          message: `This page has already been extracted ${currentAttempts} times. Limit: 2 attempts per page.`,
          attempts: currentAttempts,
          limit: 2
        });
      }

      // CASE 1: Failed extraction - IMMEDIATE RETRY + CLEANUP
      if (existing.status === 'failed') {
        console.log(`♻️  Retrying failed extraction for page ${page_number}`);

        // Delete old line items
        await pool.query(
          'DELETE FROM line_items WHERE extraction_id = $1',
          [existing.id]
        );
        console.log(`🗑️  Cleaned up old line items for extraction ${existing.id}`);

        await pool.query(
          `UPDATE extractions 
           SET status = 'pending', 
               completed_at = NULL,
               raw_response = NULL,
               extracted_items = NULL,
               confidence_score = NULL,
               processing_time_ms = NULL,
               extraction_attempts = extraction_attempts + 1
           WHERE id = $1`,
          [existing.id]
        );
        extractionId = existing.id;
      }
      // CASE 2: Completed extraction - IMMEDIATE RE-EXTRACT + CLEANUP
      else if (existing.status === 'completed') {
        console.log(`✅ Re-extracting page ${page_number} (user requested)`);

        // Delete old line items
        await pool.query(
          'DELETE FROM line_items WHERE extraction_id = $1',
          [existing.id]
        );
        console.log(`🗑️  Cleaned up old line items for extraction ${existing.id}`);

        await pool.query(
          `UPDATE extractions 
           SET status = 'pending',
               completed_at = NULL,
               raw_response = NULL,
               extracted_items = NULL,
               confidence_score = NULL,
               processing_time_ms = NULL,
               extraction_attempts = extraction_attempts + 1
           WHERE id = $1`,
          [existing.id]
        );
        extractionId = existing.id;
      }
      // CASE 3: Processing - CHECK IF STUCK
      else if (existing.status === 'processing') {
        const createdAt = new Date(existing.created_at);
        const now = new Date();
        const minutesElapsed = (now - createdAt) / 1000 / 60;

        if (minutesElapsed > 5) {
          console.log(`⚠️  Resetting stuck extraction (${Math.round(minutesElapsed)}min old) for page ${page_number}`);

          // Delete old line items
          await pool.query(
            'DELETE FROM line_items WHERE extraction_id = $1',
            [existing.id]
          );
          console.log(`🗑️  Cleaned up old line items for stuck extraction ${existing.id}`);

          await pool.query(
            `UPDATE extractions 
             SET status = 'pending', 
                 completed_at = NULL,
                 raw_response = NULL,
                 extracted_items = NULL
             WHERE id = $1`,
            [existing.id]
          );
          extractionId = existing.id;
        } else {
          const secondsElapsed = Math.round((now - createdAt) / 1000);
          console.log(`⏳ Extraction for page ${page_number} still processing (${secondsElapsed}s elapsed)`);
          return res.json({
            id: existing.id,
            status: 'processing',
            message: `Extraction already in progress (${secondsElapsed}s elapsed)`,
            elapsed_seconds: secondsElapsed
          });
        }
      }
      // CASE 4: Pending
      else if (existing.status === 'pending') {
        console.log(`⏳ Page ${page_number} already pending, using existing ID`);
        extractionId = existing.id;
      }
    } else {
      // Create new extraction (first attempt)
      console.log(`🆕 Creating new extraction for page ${page_number}`);
      const result = await pool.query(
        `INSERT INTO extractions (file_id, page_number, status, model_version, extraction_attempts)
         VALUES ($1, $2, 'pending', 'gpt-4o', 1)
         RETURNING id`,
        [file_id, page_number]
      );
      extractionId = result.rows[0].id;
    }

    // Trigger background processing
    processExtraction(extractionId).catch(error => {
      console.error('❌ Background extraction failed:', error);
    });

    res.json({
      id: extractionId,
      status: 'processing',
      message: 'Extraction started'
    });

  } catch (error) {
    console.error('❌ Start extraction failed:', error);
    res.status(500).json({ error: 'Failed to start extraction', details: error.message });
  }
});

/**
 * Background processing function
 */
async function processExtraction(extractionId) {
  let tempPdfPath = null;
  let imagePath = null;

  try {
    console.log(`⚙️  Processing ${extractionId}...`);

    // 1. Get extraction record
    const extractionResult = await pool.query(
      'SELECT * FROM extractions WHERE id = $1',
      [extractionId]
    );
    const extraction = extractionResult.rows[0];

    if (!extraction) {
      throw new Error('Extraction not found');
    }

    // 2. Get file data
    const fileResult = await pool.query(
      'SELECT * FROM files WHERE id = $1',
      [extraction.file_id]
    );
    const file = fileResult.rows[0];

    if (!file) {
      throw new Error('File not found');
    }

    console.log(`🚀 Extract file ${file.id}, page ${extraction.page_number}`);
    console.log(`   File: ${file.original_filename} (${file.page_count} pages)`);

    // 3. Update to processing
    await pool.query(
      `UPDATE extractions SET status = 'processing' WHERE id = $1`,
      [extractionId]
    );

    // 4. Get PDF and convert to image
    const startTime = Date.now();
    const result = await fileFetcher.getPdfForPage(file, extraction.page_number);
    tempPdfPath = result.tempPdfPath;
    imagePath = result.imagePath;

    console.log(`🖼️  Image ready: ${imagePath}`);

    // 5. Convert image to base64 for OpenAI
    console.log(`🔄 Converting image to base64...`);
    const imageBase64 = await pdfToImageService.imageToBase64DataUrl(imagePath);

    // 6. Extract with OpenAI
    console.log(`🤖 Calling OpenAI...`);
    const aiResult = await openAIExtractor.extract(
      imageBase64,  // Use base64 data URL
      EXTRACTION_PROMPT,
      { page_number: extraction.page_number }
    );

    const processingTime = Date.now() - startTime;
    console.log(`✅ OpenAI responded in ${processingTime}ms`);
    console.log(`   Found ${aiResult.line_items.length} line items`);

    // 7. Save line items to database
    for (const item of aiResult.line_items) {
      await pool.query(
        `INSERT INTO line_items (
          extraction_id, line_number, 
          description, quantity, unit, unit_price, total_price,
          original_description, original_quantity, original_unit, original_unit_price, original_total_price,
          confidence_score, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          extractionId,
          item.line_number,
          // Current values (what user sees/edits)
          item.description,
          item.quantity,
          item.unit,
          item.unit_price,
          item.total_price,
          // Original values (for comparison in export)
          item.description,     // Same as current initially
          item.quantity,        // Same as current initially
          item.unit,           // Same as current initially
          item.unit_price,     // Same as current initially
          item.total_price,    // Same as current initially
          item.confidence_score,
          'ai'
        ]
      );
    }

    // 8. Update extraction as completed
    await pool.query(
      `UPDATE extractions 
       SET status = 'completed',
           completed_at = NOW(),
           raw_response = $1,
           extracted_items = $2,
           confidence_score = $3,
           processing_time_ms = $4
       WHERE id = $5`,
      [
        JSON.stringify(aiResult.raw_response),
        JSON.stringify(aiResult.line_items),
        aiResult.confidence_score,
        processingTime,
        extractionId
      ]
    );

    console.log(`✅ Completed: ${extractionId}`);

  } catch (error) {
    console.error(`❌ Failed:`, error);

    // Mark as failed
    await pool.query(
      `UPDATE extractions 
       SET status = 'failed',
           completed_at = NOW()
       WHERE id = $1`,
      [extractionId]
    );

  } finally {
    // Cleanup temp files
    if (tempPdfPath) {
      try {
        await fs.unlink(tempPdfPath);
        console.log(`🗑️  Cleaned up: ${tempPdfPath}`);
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
    if (imagePath) {
      try {
        await fs.unlink(imagePath);
        console.log(`🗑️  Cleaned up: ${imagePath}`);
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
  }
}

/**
 * GET /api/v1/extractions/:id
 * Get extraction with line items
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT e.*, 
              json_agg(
                json_build_object(
                  'id', li.id,
                  'line_number', li.line_number,
                  'description', li.description,
                  'quantity', li.quantity,
                  'unit', li.unit,
                  'unit_price', li.unit_price,
                  'total_price', li.total_price,
                  'was_edited', li.was_edited,
                  'source', li.source,
                  'confidence_score', li.confidence_score,
                  'original_description', li.original_description,
                  'original_quantity', li.original_quantity,
                  'original_unit_price', li.original_unit_price,
                  'original_total_price', li.original_total_price
                ) ORDER BY li.line_number
              ) FILTER (WHERE li.id IS NOT NULL) as line_items
       FROM extractions e
       LEFT JOIN line_items li ON li.extraction_id = e.id AND li.deleted_at IS NULL
       WHERE e.id = $1
       GROUP BY e.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Extraction not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Failed to get extraction:', error);
    res.status(500).json({ error: 'Failed to get extraction' });
  }
});

/**
 * GET /api/v1/extractions/file/:file_id
 * Get all extractions for file
 */
router.get('/file/:file_id', async (req, res) => {
  try {
    const { file_id } = req.params;

    const result = await pool.query(
      `SELECT e.*,
              COUNT(li.id) FILTER (WHERE li.deleted_at IS NULL) as items_count
       FROM extractions e
       LEFT JOIN line_items li ON li.extraction_id = e.id
       WHERE e.file_id = $1
       GROUP BY e.id
       ORDER BY e.page_number`,
      [file_id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Failed to get extractions:', error);
    res.status(500).json({ error: 'Failed to get extractions' });
  }
});

/**
 * GET /api/v1/extractions/preview/:file_id/:page_number
 * Get page preview image
 */
router.get('/preview/:file_id/:page_number', async (req, res) => {
  try {
    const { file_id, page_number } = req.params;

    // Get file
    const fileResult = await pool.query(
      'SELECT * FROM files WHERE id = $1',
      [file_id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Get PDF and convert to image
    const { imagePath } = await fileFetcher.getPdfForPage(file, parseInt(page_number));

    // Read image and send as base64
    const imageBuffer = await fs.readFile(imagePath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    // Cleanup
    await fs.unlink(imagePath);

    res.json({ image: dataUrl });

  } catch (error) {
    console.error('Failed to get preview:', error);
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

export default router;