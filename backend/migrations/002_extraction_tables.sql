-- Migration: Add AI Extraction Tables (UUID Compatible)
-- Run this in your PostgreSQL database

-- First, let's check what we have
DO $$
BEGIN
  -- Drop tables if they exist (clean slate)
  DROP TABLE IF EXISTS line_items CASCADE;
  DROP TABLE IF EXISTS extractions CASCADE;
  DROP TABLE IF EXISTS estimates CASCADE;
END $$;


-- 1. EXTRACTIONS TABLE
-- Stores AI extraction results per page
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,

  -- AI Provider info
  ai_provider VARCHAR(50) DEFAULT 'openai',
  model_version VARCHAR(100),

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending',
  -- pending → processing → completed → failed

  -- Raw data
  raw_response JSONB,
  extracted_items JSONB,

  -- Metadata
  confidence_score DECIMAL(5,2),
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  UNIQUE(file_id, page_number)
);

CREATE INDEX idx_extractions_file_id ON extractions(file_id);
CREATE INDEX idx_extractions_status ON extractions(status);


-- 2. LINE ITEMS TABLE
-- Individual line items extracted from pages
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,

  -- Line item data (current values)
  line_number INTEGER,
  description TEXT,
  quantity DECIMAL(15,2),
  unit VARCHAR(50),
  unit_price DECIMAL(15,2),
  total_price DECIMAL(15,2),

  -- Original AI values (for comparison)
  original_description TEXT,
  original_quantity DECIMAL(15,2),
  original_unit VARCHAR(50),
  original_unit_price DECIMAL(15,2),
  original_total_price DECIMAL(15,2),

  -- Tracking
  source VARCHAR(20) DEFAULT 'ai', -- 'ai' or 'human'
  was_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete

  -- Metadata
  confidence_score DECIMAL(5,2),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_line_items_extraction_id ON line_items(extraction_id);
CREATE INDEX idx_line_items_deleted_at ON line_items(deleted_at);


-- 3. ESTIMATES TABLE (Drop and recreate)
-- Generated estimates (THE GOLDEN FLAG)
DROP TABLE IF EXISTS estimates CASCADE;

CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Amounts
  subtotal DECIMAL(15,2),
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2),

  -- Metrics (for analytics)
  total_pages INTEGER,
  pages_reviewed INTEGER,
  completion_percentage DECIMAL(5,2),

  ai_items_count INTEGER DEFAULT 0,
  human_edits_count INTEGER DEFAULT 0,
  human_additions_count INTEGER DEFAULT 0,
  human_deletions_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  -- draft → final → approved

  -- Timestamps (THE GOLDEN FLAGS)
  generated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  downloaded_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_estimates_file_id ON estimates(file_id);
CREATE INDEX idx_estimates_generated_at ON estimates(generated_at);


-- 4. UPDATE FILES TABLE
-- Add extraction tracking columns (only if they don't exist)
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extraction_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS extraction_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS estimate_generated_at TIMESTAMP; -- GOLDEN FLAG

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_files_extraction_status') THEN
    CREATE INDEX idx_files_extraction_status ON files(extraction_status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_files_estimate_generated_at') THEN
    CREATE INDEX idx_files_estimate_generated_at ON files(estimate_generated_at);
  END IF;
END $$;


-- Success message
SELECT
  'Migration completed successfully!' as message,
  'Tables created: extractions, line_items, estimates (UUID)' as tables,
  'Files table updated with extraction tracking' as update;