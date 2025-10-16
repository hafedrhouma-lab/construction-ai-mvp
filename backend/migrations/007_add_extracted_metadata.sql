-- Migration 007: Add extracted_metadata for rich AI extraction
-- Run: psql -d quickbids_dev -f migrations/007_add_extracted_metadata.sql

-- Add metadata column
ALTER TABLE extractions
  ADD COLUMN IF NOT EXISTS extracted_metadata JSONB;

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_extractions_metadata ON extractions USING GIN (extracted_metadata);

-- Add comment
COMMENT ON COLUMN extractions.extracted_metadata IS 'Rich AI extraction data: page_type, trades, notes, etc.';

-- Display results
SELECT
  'Migration 007 completed!' as status,
  COUNT(*) as total_extractions,
  COUNT(extracted_metadata) as with_metadata
FROM extractions;

-- Show sample
SELECT id, page_number, status,
       CASE WHEN extracted_metadata IS NOT NULL THEN 'Has metadata' ELSE 'NULL' END as metadata_status
FROM extractions
ORDER BY created_at DESC
LIMIT 5;