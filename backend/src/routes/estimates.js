// routes/estimates.js
// API routes for generating estimates (ES6 format)

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * POST /api/v1/estimates/generate
 * Generate estimate from extractions
 */
router.post('/generate', async (req, res) => {
  const client = await pool.connect();

  try {
    const { file_id } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: 'file_id is required' });
    }

    console.log(`\n💰 Generating estimate for file ${file_id}`);

    await client.query('BEGIN');

    // 1. Get file info
    const fileResult = await client.query(
      'SELECT * FROM files WHERE id = $1',
      [file_id]
    );

    if (fileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // 2. Get all extractions for this file
    const extractionsResult = await client.query(
      `SELECT e.*, COUNT(li.id) as items_count
       FROM extractions e
       LEFT JOIN line_items li ON li.extraction_id = e.id AND li.deleted_at IS NULL
       WHERE e.file_id = $1
       GROUP BY e.id
       ORDER BY e.page_number`,
      [file_id]
    );

    const extractions = extractionsResult.rows;
    console.log(`   📄 Found ${extractions.length} extractions`);

    // 3. Get all line items
    const lineItemsResult = await client.query(
      `SELECT li.*
       FROM line_items li
       JOIN extractions e ON e.id = li.extraction_id
       WHERE e.file_id = $1 AND li.deleted_at IS NULL
       ORDER BY e.page_number, li.line_number`,
      [file_id]
    );

    const lineItems = lineItemsResult.rows;
    console.log(`   📝 Found ${lineItems.length} line items`);

    if (lineItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'No line items found. Extract at least one page first.'
      });
    }

    // 4. Calculate totals
    let subtotal = 0;
    for (const item of lineItems) {
      if (item.total_price) {
        subtotal += parseFloat(item.total_price);
      }
    }

    const taxAmount = 0; // Can add tax calculation later
    const total = subtotal + taxAmount;

    // 5. Calculate metrics
    const aiItemsCount = lineItems.filter(li => li.source === 'ai').length;
    const humanAdditionsCount = lineItems.filter(li => li.source === 'human').length;
    const humanEditsCount = lineItems.filter(li => li.was_edited && li.source === 'ai').length;
    const humanDeletionsCount = await client.query(
      `SELECT COUNT(*) as count
       FROM line_items li
       JOIN extractions e ON e.id = li.extraction_id
       WHERE e.file_id = $1 AND li.deleted_at IS NOT NULL`,
      [file_id]
    );

    const totalPages = file.page_count || extractions.length;
    const pagesReviewed = extractions.filter(e => e.status === 'completed').length;
    const completionPercentage = (pagesReviewed / totalPages) * 100;

    // 6. Create estimate
    const estimateResult = await client.query(
      `INSERT INTO estimates (
        file_id, project_id, subtotal, tax_amount, total,
        total_pages, pages_reviewed, completion_percentage,
        ai_items_count, human_edits_count, human_additions_count, human_deletions_count,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        file_id,
        file.project_id,
        subtotal,
        taxAmount,
        total,
        totalPages,
        pagesReviewed,
        Math.round(completionPercentage * 100) / 100,
        aiItemsCount,
        humanEditsCount,
        humanAdditionsCount,
        parseInt(humanDeletionsCount.rows[0].count),
        'draft'
      ]
    );

    const estimate = estimateResult.rows[0];

    // 7. Mark file as estimate generated (GOLDEN FLAG)
    await client.query(
      `UPDATE files 
       SET estimate_generated_at = NOW(),
           extraction_status = 'completed'
       WHERE id = $1`,
      [file_id]
    );

    await client.query('COMMIT');

    console.log(`   ✅ Estimate generated: $${total.toFixed(2)}`);
    console.log(`   📊 AI: ${aiItemsCount}, Human edits: ${humanEditsCount}, Additions: ${humanAdditionsCount}`);
    console.log(`   🎉 Estimate ${estimate.id} created!\n`);

    res.json({
      estimate,
      summary: {
        subtotal,
        tax_amount: taxAmount,
        total,
        line_items_count: lineItems.length,
        ai_items_count: aiItemsCount,
        human_edits_count: humanEditsCount,
        human_additions_count: humanAdditionsCount,
        human_deletions_count: parseInt(humanDeletionsCount.rows[0].count),
        pages_reviewed: pagesReviewed,
        total_pages: totalPages,
        completion_percentage: Math.round(completionPercentage)
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to generate estimate:', error);
    res.status(500).json({
      error: 'Failed to generate estimate',
      details: error.message
    });
  } finally {
    client.release();
  }
});


/**
 * GET /api/v1/estimates/:id
 * Get estimate details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM estimates WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Failed to get estimate:', error);
    res.status(500).json({ error: 'Failed to get estimate' });
  }
});


/**
 * GET /api/v1/estimates/file/:file_id
 * Get estimates for a file
 */
router.get('/file/:file_id', async (req, res) => {
  try {
    const { file_id } = req.params;

    const result = await pool.query(
      'SELECT * FROM estimates WHERE file_id = $1 ORDER BY generated_at DESC',
      [file_id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Failed to get estimates:', error);
    res.status(500).json({ error: 'Failed to get estimates' });
  }
});


export default router;