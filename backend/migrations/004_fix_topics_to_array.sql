-- Migration 004: Fix Topics - Change from Single to Array
-- Run: psql -d quickbids_dev < migrations/004_fix_topics_to_array.sql

-- Remove old single topic column if exists
ALTER TABLE files DROP COLUMN IF EXISTS topic;

-- Add topics as array (if not already exists from previous migration)
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS topics VARCHAR(100)[] DEFAULT '{}';

-- Remove old index
DROP INDEX IF EXISTS idx_files_topic;

-- Add GIN index for array queries (much faster for array contains)
CREATE INDEX IF NOT EXISTS idx_files_topics ON files USING GIN(topics);

-- Update comments
COMMENT ON COLUMN files.topics IS 'Array of topics/trades selected during upload (e.g., [striping, crosswalks])';
COMMENT ON COLUMN files.relevant_pages IS 'Array of page numbers relevant to selected topics';

-- Example data after processing:
-- topics = ['striping', 'crosswalks']
-- relevant_pages = [1, 5, 12, 18, 23, 45]