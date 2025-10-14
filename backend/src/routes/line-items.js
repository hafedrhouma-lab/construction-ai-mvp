// routes/line-items.js
// API routes for editing line items (ES6 format)

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * PUT /api/v1/line-items/:id
 * Update a line item (human correction)
 */
router.put('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { description, quantity, unit, unit_price, total_price } = req.body;

    console.log(`✏️  Updating line item ${id}`);

    // Get current values
    const current = await client.query(
      'SELECT * FROM line_items WHERE id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    const item = current.rows[0];

    // Build update query with PROPER DELTA TRACKING
    const updates = [];
    const values = [];
    let paramCount = 1;

    // CRITICAL FIX: Save original values on FIRST edit
    if (!item.was_edited) {
      // This is the first edit - save current values as "original" (AI values)
      updates.push(`original_description = $${paramCount++}`);
      values.push(item.description);

      updates.push(`original_quantity = $${paramCount++}`);
      values.push(item.quantity);

      updates.push(`original_unit_price = $${paramCount++}`);
      values.push(item.unit_price);

      updates.push(`original_total_price = $${paramCount++}`);
      values.push(item.total_price);
    }

    // Update current values with new human input
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount++}`);
      values.push(quantity);
    }

    if (unit !== undefined) {
      updates.push(`unit = $${paramCount++}`);
      values.push(unit);
    }

    if (unit_price !== undefined) {
      updates.push(`unit_price = $${paramCount++}`);
      values.push(unit_price);
    }

    if (total_price !== undefined) {
      updates.push(`total_price = $${paramCount++}`);
      values.push(total_price);
    }

    // Mark as edited
    updates.push(`was_edited = true`);
    updates.push(`edited_at = NOW()`);

    // Add ID parameter
    values.push(id);

    const query = `
      UPDATE line_items 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    console.log('🔧 Update query:', query);
    console.log('📊 Values:', values);

    const result = await client.query(query, values);

    console.log(`   ✅ Line item updated - AI values preserved!`);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Failed to update line item:', error);
    res.status(500).json({
      error: 'Failed to update line item',
      details: error.message
    });
  } finally {
    client.release();
  }
});


/**
 * POST /api/v1/line-items
 * Add a new line item (human addition)
 */
router.post('/', async (req, res) => {
  try {
    const { extraction_id, description, quantity, unit, unit_price, total_price } = req.body;

    if (!extraction_id) {
      return res.status(400).json({ error: 'extraction_id is required' });
    }

    console.log(`➕ Adding new line item to extraction ${extraction_id}`);

    // Get max line number for this extraction
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX(line_number), 0) as max_line FROM line_items WHERE extraction_id = $1',
      [extraction_id]
    );

    const lineNumber = maxResult.rows[0].max_line + 1;

    const result = await pool.query(
      `INSERT INTO line_items (
        extraction_id, line_number, description, quantity, unit, unit_price, total_price,
        source, was_edited
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        extraction_id,
        lineNumber,
        description || '',
        quantity || null,
        unit || '',
        unit_price || null,
        total_price || null,
        'human',
        false // New items created by human, not "edited"
      ]
    );

    console.log(`   ✅ Line item added: #${lineNumber}`);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Failed to add line item:', error);
    res.status(500).json({
      error: 'Failed to add line item',
      details: error.message
    });
  }
});


/**
 * DELETE /api/v1/line-items/:id
 * Soft delete a line item
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️  Deleting line item ${id}`);

    const result = await pool.query(
      `UPDATE line_items 
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Line item not found or already deleted' });
    }

    console.log(`   ✅ Line item soft deleted`);
    res.json({ message: 'Line item deleted', item: result.rows[0] });

  } catch (error) {
    console.error('Failed to delete line item:', error);
    res.status(500).json({ error: 'Failed to delete line item' });
  }
});


export default router;