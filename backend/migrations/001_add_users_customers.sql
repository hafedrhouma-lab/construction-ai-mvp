-- Migration: Add Users and Customers Tables
-- Run this AFTER schema.sql or on existing database

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
-- UPDATE EXISTING TABLES
-- ============================================

-- Add user_id to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Add user_id to files
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add user_id to extraction_sessions
ALTER TABLE extraction_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add user_id to estimates
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Update company_cost_rates to link to users properly
ALTER TABLE company_cost_rates
  DROP COLUMN IF EXISTS user_id,
  ADD COLUMN user_id UUID REFERENCES users(id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert test user
INSERT INTO users (id, email, first_name, last_name, company_name, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo@quickbids.com', 'Demo', 'User', 'QuickBids Demo', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert test customers
INSERT INTO customers (id, user_id, name, email, company, city, state)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'City of Atlanta', 'contact@atlanta.gov', 'City Government', 'Atlanta', 'GA'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'ABC Construction', 'info@abcconstruction.com', 'ABC Construction Co', 'Miami', 'FL')
ON CONFLICT DO NOTHING;

-- Update existing projects with user_id and customer_id
UPDATE projects
SET
  user_id = '00000000-0000-0000-0000-000000000001',
  customer_id = '00000000-0000-0000-0000-000000000011'
WHERE user_id IS NULL;

-- ============================================
-- DISPLAY RESULTS
-- ============================================
SELECT 'Users and Customers tables created successfully!' as status;

-- Show table counts
SELECT
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM customers) as customers_count,
  (SELECT COUNT(*) FROM projects) as projects_count;
