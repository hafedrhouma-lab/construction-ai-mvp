// routes/exports.js
// CSV Export with AI vs Human Delta Tracking
// KEY FOR CLIENT: Shows corrections for dataset valuation

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * GET /api/v1/estimates/:id/export
 * Export estimate as CSV with AI vs Human delta
 */
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;

    // Get estimate
    const estimateResult = await pool.query(
      'SELECT * FROM estimates WHERE id = $1',
      [id]
    );

    if (estimateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = estimateResult.rows[0];

    // Get file info
    const fileResult = await pool.query(
      'SELECT * FROM files WHERE id = $1',
      [estimate.file_id]
    );
    const file = fileResult.rows[0];

    // Get all line items with extraction info
    const itemsResult = await pool.query(
      `SELECT 
        li.*,
        e.page_number,
        e.completed_at as extraction_timestamp
       FROM line_items li
       JOIN extractions e ON e.id = li.extraction_id
       WHERE e.file_id = $1 AND li.deleted_at IS NULL
       ORDER BY e.page_number, li.line_number`,
      [estimate.file_id]
    );

    const lineItems = itemsResult.rows;

    // Build CSV
    let csv = '';

    // Header
    csv += '# QuickBids AI Extraction Export\n';
    csv += `# File: ${file.original_filename}\n`;
    csv += `# Generated: ${new Date().toISOString()}\n`;
    csv += `# Total: $${Number(estimate.total).toFixed(2)}\n`;
    csv += `# AI Items: ${estimate.ai_items_count}\n`;
    csv += `# Human Edits: ${estimate.human_edits_count}\n`;
    csv += `# Human Additions: ${estimate.human_additions_count}\n`;
    csv += '#\n';

    // Column headers - KEY: Side-by-side AI vs Human
    csv += 'Page,Line,Source,Was Edited,';
    csv += 'AI Description,Human Description,';
    csv += 'AI Quantity,Human Quantity,Quantity Delta,';
    csv += 'AI Unit Price,Human Unit Price,Price Delta,';
    csv += 'AI Total,Human Total,Total Delta,';
    csv += 'Unit,Timestamp,Project ID\n';

    // Data rows
    for (const item of lineItems) {
      // CRITICAL FIX: Properly handle AI (original) vs Human (current) values

      // For EDITED items: use original_* for AI, current for Human
      // For NON-EDITED items: use current for both (they're the same)
      const aiDescription = item.was_edited ? (item.original_description || '') : item.description;
      const humanDescription = item.description;

      const aiQuantity = item.was_edited ? item.original_quantity : item.quantity;
      const humanQuantity = item.quantity;

      const aiUnitPrice = item.was_edited ? item.original_unit_price : item.unit_price;
      const humanUnitPrice = item.unit_price;

      const aiTotal = item.was_edited ? item.original_total_price : item.total_price;
      const humanTotal = item.total_price;

      // Calculate deltas (handle NULL properly)
      const qtyDelta = calculateDelta(aiQuantity, humanQuantity);
      const priceDelta = calculateDelta(aiUnitPrice, humanUnitPrice);
      const totalDelta = calculateDelta(aiTotal, humanTotal);

      csv += [
        item.page_number,
        item.line_number,
        item.source,
        item.was_edited ? 'Yes' : 'No',

        // AI vs Human Description
        `"${aiDescription}"`,
        `"${humanDescription}"`,

        // AI vs Human Quantity
        formatValue(aiQuantity),
        formatValue(humanQuantity),
        qtyDelta,

        // AI vs Human Unit Price
        formatValue(aiUnitPrice),
        formatValue(humanUnitPrice),
        priceDelta,

        // AI vs Human Total
        formatValue(aiTotal),
        formatValue(humanTotal),
        totalDelta,

        // Other fields
        item.unit || '',
        new Date(item.extraction_timestamp).toISOString(),
        estimate.project_id
      ].join(',') + '\n';
    }

    // Summary footer
    csv += '\n# Summary\n';
    csv += `# Total Items,${lineItems.length}\n`;
    csv += `# AI Items,${estimate.ai_items_count}\n`;
    csv += `# Human Edits,${estimate.human_edits_count}\n`;
    csv += `# Human Additions,${estimate.human_additions_count}\n`;
    csv += `# Subtotal,$${Number(estimate.subtotal).toFixed(2)}\n`;
    csv += `# Tax,$${Number(estimate.tax_amount).toFixed(2)}\n`;
    csv += `# Total,$${Number(estimate.total).toFixed(2)}\n`;

    // Send as download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="estimate_${estimate.id}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ error: 'Export failed', details: error.message });
  }
});

/**
 * Helper: Calculate delta between two values
 * Handles NULL properly (NULL means "not provided by AI")
 */
function calculateDelta(aiValue, humanValue) {
  // Both NULL or both same = no delta
  if (aiValue === null && humanValue === null) return '0';
  if (aiValue === humanValue) return '0';

  // AI was NULL, Human provided value = full human value is delta
  if (aiValue === null && humanValue !== null) {
    return Number(humanValue).toFixed(2);
  }

  // AI had value, Human changed it = difference
  if (aiValue !== null && humanValue !== null) {
    return (Number(humanValue) - Number(aiValue)).toFixed(2);
  }

  // AI had value, Human removed it (rare) = negative of AI value
  if (aiValue !== null && humanValue === null) {
    return (-Number(aiValue)).toFixed(2);
  }

  return '0';
}

/**
 * Helper: Format value for CSV (empty string for NULL)
 */
function formatValue(value) {
  return value !== null && value !== undefined ? value : '';
}

export default router;