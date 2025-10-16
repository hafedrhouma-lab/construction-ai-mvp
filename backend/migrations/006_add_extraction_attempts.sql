-- Migration 006: Add extraction attempts limit tracking
-- Run: psql -d quickbids_dev < migrations/006_add_extraction_attempts.sql

-- Add extraction_attempts column to track re-extracts
ALTER TABLE extractions
  ADD COLUMN IF NOT EXISTS extraction_attempts INTEGER DEFAULT 1;

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_extractions_attempts ON extractions(extraction_attempts);

-- Add comment
COMMENT ON COLUMN extractions.extraction_attempts IS 'Number of times this page has been extracted (limit: 2)';

-- Backfill existing extractions
UPDATE extractions
SET extraction_attempts = 1
WHERE extraction_attempts IS NULL;

-- Display results
SELECT
  'Migration 006 completed!' as status,
  COUNT(*) as total_extractions,
  COUNT(extraction_attempts) as with_attempts
FROM extractions;

-- Show sample
SELECT file_id, page_number, status, extraction_attempts, created_at
FROM extractions
ORDER BY created_at DESC
LIMIT 5;