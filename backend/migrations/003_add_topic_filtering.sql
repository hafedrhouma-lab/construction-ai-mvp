-- Migration 003: Add Topic Filtering
-- Run: psql -d quickbids_dev < 003_add_topic_filtering.sql

-- Add topic selection and relevant pages tracking
ALTER TABLE files 
  ADD COLUMN IF NOT EXISTS topics VARCHAR(100)[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS relevant_pages INTEGER[] DEFAULT '{}';

-- Add index for topic queries
CREATE INDEX IF NOT EXISTS idx_files_topic ON files(topic);

-- Add comment for documentation
COMMENT ON COLUMN files.topic IS 'Topic/trade selected during upload (e.g., striping, crosswalks)';
COMMENT ON COLUMN files.relevant_pages IS 'Array of page numbers that are relevant to the selected topic';

-- Example data after processing:
-- topic = 'striping'
-- relevant_pages = [1, 5, 12, 18, 23, 45]