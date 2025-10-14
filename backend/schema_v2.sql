-- QuickBids Database Schema v2.1
-- Complete schema with Users, Customers, and Projects

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- For future auth
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'user', -- 'admin', 'user', 'viewer'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  metadata JSONB DEFAULT '{}',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'archived'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  customer_name VARCHAR(255), -- Denormalized for quick access
  customer_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ============================================
-- FILES TABLE
-- ============================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  s3_key VARCHAR(500) NOT NULL,
  s3_bucket VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'pdf', 'video'
  mime_type VARCHAR(100),
  file_size BIGINT,
  page_count INTEGER,
  duration_ms INTEGER, -- For videos
  metadata JSONB DEFAULT '{}', -- Stores pages/segments info
  status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processing, ready, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_deleted_at ON files(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- EXTRACTION SESSIONS TABLE
-- ============================================
CREATE TABLE extraction_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'analyzing', -- analyzing, in_progress, completed, cancelled, failed
  current_step VARCHAR(50) DEFAULT 'analyzing', -- analyzing, pages_review, scope_review, estimate_generation
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER,
  analyzed_pages INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  trade VARCHAR(100), -- 'striping', 'concrete', etc.
  raw_ai_response JSONB DEFAULT '{}',
  parsed_data JSONB DEFAULT '{}',
  processing_time_ms INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON extraction_sessions(user_id);
CREATE INDEX idx_sessions_file_id ON extraction_sessions(file_id);
CREATE INDEX idx_sessions_project_id ON extraction_sessions(project_id);
CREATE INDEX idx_sessions_status ON extraction_sessions(status);

-- ============================================
-- SCOPE ITEMS TABLE
-- ============================================
CREATE TABLE scope_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(100),
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2),
  unit VARCHAR(50), -- LF, SF, EA, CY, etc.
  unit_cost DECIMAL(10, 2), -- Price per unit
  total_cost DECIMAL(10, 2), -- Total cost for this item
  specifications TEXT,
  page_numbers INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  primary_page_number INTEGER,
  confidence_score DECIMAL(3, 2),
  extraction_method VARCHAR(50) DEFAULT 'ai_vision',
  user_confirmed BOOLEAN DEFAULT false,
  user_modified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scope_items_session_id ON scope_items(session_id);
CREATE INDEX idx_scope_items_project_id ON scope_items(project_id);
CREATE INDEX idx_scope_items_category ON scope_items(category);
CREATE INDEX idx_scope_items_page_number ON scope_items(primary_page_number);

-- ============================================
-- SCOPE ITEM CORRECTIONS TABLE (Dataset Training)
-- ============================================
CREATE TABLE scope_item_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope_item_id UUID NOT NULL REFERENCES scope_items(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL, -- 'quantity', 'unit', 'item_name', 'unit_cost', etc.
  ai_value TEXT, -- Original AI output
  user_value TEXT, -- Human correction
  was_accepted BOOLEAN DEFAULT false, -- true = user confirmed, false = user corrected
  page_number INTEGER,
  correction_type VARCHAR(50), -- 'edit', 'delete', 'add', 'confirm'
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_corrections_scope_item_id ON scope_item_corrections(scope_item_id);
CREATE INDEX idx_corrections_session_id ON scope_item_corrections(session_id);
CREATE INDEX idx_corrections_project_id ON scope_item_corrections(project_id);
CREATE INDEX idx_corrections_timestamp ON scope_item_corrections(timestamp DESC);

-- ============================================
-- ESTIMATES TABLE
-- ============================================
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_number VARCHAR(50),
  total_cost DECIMAL(12, 2),
  materials_cost DECIMAL(12, 2),
  labor_cost DECIMAL(12, 2),
  overhead_cost DECIMAL(12, 2),
  profit_margin DECIMAL(5, 2),
  labor_hours DECIMAL(10, 2),
  crew_size INTEGER,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, accepted, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_estimates_session_id ON estimates(session_id);
CREATE INDEX idx_estimates_project_id ON estimates(project_id);
CREATE INDEX idx_estimates_status ON estimates(status);

-- ============================================
-- COMPANY COST RATES TABLE (User Pricing)
-- ============================================
CREATE TABLE company_cost_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rate_type VARCHAR(50) NOT NULL, -- 'labor', 'material', 'equipment'
  item_name VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  cost_per_unit DECIMAL(10, 2),
  vendor VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_rates_user_id ON company_cost_rates(user_id);
CREATE INDEX idx_cost_rates_type ON company_cost_rates(rate_type);
CREATE INDEX idx_cost_rates_item ON company_cost_rates(item_name);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON extraction_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scope_items_updated_at BEFORE UPDATE ON scope_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_rates_updated_at BEFORE UPDATE ON company_cost_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Insert test user
INSERT INTO users (id, email, first_name, last_name, company_name, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'demo@quickbids.com', 'Demo', 'User', 'QuickBids Demo', 'admin');

-- Insert test customers
INSERT INTO customers (id, user_id, name, email, company, city, state)
VALUES 
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'City of Atlanta', 'contact@atlanta.gov', 'City Government', 'Atlanta', 'GA'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'ABC Construction', 'info@abcconstruction.com', 'ABC Construction Co', 'Miami', 'FL');

-- Insert test project
INSERT INTO projects (id, user_id, customer_id, name, description, customer_name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000011',
   'Atlanta Striping Project', 
   'Parking lot striping and marking', 
   'City of Atlanta');

-- Insert sample cost rates for demo user
INSERT INTO company_cost_rates (user_id, rate_type, item_name, unit, cost_per_unit, vendor)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'labor', 'Crew Lead', 'hour', 25.00, 'Internal'),
  ('00000000-0000-0000-0000-000000000001', 'labor', 'Worker', 'hour', 18.00, 'Internal'),
  ('00000000-0000-0000-0000-000000000001', 'material', 'Thermoplastic Paint (white)', 'gallon', 45.00, 'Traffic Supply Co'),
  ('00000000-0000-0000-0000-000000000001', 'material', 'Thermoplastic Paint (yellow)', 'gallon', 47.00, 'Traffic Supply Co'),
  ('00000000-0000-0000-0000-000000000001', 'equipment', 'Striping Machine', 'day', 150.00, 'Equipment Rental');

-- Commit
COMMIT;

-- Display success message
SELECT 'QuickBids database schema v2.1 created successfully!' as status;

-- Show table structure
SELECT 
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'cost_rates', COUNT(*) FROM company_cost_rates;
