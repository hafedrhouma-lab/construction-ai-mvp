// routes/exports.js
// FIXED: Proper AI vs Human value handling
// AI values ONLY from original_* fields (can be NULL)
// Human values ALWAYS from current fields

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * GET /api/v1/estimates/:id/export?format=csv|json
 * Export estimate in client-specified format
 */
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'csv';

    console.log(`📥 Export request: estimate=${id}, format=${format}`);

    // ============================================
    // GET ALL DATA IN ONE QUERY
    // ============================================
    const result = await pool.query(
      `SELECT 
        -- Project info
        p.id as project_id,
        p.name as project_name,
        
        -- File info
        f.id as file_id,
        f.original_filename,
        f.topics,
        
        -- User info
        u.email as user_email,
        u.first_name,
        u.last_name,
        
        -- Estimate info
        e.total,
        e.ai_items_count,
        e.human_edits_count,
        e.human_additions_count,
        e.total_pages,
        e.pages_reviewed,
        
        -- Line item info
        li.id as line_item_id,
        li.line_number,
        li.description,
        li.quantity,
        li.unit,
        li.unit_price,
        li.total_price,
        li.original_quantity,
        li.original_unit,
        li.original_unit_price,
        li.original_total_price,
        li.source,
        li.was_edited,
        li.edited_at,
        li.created_at as line_created_at,
        li.confidence_score,
        
        -- Extraction info
        ex.page_number,
        ex.completed_at as extraction_timestamp,
        ex.model_version
        
       FROM estimates e
       JOIN projects p ON e.project_id = p.id
       JOIN files f ON e.file_id = f.id
       JOIN users u ON p.user_id = u.id
       JOIN extractions ex ON ex.file_id = f.id
       JOIN line_items li ON li.extraction_id = ex.id
       WHERE e.id = $1 AND li.deleted_at IS NULL
       ORDER BY ex.page_number, li.line_number`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found or has no line items' });
    }

    const firstRow = result.rows[0];

    // ============================================
    // PREPARE EXPORT DATA
    // ============================================
    const exportData = result.rows.map(row => {
      // FIXED: AI values ONLY from original_* fields
      // If original_* is NULL, AI value is NULL (not extracted by AI)
      const aiQty = row.original_quantity;  // Can be NULL
      const aiUnit = row.original_unit;      // Can be NULL
      const aiUnitPrice = row.original_unit_price;  // Can be NULL

      // Human values (current values - always present if row exists)
      const humanQty = row.quantity;
      const humanUnit = row.unit;
      const humanUnitPrice = row.unit_price;

      // Calculate deltas
      const deltaQty = calculateDelta(aiQty, humanQty);
      const deltaPrice = calculateDelta(aiUnitPrice, humanUnitPrice);

      // Topics: Join array if multiple
      const topics = row.topics && row.topics.length > 0
        ? row.topics.join(', ')
        : 'general';

      // User ID: Use name if available, otherwise email prefix
      const userId = row.first_name && row.last_name
        ? `${row.first_name}_${row.last_name}`.replace(/\s+/g, '_')
        : row.user_email.split('@')[0];

      // Project ID: Use first 8 chars of UUID for readability
      const projectId = row.project_id.substring(0, 8);

      // Document ID: Use first 8 chars of file UUID
      const documentId = row.file_id.substring(0, 8);

      // Reviewed timestamp: Use edited_at if edited, otherwise created_at
      const reviewedAt = row.edited_at || row.line_created_at;

      return {
        project_id: projectId,
        document_id: documentId,
        page: row.page_number,
        topic: topics,
        item_label: row.description || '',
        ai_qty: formatNumber(aiQty),
        ai_unit: aiUnit || '',
        ai_unit_price: formatNumber(aiUnitPrice),
        human_qty: formatNumber(humanQty),
        human_unit: humanUnit || '',
        human_unit_price: formatNumber(humanUnitPrice),
        delta_qty: deltaQty,
        delta_price: deltaPrice,
        user_id: userId,
        reviewed_at: reviewedAt,
        // Metadata (bonus)
        source: row.source,
        was_edited: row.was_edited,
        confidence_score: row.confidence_score,
        model_version: row.model_version
      };
    });

    // ============================================
    // GENERATE OUTPUT
    // ============================================
    if (format === 'json') {
      // JSON Export
      const jsonExport = {
        metadata: {
          export_date: new Date().toISOString(),
          project_id: firstRow.project_id.substring(0, 8),
          project_name: firstRow.project_name,
          document_id: firstRow.file_id.substring(0, 8),
          document_name: firstRow.original_filename,
          topics: firstRow.topics || [],
          total_items: exportData.length,
          estimate_total: Number(firstRow.total).toFixed(2),
          ai_items_count: firstRow.ai_items_count,
          human_edits_count: firstRow.human_edits_count,
          human_additions_count: firstRow.human_additions_count
        },
        data: exportData
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition',
        `attachment; filename="quickbids_${firstRow.project_id.substring(0, 8)}_${firstRow.file_id.substring(0, 8)}.json"`);
      return res.json(jsonExport);
    }

    // ============================================
    // CSV Export (Default)
    // ============================================
    let csv = '';

    // Header section
    csv += '# QuickBids AI Extraction Export\n';
    csv += `# Project: ${firstRow.project_id.substring(0, 8)} - ${firstRow.project_name}\n`;
    csv += `# Document: ${firstRow.original_filename}\n`;
    csv += `# Topics: ${firstRow.topics ? firstRow.topics.join(', ') : 'general'}\n`;
    csv += `# Generated: ${new Date().toISOString()}\n`;
    csv += `# Total Items: ${exportData.length}\n`;
    csv += `# Estimate Total: $${Number(firstRow.total).toFixed(2)}\n`;
    csv += `# AI Items: ${firstRow.ai_items_count} | Human Edits: ${firstRow.human_edits_count} | Human Additions: ${firstRow.human_additions_count}\n`;
    csv += '#\n';

    // Column headers - CLIENT SPECIFICATION
    csv += 'project_id,document_id,page,topic,item_label,';
    csv += 'ai_qty,ai_unit,ai_unit_price,';
    csv += 'human_qty,human_unit,human_unit_price,';
    csv += 'delta_qty,delta_price,';
    csv += 'user_id,reviewed_at,';
    csv += 'source,was_edited,confidence_score,model_version\n';

    // Data rows
    for (const row of exportData) {
      csv += [
        row.project_id,
        row.document_id,
        row.page,
        escapeCsvValue(row.topic),
        escapeCsvValue(row.item_label),
        row.ai_qty,
        row.ai_unit,
        row.ai_unit_price,
        row.human_qty,
        row.human_unit,
        row.human_unit_price,
        row.delta_qty,
        row.delta_price,
        row.user_id,
        new Date(row.reviewed_at).toISOString(),
        row.source,
        row.was_edited ? 'true' : 'false',
        row.confidence_score || '',
        row.model_version || ''
      ].join(',') + '\n';
    }

    // Summary footer
    csv += '\n# Summary Statistics\n';
    csv += `# Total Line Items,${exportData.length}\n`;
    csv += `# AI-Only Items,${exportData.filter(r => !r.was_edited && r.source === 'ai').length}\n`;
    csv += `# Human Edited Items,${exportData.filter(r => r.was_edited).length}\n`;
    csv += `# Human Added Items,${exportData.filter(r => r.source === 'human').length}\n`;
    csv += `# Pages Reviewed,${firstRow.pages_reviewed} / ${firstRow.total_pages}\n`;

    // Send CSV
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition',
      `attachment; filename="quickbids_${firstRow.project_id.substring(0, 8)}_${firstRow.file_id.substring(0, 8)}.csv"`);
    res.send(csv);

    console.log(`✅ Export completed: ${exportData.length} items`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    res.status(500).json({
      error: 'Export failed',
      details: error.message
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateDelta(aiValue, humanValue) {
  // Both NULL = no delta
  if ((aiValue === null || aiValue === undefined) &&
      (humanValue === null || humanValue === undefined)) {
    return '0.00';
  }

  // AI was NULL, human provided value = delta is the human value
  if ((aiValue === null || aiValue === undefined) &&
      humanValue !== null && humanValue !== undefined) {
    return Number(humanValue).toFixed(2);
  }

  // AI had value, human changed it = difference
  if (aiValue !== null && aiValue !== undefined &&
      humanValue !== null && humanValue !== undefined) {
    return (Number(humanValue) - Number(aiValue)).toFixed(2);
  }

  // AI had value, human removed it (rare)
  if (aiValue !== null && aiValue !== undefined &&
      (humanValue === null || humanValue === undefined)) {
    return (-Number(aiValue)).toFixed(2);
  }

  return '0.00';
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '';  // NULL stays empty in CSV
  }
  return Number(value).toString();
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export default router;